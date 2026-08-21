import "server-only";
import { einordnen } from "@/lib/modell";
import { dienstZugang } from "@/lib/supabase/server";
import { entschluesselnWennMoeglich } from "@/lib/verschluesselung";
import { uebrigePlatzhalter } from "@/lib/modell/pseudonymisierung";

/**
 * Die 100-Tage-Verdichtung (`CLAUDE.md` §4).
 *
 * **Der im Kreuzverhör aufgedeckte Widerspruch und seine Auflösung:**
 * „Rohtexte werden gelöscht" und „die App lernt aus früheren Mails" schließen
 * einander aus — die RAG-Abschnitte *sind* der Rohtext, nur zerteilt. Sie
 * mitzulöschen nimmt der App das Gedächtnis, sie zu behalten macht die
 * Löschung zur Kosmetik.
 *
 * Deshalb: Nach 100 Tagen wird jede Mail durch eine **Verdichtung** ersetzt —
 * Anliegen, Tonfall, verwendete Formulierungen, gelernte Fakten; ohne
 * Originalwortlaut, ohne Beträge, ohne Namen. Der Wortlaut bleibt in der
 * Zeile nachschlagbar, seine Abschnitte fallen aber aus der normalen Suche
 * heraus. **Ab dann geht der Wortlaut nicht mehr an Mistral** — und genau
 * dort saß das Risiko.
 *
 * Ohne diesen Lauf passiert nichts davon. Die Datenbankseite steht seit
 * Phase 2, der Auslöser fehlte bis zur Validierung nach Phase 13.
 */

/** Pro Lauf, damit ein Rückstand nicht auf einmal Geld kostet. */
const HOECHSTENS_JE_LAUF = 20;

export type Verdichtungsbericht = {
  gefunden: number;
  verdichtet: number;
  uebersprungen: { mailId: string; grund: string }[];
};

type FaelligeMail = {
  id: string;
  nutzer_id: string;
  kunde_id: string | null;
  eingehender_text: string | null;
  ihre_stichworte: string | null;
  text_de: string | null;
  skill: string | null;
};

/**
 * Läuft ohne angemeldete Nutzerin — deshalb der Dienstzugang.
 *
 * Das ist der einzige Ort außer dem Weckruf, an dem die Zugriffsregeln
 * umgangen werden, und er ist bewusst so gebaut, dass er keine Eingaben
 * entgegennimmt: Er sucht sich selbst, was fällig ist, und schreibt nur in
 * die gefundenen Zeilen zurück.
 */
export async function faelligeVerdichten(
  hoechstens = HOECHSTENS_JE_LAUF,
): Promise<Verdichtungsbericht> {
  const zugang = dienstZugang();

  const { data, error } = await zugang.rpc("faellige_verdichtungen", {
    hoechstens,
  });

  if (error) throw new Error(`faellige_verdichtungen: ${error.message}`);

  const faellige = (data ?? []) as FaelligeMail[];
  const bericht: Verdichtungsbericht = {
    gefunden: faellige.length,
    verdichtet: 0,
    uebersprungen: [],
  };

  for (const mail of faellige) {
    try {
      const verdichtung = await verdichtungErzeugen(mail);

      if (!verdichtung) {
        bericht.uebersprungen.push({
          mailId: mail.id,
          grund: "keine brauchbare Verdichtung",
        });
        continue;
      }

      const { error: schreibFehler } = await zugang.rpc("mail_verdichten", {
        ziel_mail_id: mail.id,
        text_verdichtung: verdichtung,
      });

      if (schreibFehler) {
        bericht.uebersprungen.push({
          mailId: mail.id,
          grund: schreibFehler.message,
        });
        continue;
      }

      bericht.verdichtet++;
    } catch (fehler) {
      /* Eine Mail, die sich nicht verdichten lässt, hält den Lauf nicht auf.
         Sie bleibt fällig und kommt beim nächsten Mal wieder dran — das ist
         besser, als den ganzen Rückstand an einem Sonderfall scheitern zu
         lassen. */
      bericht.uebersprungen.push({
        mailId: mail.id,
        grund: fehler instanceof Error ? fehler.message : "unbekannt",
      });
    }
  }

  return bericht;
}

/* ------------------------------------------------------------------------ */

/**
 * Die Klarnamen zu einer Mail — damit sie beim Verdichten pseudonymisiert
 * werden können.
 *
 * **Sonst wäre der Lauf ein Datenschutzloch:** Die Verdichtung geht an
 * Mistral, und ohne diesen Schritt ginge der Kundenname im Klartext mit —
 * ausgerechnet bei dem Vorgang, der die Datensparsamkeit herstellen soll.
 */
async function klarnamen(kundeId: string | null) {
  if (!kundeId) return undefined;

  try {
    const zugang = dienstZugang();
    const { data } = await zugang
      .from("customers")
      .select("anzeigename_geheim, firma_geheim, ansprechpartner_geheim")
      .eq("id", kundeId)
      .maybeSingle();

    if (!data) return undefined;

    return {
      kunde: entschluesselnWennMoeglich(data.anzeigename_geheim) ?? undefined,
      firma: entschluesselnWennMoeglich(data.firma_geheim) ?? undefined,
      ansprechpartner:
        entschluesselnWennMoeglich(data.ansprechpartner_geheim) ?? undefined,
    };
  } catch {
    return undefined;
  }
}

/**
 * Erzeugt die Verdichtung.
 *
 * Kleines Modell — es geht um Zusammenfassen, nicht um Formulierkunst
 * (`MODELL.md` §1: `verdichten: "klein"`).
 */
async function verdichtungErzeugen(
  mail: FaelligeMail,
): Promise<string | null> {
  const wortlaut = [
    mail.eingehender_text ? `Vom Kunden:\n${mail.eingehender_text}` : "",
    mail.ihre_stichworte ? `Ihre Stichworte:\n${mail.ihre_stichworte}` : "",
    mail.text_de ? `Ihre Antwort:\n${mail.text_de}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!wortlaut.trim()) return null;

  const antwort = await einordnen({
    zweck: "verdichten",
    nutzerId: mail.nutzer_id,
    hoechstlaenge: 400,
    namen: await klarnamen(mail.kunde_id),
    nachrichten: [
      {
        rolle: "system",
        inhalt: [
          "Fasse diesen Mailwechsel so zusammen, dass er als Gedächtnisstütze taugt.",
          "",
          "Nimm auf:",
          "- worum es ging (ein Satz)",
          "- in welchem Ton geschrieben wurde",
          "- welche Formulierungen typisch waren",
          "- was dauerhaft über den Kunden gelernt wurde",
          "",
          "Lass weg — das ist der Zweck der Zusammenfassung:",
          "- den Originalwortlaut. Schreibe keine Sätze aus der Mail ab.",
          "- alle Beträge, Preise, Mengen und Bestellnummern",
          "- alle konkreten Datumsangaben",
          "- alle Namen von Personen und Firmen",
          "",
          "Höchstens acht Zeilen. Keine Anrede, keine Grußformel, keine Anmerkungen.",
        ].join("\n"),
      },
      { rolle: "nutzer", inhalt: wortlaut },
    ],
  });

  return brauchbar(antwort.text.trim()) ? antwort.text.trim() : null;
}

/**
 * **Die Gegenprobe.**
 *
 * Die Anweisung sagt „keine Beträge, keine Namen, kein Wortlaut" — aber eine
 * Anweisung ist keine Garantie, und hier gibt es niemanden, der drüberschaut:
 * Der Lauf passiert nachts, sie merkt nichts davon, und das Ergebnis ersetzt
 * dauerhaft den Wortlaut im Gedächtnis der App.
 *
 * Was durchrutscht, bleibt für immer. Deshalb wird das Ergebnis geprüft, und
 * im Zweifel lieber **gar nicht** verdichtet: Die Mail bleibt fällig, der
 * nächste Lauf versucht es erneut. Eine ausgefallene Verdichtung ist ein
 * Aufschub — eine schlechte ist ein Datenschutzproblem mit Bestandsschutz.
 */
export function brauchbar(verdichtung: string): boolean {
  const text = verdichtung.trim();

  /* Zu kurz heißt: Das Modell hat nichts Sinnvolles geliefert. */
  if (text.length < 20) return false;

  /* Ein übriggebliebenes Pseudonym heißt, die Rückersetzung hat versagt —
     dann stünde „[KUNDE_1]" dauerhaft in der Akte. */
  if (uebrigePlatzhalter(text).length > 0) return false;

  /* Beträge und Mengen sind genau das, was die Verdichtung loswerden soll. */
  if (/\d[\d.,]*\s?(?:€|EUR|Euro|kg|g\b|Stück|Laib|Paletten?|Kartons?)/i.test(text)) {
    return false;
  }

  /* Ein ausgeschriebenes Datum ist eine konkrete Zusage. */
  if (/\b\d{1,2}\.\s?\d{1,2}\.(?:\s?\d{2,4})?/.test(text)) return false;

  return true;
}
