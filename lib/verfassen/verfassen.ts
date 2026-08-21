import "server-only";
import { formulieren, uebrigePlatzhalter } from "@/lib/modell";
import { skillWaehlen } from "@/lib/skills/auswahl";
import { serverZugang } from "@/lib/supabase/server";
import {
  anweisungBauen,
  fassungenTrennen,
  zwischenspeicherSchluessel,
} from "./anweisung";
import { kontextSammeln } from "./kontext";
import { kundeErkennen } from "./kundenerkennung";

/**
 * Der Verarbeitungsweg einer Mail (`PLAN.md` §3), Schritte 1 bis 3.
 *
 * Schritt 4 (maschinelle Prüfungen) folgt in Phase 6, Schritte 5 bis 7
 * (Übersetzung) in Phase 7.
 */

/** Was die Oberfläche während des Formulierens angezeigt bekommt. */
export type Fortschritt =
  | { art: "schritt"; text: string }
  | { art: "kunde"; name: string | null; sprache: "de" | "en" }
  | { art: "skill"; name: string; bezeichnung: string }
  | { art: "text"; text: string }
  | {
      art: "fertig";
      mailId: string;
      knapp: string;
      ausfuehrlich: string;
      warnungen: string[];
    }
  | { art: "fehler"; text: string };

export type VerfassenAngaben = {
  nutzerId: string;
  eingehenderText?: string;
  stichworte: string;
  /** Hat sie den Kunden selbst gewählt, gilt das ohne Erkennung. */
  kundeId?: string | null;
  /** Hat sie den Skill selbst gewählt, gilt das ohne Einordnung. */
  skillName?: string;
  archivEinbeziehen?: boolean;
  abbruch?: AbortSignal;
};

/**
 * Formuliert zwei Fassungen und gibt den Text heraus, während er entsteht.
 *
 * **Warum gestreamt:** Ihr Engpass ist Grübelzeit vor dem leeren Feld
 * (`CLAUDE.md` §1). Ohne Streaming stünde sie 25 Sekunden vor einer leeren
 * Fläche, und genau das Warten füttert die Grübelschleife. Mit Streaming liest
 * sie schon, während formuliert wird.
 *
 * **Warum die Fortschrittstexte:** `DESIGN.md` §5 verlangt eine Zeile, die
 * sagt, was gerade passiert — kein Ladekreis, keine Prozentzahl, die niemand
 * prüfen kann.
 */
export async function* verfassen(
  angaben: VerfassenAngaben,
): AsyncGenerator<Fortschritt, void, unknown> {
  const { nutzerId, eingehenderText, stichworte } = angaben;

  try {
    /* --- 1. Kunde erkennen ------------------------------------------- */
    let kundeId = angaben.kundeId ?? null;
    let kundenname: string | null = null;
    let sprache: "de" | "en" = "de";

    if (!kundeId && eingehenderText) {
      yield { art: "schritt", text: "Ich schaue, von wem die Mail ist." };

      const erkennung = await kundeErkennen(eingehenderText);
      if (erkennung.stand === "erkannt") {
        kundeId = erkennung.kunde.id;
        kundenname = erkennung.kunde.anzeigename;
        sprache = erkennung.kunde.sprache === "en" ? "en" : "de";
      }
      /* „mehrdeutig" und „unbekannt" führen hier bewusst zu nichts: Die App
         schreibt trotzdem, nur ohne Kundenwissen. Nachgefragt wird auf dem
         Bildschirm, nicht mitten im Formulieren (CLAUDE.md §9). */
    } else if (kundeId) {
      const kontextVorab = await kontextSammeln({
        kundeId,
        skill: (await skillWaehlen({ nutzerId, abbruch: angaben.abbruch }))
          .fachSkill,
        suchtext: "",
      });
      kundenname = kontextVorab.kunde?.anzeigename ?? null;
      sprache = kontextVorab.kunde?.sprache === "en" ? "en" : "de";
    }

    yield { art: "kunde", name: kundenname, sprache };

    /* --- 2. Skill wählen --------------------------------------------- */
    const wahl = await skillWaehlen({
      eingehenderText,
      stichworte,
      nutzerId,
      kundensprache: sprache,
      vonIhrGewaehlt: angaben.skillName,
      abbruch: angaben.abbruch,
    });

    const { bezeichnung } = await import("@/lib/skills/bezeichnungen");
    yield {
      art: "skill",
      name: wahl.fachSkill.name,
      bezeichnung: bezeichnung(wahl.fachSkill.name),
    };

    /* --- 3. Kontext sammeln (kein Modell) ----------------------------- */
    yield {
      art: "schritt",
      text: kundenname
        ? `Ich schaue nach, was wir ${kundenname} zuletzt geschrieben haben.`
        : "Ich schaue nach, was ich weiß.",
    };

    const kontext = await kontextSammeln({
      kundeId,
      skill: wahl.fachSkill,
      suchtext: [eingehenderText, stichworte].filter(Boolean).join("\n"),
      archivEinbeziehen: angaben.archivEinbeziehen,
    });

    /* --- 4. Formulieren ----------------------------------------------- */
    yield { art: "schritt", text: "Ich formuliere." };

    const nachrichten = anweisungBauen({
      skill: wahl.fachSkill,
      kontext,
      eingehenderText,
      stichworte,
    });

    /* Was der Server nicht im Klartext verlassen darf. Auch ihr eigener
       Name — sonst adressiert das Modell die Antwort an sie selbst
       (siehe nachweise/pseudonymisierung-vorher.md). */
    const namen = {
      kunde: kontext.kunde?.anzeigename,
      firma: kontext.kunde?.firma,
      ansprechpartner: kontext.kunde?.ansprechpartner,
      ichSelbst: await eigenerName(),
    };

    let gesamt = "";

    for await (const stueck of formulieren({
      zweck: "formulieren",
      nutzerId,
      nachrichten,
      namen,
      hoechstlaenge: 1600,
      abbruch: angaben.abbruch,
      /* Die Blöcke 1 bis 3 stehen vorn und ändern sich zwischen Aufrufen
         kaum — ab dem zweiten Aufruf mit demselben Skill kosten sie nur noch
         ein Zehntel (`MODELL.md` §7). Ohne diesen Schlüssel cacht Mistral
         nicht, und die Ersparnis fiele einfach aus. */
      zwischenspeicherSchluessel: zwischenspeicherSchluessel(
        wahl.fachSkill,
        nutzerId,
      ),
    })) {
      if (stueck.art === "text") {
        gesamt += stueck.text;
        yield { art: "text", text: stueck.text };
      }
    }

    /* --- 5. Aufteilen, prüfen, sichern -------------------------------- */
    const { knapp, ausfuehrlich } = fassungenTrennen(gesamt);

    const warnungen: string[] = [];

    /* Ein Platzhalter, der die Rückersetzung überlebt hat, stünde sonst in
       der Mail an den Kunden — der peinlichste mögliche Fehler dieser App. */
    const uebrig = uebrigePlatzhalter(gesamt);
    if (uebrig.length > 0) {
      warnungen.push(
        "In der Mail steht noch ein Platzhalter. Schau bitte drüber, bevor du sie abschickst.",
      );
    }

    const mailId = await mailSichern({
      nutzerId,
      kundeId,
      eingehenderText,
      stichworte,
      textDe: knapp,
      skill: wahl.fachSkill.name,
    });

    yield { art: "fertig", mailId, knapp, ausfuehrlich, warnungen };
  } catch (fehler) {
    const fuerSie =
      fehler instanceof Error && "fuerSie" in fehler
        ? String((fehler as { fuerSie: unknown }).fuerSie)
        : "Die Verbindung klemmt gerade. Dein Text ist gespeichert, probier es in einer Minute nochmal.";

    yield { art: "fehler", text: fuerSie };
  }
}

/** Ihr eigener Name, für die Pseudonymisierung. */
async function eigenerName(): Promise<string | undefined> {
  return process.env.IHR_NAME || undefined;
}

/**
 * Legt die Mail an — samt erster Fassung.
 *
 * **Ein Fehler beim Sichern darf die Mail nicht wegwerfen.** Sie hat den Text
 * auf dem Bildschirm; ob er auch in der Datenbank steht, ist in diesem Moment
 * zweitrangig. Deshalb wird der Fehler protokolliert und eine leere Kennung
 * zurückgegeben, statt alles scheitern zu lassen.
 */
async function mailSichern(angaben: {
  nutzerId: string;
  kundeId: string | null;
  eingehenderText?: string;
  stichworte: string;
  textDe: string;
  skill: string;
}): Promise<string> {
  try {
    const zugang = await serverZugang();

    const { data, error } = await zugang
      .from("emails")
      .insert({
        nutzer_id: angaben.nutzerId,
        kunde_id: angaben.kundeId,
        eingehender_text: angaben.eingehenderText ?? null,
        ihre_stichworte: angaben.stichworte,
        text_de: angaben.textDe,
        skill: angaben.skill,
        status: "entwurf",
      })
      .select("id")
      .single();

    if (error || !data) return "";

    /* Jede Fassung wird aufbewahrt — Grundlage für „eine Fassung zurück"
       und für die Regelableitung aus Textänderungen (`PLAN.md` §2). */
    await zugang.from("email_versions").insert({
      nutzer_id: angaben.nutzerId,
      mail_id: data.id,
      nummer: 1,
      text_de: angaben.textDe,
      ausloeser: "erste",
    });

    return data.id;
  } catch (fehler) {
    console.error("[verfassen] Mail konnte nicht gesichert werden:", fehler);
    return "";
  }
}
