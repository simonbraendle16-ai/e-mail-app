import "server-only";
import { formulieren } from "@/lib/modell";
import { serverZugang } from "@/lib/supabase/server";
import { kundeLaden } from "@/lib/db/kunden";
import { regelAnlegen, regelnAlle } from "@/lib/db/regeln";
import { rueckfallSkill } from "@/lib/skills/register";
import { pruefen } from "@/lib/pruefungen/pruefen";
import type { Befund } from "@/lib/pruefungen/typen";
import { kontextSammeln } from "./kontext";
import { regelAbleiten, type Regelvorschlag } from "@/lib/lernen/ableitung";

/**
 * Die Korrekturschleife (`PLAN.md` §4).
 *
 * **„Abgelehntes kommt nicht wieder" ist die zentrale Zusage der App.** Beide
 * Wege dorthin sind gebaut, und sie kann wählen:
 *
 *  - **Weg 1** — sie sagt, was stört („zu förmlich"), und bekommt sofort eine
 *    neue Fassung. Daneben zwei Haken: für diesen Kunden merken, oder immer.
 *    Ausdrücklich gesetzte Regeln sind **sofort aktiv** — kein Rateschritt.
 *  - **Weg 2** — sie überschreibt den Text selbst. Daraus wird eine Regel
 *    *abgeleitet* und **vorgeschlagen**, nie übernommen (`ableitung.ts`).
 */

export type Ueberarbeitungsschritt =
  | { art: "schritt"; text: string }
  | { art: "text"; text: string }
  | { art: "fertig"; text: string; befunde: Befund[] }
  | { art: "fehler"; text: string };

export type UeberarbeitenAngaben = {
  nutzerId: string;
  /** Die Fassung, die ihr nicht passt. */
  bisher: string;
  /** Was stört — ihre eigenen Worte. */
  anweisung: string;
  kundeId?: string | null;
  mailId?: string | null;
  /** Ihre Stichworte und die Kundenmail, für die Zahlenprüfung. */
  stichworte?: string;
  eingehenderText?: string;
  /** Haken: „Für diesen Kunden merken" bzw. „Immer so machen". */
  merken?: "kunde" | "immer" | null;
  abbruch?: AbortSignal;
};

export async function* ueberarbeiten(
  angaben: UeberarbeitenAngaben,
): AsyncGenerator<Ueberarbeitungsschritt> {
  const { nutzerId, bisher, anweisung, kundeId, mailId } = angaben;

  if (!anweisung.trim()) {
    yield { art: "fehler", text: "Sag mir kurz, was nicht passt." };
    return;
  }

  try {
    /* --- Merken, bevor formuliert wird -------------------------------- */
    /* Erst speichern, dann formulieren: Bricht der Modellaufruf ab, ist ihre
       Regel trotzdem gemerkt. Andersherum wäre der Haken verloren, und sie
       müsste ihn beim nächsten Mal erneut setzen — ohne zu wissen, dass er
       verschwunden ist. */
    if (angaben.merken) {
      await regelAnlegen({
        nutzerId,
        text: anweisung.trim(),
        kundeId: angaben.merken === "kunde" ? (kundeId ?? null) : null,
        art: "ton",
      }).catch(() => null);
    }

    yield { art: "schritt", text: "Ich schreibe es um." };

    const kunde = kundeId ? await kundeLadenSicher(kundeId) : null;

    /* Der Kontext wird neu geholt: Steht die eben gemerkte Regel schon drin,
       wirkt sie ab dieser Fassung — genau das erwartet sie, wenn sie den
       Haken setzt. */
    const kontext = await kontextSammeln({
      kundeId,
      /* Der Rückfall-Skill genügt: Beim Überarbeiten geht es um Ton, nicht
         um die Mailart — die steht mit der vorigen Fassung schon fest. */
      skill: rueckfallSkill(),
      suchtext: anweisung,
    }).catch(() => null);

    const namen = {
      kunde: kunde?.anzeigename,
      firma: kunde?.firma,
      ansprechpartner: kunde?.ansprechpartner,
    };

    let gesamt = "";

    for await (const stueck of formulieren({
      zweck: "formulieren",
      nutzerId,
      namen,
      hoechstlaenge: 1200,
      abbruch: angaben.abbruch,
      nachrichten: [
        {
          rolle: "system",
          inhalt: [
            "Du überarbeitest eine fertige deutsche Geschäftsmail.",
            "",
            "- Ändere genau das, was verlangt wird. Sonst nichts.",
            "- Erfinde keine Zahlen, keine Termine, keine Zusagen.",
            "- Lückenmarkierungen in eckigen Klammern bleiben unverändert stehen.",
            "- Keine Erklärungen, keine Anmerkungen. Nur die überarbeitete Mail.",
          ].join("\n"),
        },
        { rolle: "nutzer", inhalt: `Die Mail:\n---\n${bisher.trim()}\n---` },
        { rolle: "nutzer", inhalt: `Was geändert werden soll: ${anweisung.trim()}` },
      ],
    })) {
      if (stueck.art === "text") {
        gesamt += stueck.text;
        yield { art: "text", text: stueck.text };
      }
    }

    /* Dieselben Prüfungen wie beim ersten Entwurf. Eine überarbeitete Mail
       ist genauso eine Mail an einen Kunden — sie ungeprüft durchzulassen,
       weil sie „nur" überarbeitet wurde, wäre die Lücke im Netz. */
    const befunde = pruefen({
      entwurf: gesamt,
      quellen: [
        angaben.stichworte ?? "",
        angaben.eingehenderText ?? "",
        /* Die vorige Fassung deckt ihre eigenen Zahlen: Was schon dastand,
           ist keine neue Erfindung. */
        bisher,
        ...(kontext?.fakten ?? []),
        ...(kontext?.bausteine ?? []),
      ].filter((q) => q.trim()),
      regeln: kontext?.regeln ?? [],
    });

    await fassungSichern(mailId, gesamt, "anweisung", anweisung);

    yield { art: "fertig", text: gesamt, befunde };
  } catch (fehler) {
    const fuerSie =
      fehler instanceof Error && "fuerSie" in fehler
        ? String((fehler as { fuerSie: unknown }).fuerSie)
        : "Die Verbindung klemmt gerade. Deine Mail ist noch da, probier es in einer Minute nochmal.";

    yield { art: "fehler", text: fuerSie };
  }
}

/**
 * Weg 2: Sie hat den Text selbst überschrieben.
 *
 * Übernommen wird ihre Fassung **immer und sofort** — das ist ihr Text. Die
 * Regelableitung läuft daneben und endet bei einer Frage, nie bei einer
 * Tatsache.
 */
export async function bearbeitungUebernehmen(angaben: {
  nutzerId: string;
  vorher: string;
  nachher: string;
  kundeId?: string | null;
  mailId?: string | null;
  abbruch?: AbortSignal;
}): Promise<{ vorschlag: Regelvorschlag | null }> {
  await fassungSichern(
    angaben.mailId,
    angaben.nachher,
    "eigene_bearbeitung",
    null,
  );

  const bekannt = await regelnAlle();

  const vorschlag = await regelAbleiten({
    nutzerId: angaben.nutzerId,
    vorher: angaben.vorher,
    nachher: angaben.nachher,
    kundeId: angaben.kundeId,
    bekannt,
    abbruch: angaben.abbruch,
  });

  return { vorschlag };
}

/* ------------------------------------------------------------------------ */

async function kundeLadenSicher(id: string) {
  try {
    return await kundeLaden(id);
  } catch {
    return null;
  }
}

/**
 * Legt die neue Fassung ab. Jede Fassung wird aufbewahrt — das trägt „eine
 * Fassung zurück" und ist die Datengrundlage der Regelableitung.
 */
async function fassungSichern(
  mailId: string | null | undefined,
  text: string,
  ausloeser: "anweisung" | "eigene_bearbeitung",
  anweisung: string | null,
): Promise<void> {
  if (!mailId || !text.trim()) return;

  try {
    const zugang = await serverZugang();

    const { data: letzte } = await zugang
      .from("email_versions")
      .select("nummer")
      .eq("mail_id", mailId)
      .order("nummer", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: mail } = await zugang
      .from("emails")
      .select("nutzer_id")
      .eq("id", mailId)
      .single();

    if (!mail) return;

    await zugang.from("email_versions").insert({
      nutzer_id: mail.nutzer_id,
      mail_id: mailId,
      nummer: (letzte?.nummer ?? 0) + 1,
      text_de: text,
      ausloeser,
      anweisung,
    });

    /* Die Mail selbst trägt immer die jüngste Fassung. */
    await zugang.from("emails").update({ text_de: text }).eq("id", mailId);
  } catch {
    /* Der Text steht auf ihrem Bildschirm — das ist der Teil, der zählt. */
  }
}
