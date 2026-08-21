import "server-only";
import { formulieren } from "@/lib/modell";
import { neuversuchHinweis, pruefen } from "@/lib/pruefungen/pruefen";
import { faktenExtrahieren } from "@/lib/lernen/fakten";
import { indexieren } from "@/lib/wissen/abschnitte";
import type { Befund } from "@/lib/pruefungen/typen";
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
 * Der Verarbeitungsweg einer Mail (`PLAN.md` §3), Schritte 1 bis 4.
 *
 * Die Schritte 5 bis 7 (Übersetzung) folgen in Phase 7.
 */

/** Was die Oberfläche während des Formulierens angezeigt bekommt. */
export type Fortschritt =
  | { art: "schritt"; text: string }
  /**
   * Wer der Kunde ist. Die Kennung geht mit, weil die Übersetzung sie
   * braucht — Sprache und Land stehen in der Akte, und ohne Kennung fiele
   * beides aus (`CLAUDE.md` §5.2).
   */
  | {
      art: "kunde";
      id: string | null;
      name: string | null;
      sprache: "de" | "en";
    }
  | { art: "skill"; name: string; bezeichnung: string }
  | { art: "text"; text: string }
  /**
   * Der bisher gezeigte Entwurf wird verworfen und neu geschrieben
   * (`MODELL.md` §4). Die Oberfläche muss den Text leeren — sonst hängt der
   * zweite Entwurf am ersten.
   */
  | { art: "neuversuch" }
  | {
      art: "fertig";
      mailId: string;
      knapp: string;
      ausfuehrlich: string;
      /**
       * Was die maschinellen Prüfungen gefunden haben (`MODELL.md` §4).
       * Leer ist der Normalfall.
       */
      befunde: Befund[];
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

    yield { art: "kunde", id: kundeId, name: kundenname, sprache };

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
      nutzerId,
      skill: wahl.fachSkill,
      suchtext: [eingehenderText, stichworte].filter(Boolean).join("\n"),
      archivEinbeziehen: angaben.archivEinbeziehen,
    });

    /* --- 4. Formulieren und prüfen ------------------------------------ */
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

    /* Woraus eine Zahl oder ein Datum im Entwurf stammen darf (`MODELL.md`
       §4). Frühere Mails stehen bewusst nicht darin — Begründung in
       `lib/pruefungen/pruefen.ts`. */
    const quellen = [
      stichworte,
      eingehenderText ?? "",
      ...kontext.fakten,
      ...kontext.bausteine,
    ].filter((q) => q.trim());

    let gesamt = "";
    let befunde: Befund[] = [];

    /* Höchstens zwei Durchläufe: der erste, und **genau ein** Neuversuch,
       wenn eine Regel verletzt oder die Mail unvollständig ist. Ein dritter
       kostet noch einmal Geld und Wartezeit — und wenn das Modell zweimal
       dieselbe Anweisung überliest, hilft ein drittes Mal auch nicht.
       Was dann noch offen ist, sieht sie als Warnung. */
    for (let versuch = 0; versuch < 2; versuch++) {
      const hinweis = versuch === 0 ? null : neuversuchHinweis(befunde);

      if (versuch === 0) {
        yield { art: "schritt", text: "Ich formuliere." };
      } else {
        /* Sie hat den ersten Entwurf schon einlaufen sehen. Er wird jetzt
           verworfen — das muss sichtbar sein, sonst hängt plötzlich ein
           zweiter Text am ersten. */
        yield { art: "neuversuch" };
        yield {
          art: "schritt",
          text: "Da war noch etwas drin, das du nicht wolltest. Ich schreibe es neu.",
        };
      }

      /* Erst sichern, dann leeren — der verworfene Entwurf wird unten als
         Modellantwort mitgeschickt, damit das Modell weiß, was es besser
         machen soll. */
      const vorigerEntwurf = gesamt;
      gesamt = "";

      for await (const stueck of formulieren({
        zweck: "formulieren",
        nutzerId,
        /* Beim Neuversuch wird der verworfene Entwurf als Modellantwort
           mitgegeben und der Hinweis als Antwort darauf. Zwei
           Nutzer-Nachrichten hintereinander wären zwar kürzer, aber nicht
           jeder Anbieter nimmt die an — und ein abgelehnter Aufruf wäre hier
           besonders ärgerlich, weil die Mail schon einmal geschrieben war. */
        nachrichten: hinweis
          ? [
              ...nachrichten,
              { rolle: "modell" as const, inhalt: vorigerEntwurf },
              { rolle: "nutzer" as const, inhalt: hinweis },
            ]
          : nachrichten,
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

      befunde = pruefen({ entwurf: gesamt, quellen, regeln: kontext.regeln });

      /* Nichts, was ein Neuversuch beheben könnte — erfundene Angaben werden
         ausdrücklich **nicht** still neu geschrieben, sie werden ihr gezeigt. */
      if (!neuversuchHinweis(befunde)) break;
    }

    /* --- 5. Aufteilen und sichern ------------------------------------- */
    const { knapp, ausfuehrlich } = fassungenTrennen(gesamt);

    const mailId = await mailSichern({
      nutzerId,
      kundeId,
      eingehenderText,
      stichworte,
      textDe: knapp,
      skill: wahl.fachSkill.name,
    });

    yield { art: "fertig", mailId, knapp, ausfuehrlich, befunde };

    /* --- 6. Nebenbei lernen ------------------------------------------- */
    /* **Nach** dem `fertig`: Sie soll ihre Mail sehen, sobald sie dasteht.
       Die Faktenextraktion ist ein günstiger Aufruf, aber sie kostet
       Sekunden, und keine davon darf zwischen ihr und dem Ergebnis liegen.
       Ein Fehlschlag bleibt für sie unsichtbar — der Fakt fällt bei der
       nächsten Mail an denselben Kunden wieder auf. */
    if (kundeId) {
      await faktenExtrahieren({
        nutzerId,
        kundeId,
        eingehenderText,
        antwort: knapp,
        mailId,
        abbruch: angaben.abbruch,
      }).catch(() => 0);
    }

    /* Die Mail wird durchsuchbar — Wissen wächst von allein (`PLAN.md` §6,
       Phase 10). Auch das erst hier: Einbetten kostet einen Aufruf, und
       kein Aufruf darf zwischen ihr und ihrer fertigen Mail stehen. */
    if (mailId) {
      await indexieren({
        nutzerId,
        quelleArt: "mail",
        quelleId: mailId,
        text: knapp,
        kundeId,
        namen: {
          kunde: kontext.kunde?.anzeigename,
          firma: kontext.kunde?.firma,
          ansprechpartner: kontext.kunde?.ansprechpartner,
        },
        abbruch: angaben.abbruch,
      }).catch(() => 0);
    }
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
