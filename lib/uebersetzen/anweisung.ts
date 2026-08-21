import type { Nachricht } from "@/lib/modell";

/**
 * Der Wortlaut der Übersetzungsanweisungen (`MODELL.md` §3 und §3b).
 *
 * Was hier steht, steht so in `MODELL.md`. Abweichungen sind keine
 * Geschmacksfrage — der Wortlaut ist Teil der Spezifikation, weil sich an ihm
 * das Ergebnis messen lässt.
 */

/**
 * Britisches Englisch ist die Vorgabe, außer der Kunde sitzt in Nordamerika.
 * Das Land steht in der Kundenakte; fehlt es, bleibt es beim Britischen — die
 * Kundschaft einer deutschen Käserei sitzt weit überwiegend in Europa.
 */
const NORDAMERIKA = ["us", "usa", "vereinigte staaten", "ca", "kanada", "canada"];

function sprachvariante(land?: string | null): string {
  const gesucht = (land ?? "").trim().toLowerCase();
  return gesucht && NORDAMERIKA.includes(gesucht)
    ? "Amerikanisches Englisch."
    : "Britisches Englisch.";
}

export type UebersetzungAngaben = {
  /** Die fertige deutsche Mail. Nie eine, die noch nicht steht. */
  deutsch: string;
  /** Verbindliche Begriffe, schon als Zeilen `  de → en`. */
  vorgaben: string[];
  /** Land des Kunden aus der Akte, für die Sprachvariante. */
  land?: string | null;
};

export function uebersetzungAnweisung(
  angaben: UebersetzungAngaben,
): Nachricht[] {
  const { deutsch, vorgaben, land } = angaben;

  const begriffe = vorgaben.length
    ? ["Verbindliche Begriffe — genau so, keine Synonyme:", ...vorgaben].join(
        "\n",
      )
    : /* Ohne Glossar wird nicht geschwiegen, sondern gesagt, dass es keins
         gibt — sonst füllt das Modell die Lücke mit einer erfundenen
         Vorgabe. Das Glossar startet leer und bleibt es die ersten Wochen. */
      "Es gibt bisher keine verbindlichen Begriffe. Wähle die im Lebensmittel- und Käsehandel übliche Fachsprache.";

  const system = [
    "Übertrage die folgende deutsche Geschäftsmail ins Englische.",
    "",
    begriffe,
    "",
    "Regeln:",
    "- Übertrage den Sinn, nicht die Wortstellung. Löse deutsche Schachtelsätze auf.",
    '- Anrede und Grußformel nach englischer Geschäftskonvention: "Dear Mr Miller" / "Kind regards" — nicht die deutsche Formel übersetzt.',
    `- ${sprachvariante(land)}`,
    "- Zahlen, Daten und Mengen bleiben unverändert. Datumsformat an das Land anpassen.",
    "- Lückenmarkierungen in eckigen Klammern bleiben unverändert stehen und werden nicht übersetzt.",
    "- Keine Erklärungen, keine Anmerkungen. Nur die englische Mail.",
  ].join("\n");

  return [
    { rolle: "system", inhalt: system },
    { rolle: "nutzer", inhalt: deutsch.trim() },
  ];
}

/**
 * Die Kontrollanweisung.
 *
 * **Das deutsche Original wird nicht mitgeschickt.** Kennt das Modell den
 * Ausgangstext, gleicht es unbewusst an, und die Kontrolle wird wertlos — sie
 * würde bestätigen, was sie prüfen soll. Deshalb nimmt diese Funktion den
 * deutschen Text gar nicht erst entgegen: Was nicht übergeben werden kann,
 * kann auch nicht versehentlich mitgeschickt werden.
 */
export function rueckuebersetzungAnweisung(englisch: string): Nachricht[] {
  const system = [
    "Übertrage die folgende englische Mail zurück ins Deutsche.",
    "",
    "- Übersetze wörtlich, nah am englischen Text. Nicht schön machen, nicht glätten.",
    '- Gib Zusagen genau so wieder, wie sie dort stehen: "können" ist nicht "könnten".',
    "- Übernimm Zahlen, Daten und Mengen unverändert.",
    "- Keine Anmerkungen. Nur der deutsche Text.",
  ].join("\n");

  return [
    { rolle: "system", inhalt: system },
    { rolle: "nutzer", inhalt: englisch.trim() },
  ];
}

/**
 * Die Streuung der Rückübersetzung liegt bewusst niedrig: Hier ist
 * Wortgetreue gefragt, nicht Sprachgefühl. Steht so im Skill
 * `rueckuebersetzung` (`streuung: 0.1`).
 */
export const STREUUNG_RUECK = 0.1;
