import "server-only";
import { serverZugang } from "@/lib/supabase/server";
import { lesbar } from "./kunden";

/**
 * Vollständiger Datenexport als JSON.
 *
 * `PLAN.md` §2 verlangt ihn; in der Validierung fiel auf, dass er fehlte.
 *
 * Zwei Dinge, die ihn von einem schlichten Datenbankabzug unterscheiden:
 *
 * 1. **Die Kundennamen sind entschlüsselt.** Ein Export voller Geheimtexte
 *    wäre wertlos — und genau dann wertlos, wenn er gebraucht wird: bei einer
 *    Auskunft nach Art. 15 DSGVO oder wenn sie die App verlässt und ihre Daten
 *    mitnehmen will.
 * 2. **Die Suchwerte bleiben draußen.** Sie sind ein technisches Hilfsmittel
 *    und sagen niemandem etwas; im Export wären sie nur Rauschen.
 *
 * Was drin ist: alles, was zu ihr gehört. Nicht dabei ist die Tabelle
 * `weckruf` — die gehört keinem Nutzer und enthält nur Zeitstempel.
 */

export type Datenexport = {
  erzeugt_am: string;
  hinweis: string;
  kunden: unknown[];
  kundenfakten: unknown[];
  mails: unknown[];
  mailfassungen: unknown[];
  stilregeln: unknown[];
  glossar: unknown[];
  textbausteine: unknown[];
  dokumente: unknown[];
  abschnitte: unknown[];
  kosten: unknown[];
};

export async function datenExportieren(): Promise<Datenexport> {
  const zugang = await serverZugang();

  /* Alle Abfragen laufen unter Row-Level-Security — es kommt also nur, was
     ihr gehört, ohne dass hier irgendwo nach nutzer_id gefiltert werden muss. */
  const [
    kunden,
    fakten,
    mails,
    fassungen,
    regeln,
    glossar,
    bausteine,
    dokumente,
    abschnitte,
    kosten,
  ] = await Promise.all([
    zugang.from("customers").select(),
    zugang.from("customer_facts").select(),
    zugang.from("emails").select(),
    zugang.from("email_versions").select(),
    zugang.from("style_rules").select(),
    zugang.from("glossary").select(),
    zugang.from("boilerplates").select(),
    zugang.from("documents").select(),
    /* Ohne die Einbettungsvektoren: mehrere tausend Zahlen pro Abschnitt,
       die kein Mensch je liest und die den Export vervielfachen würden. */
    zugang
      .from("chunks")
      .select(
        "id, kunde_id, quelle_art, quelle_id, inhalt, merkmale, aus_archiv, erstellt_am",
      ),
    zugang.from("usage_log").select(),
  ]);

  for (const antwort of [
    kunden,
    fakten,
    mails,
    fassungen,
    regeln,
    glossar,
    bausteine,
    dokumente,
    abschnitte,
    kosten,
  ]) {
    if (antwort.error) throw antwort.error;
  }

  return {
    erzeugt_am: new Date().toISOString(),
    hinweis:
      "Vollstaendiger Export aller Daten. Kundennamen sind entschluesselt; " +
      "die technischen Suchwerte und die Einbettungsvektoren sind weggelassen, " +
      "weil sie keine lesbare Aussage enthalten.",
    kunden: (kunden.data ?? []).map(lesbar),
    kundenfakten: fakten.data ?? [],
    mails: mails.data ?? [],
    mailfassungen: fassungen.data ?? [],
    stilregeln: regeln.data ?? [],
    glossar: glossar.data ?? [],
    textbausteine: bausteine.data ?? [],
    dokumente: dokumente.data ?? [],
    abschnitte: abschnitte.data ?? [],
    kosten: kosten.data ?? [],
  };
}
