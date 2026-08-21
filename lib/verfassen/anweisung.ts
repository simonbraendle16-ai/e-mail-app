import "server-only";
import type { Skill } from "@/lib/skills/typen";
import type { Nachricht } from "@/lib/modell/schnittstelle";
import type { Kontext } from "./kontext";

/**
 * Baut die Anweisung an das Modell (`MODELL.md` §2).
 *
 * Fünf Blöcke, immer in dieser Reihenfolge:
 *
 *   1. Rolle und Grundhaltung   fest, ändert sich nie
 *   2. Stilprofil               global, wächst mit ihren Regeln
 *   3. Skill-Anweisung          aus der Skill-Datei
 *   4. Kundenkontext            Akte, Fakten, Beispiele — pseudonymisiert
 *   5. Regeln                   global, dann kundenspezifisch
 *
 * **Die Reihenfolge ist nicht beliebig:** Was später steht, wiegt schwerer.
 * Deshalb stehen kundenspezifische Regeln hinter globalen — sie sollen sie
 * überstimmen können.
 *
 * Blöcke 1 bis 3 ändern sich zwischen Aufrufen kaum. Genau darauf zielt das
 * Prompt-Caching (`MODELL.md` §7): Sie stehen vorn und bilden einen stabilen
 * Präfix, der ab dem zweiten Aufruf nur noch ein Zehntel kostet.
 */

/** Block 1 — unveränderlich, wörtlich aus `MODELL.md` §2. */
export const ROLLE = `Du schreibst geschäftliche E-Mails für die Kundenbetreuung einer deutschen Käserei.
Du schreibst sie fertig, so dass sie ohne Änderung abgeschickt werden können.

Grundhaltung:
- Du schreibst, wie ein erfahrener Mensch im Büro schreibt: klar, freundlich, ohne Floskeln.
- Kurze Sätze. Ein Gedanke pro Satz.
- Keine Werbesprache, keine Superlative, keine Ausrufezeichen.
- Keine Höflichkeitsschleifen ("Wir möchten uns herzlich dafür bedanken, dass Sie sich die
  Zeit genommen haben") — ein Dank reicht, und zwar in einem Satz.
- Du erfindest nichts. Keine Zahlen, keine Termine, keine Zusagen, die nicht in den
  Angaben stehen. Fehlt etwas, schreibst du eine Lücke in eckigen Klammern: [Preis eintragen].
- Du kommentierst deine eigene Arbeit nicht. Du lieferst die Mail, sonst nichts.

Was nicht in die Mail gehört:
- Keine Betreffzeile. Sie fügt die Mail in Outlook ein, der Betreff steht dort schon.
- Keine Platzhalter für Signatur, Name oder Firma. Die Mail endet mit der Grußformel.`;

/**
 * Block 2 — Stilprofil, Startfassung aus `MODELL.md` §2.
 *
 * Das ist **eine Annahme bis zur ersten echten Mail**. Sobald Beispielmaterial
 * vorliegt, wird dieser Block daraus abgeleitet statt geraten.
 */
export const STILPROFIL_START = `Ihr Schreibstil:
- Anrede: "Sehr geehrte Frau X" / "Sehr geehrter Herr X", bei bekannten Kunden "Hallo Herr X"
- Abschluss: "Mit freundlichen Grüßen"
- Sie duzt niemanden im geschäftlichen Kontext.
- Sie kommt nach höchstens zwei Sätzen zum Anliegen.
- Sie verspricht nichts, was sie nicht halten kann — lieber "ich kläre das und melde mich"
  als ein Termin auf Verdacht.`;

/**
 * Block 5 — die Regeln als nummerierte, nicht verhandelbare Vorgaben.
 *
 * Kundenspezifische zuletzt, damit sie globale überstimmen.
 */
function regelnBlock(kontext: Kontext): string {
  const global = kontext.regeln.filter((r) => !r.kundenspezifisch);
  const kundenspezifisch = kontext.regeln.filter((r) => r.kundenspezifisch);

  if (global.length === 0 && kundenspezifisch.length === 0) return "";

  const zeilen = [...global, ...kundenspezifisch].map(
    (regel, i) => `${i + 1}. ${regel.text}`,
  );

  return `Nicht verhandelbare Vorgaben. Bei Widerspruch zu allem Vorherigen gilt das hier:
${zeilen.join("\n")}`;
}

/** Block 4 — Kundenkontext. Die Namen sind hier noch Klartext und werden
 *  erst in `lib/modell` ersetzt, unmittelbar vor dem Aufruf. */
function kundenBlock(kontext: Kontext): string {
  const teile: string[] = [];

  if (kontext.kunde) {
    const k = kontext.kunde;
    const kopf = [
      `Kunde: ${k.anzeigename}`,
      k.land ? `Land: ${k.land}` : null,
      `Sprache: ${k.sprache === "en" ? "Englisch" : "Deutsch"}`,
    ]
      .filter(Boolean)
      .join(", ");

    teile.push(kopf);

    if (k.ansprechpartner) teile.push(`Ansprechpartner: ${k.ansprechpartner}`);
    if (k.tonalitaet) teile.push(`So schreibt man diesem Kunden: ${k.tonalitaet}`);
  }

  if (kontext.fakten.length > 0) {
    teile.push(
      `Was wir über diesen Kunden wissen:\n${kontext.fakten
        .map((f) => `- ${f}`)
        .join("\n")}`,
    );
  }

  if (kontext.beispiele.length > 0) {
    const beispiele = kontext.beispiele
      .map((b, i) => `--- Beispiel ${i + 1} ---\n${b}`)
      .join("\n\n");
    teile.push(`So haben Sie diesem Kunden früher geschrieben:\n${beispiele}`);
  }

  if (kontext.bausteine.length > 0) {
    teile.push(
      `Feste Formulierungen der Firma:\n${kontext.bausteine
        .map((b) => `- ${b}`)
        .join("\n")}`,
    );
  }

  if (teile.length === 0) {
    /* Ehrlich sagen, statt so zu tun, als wüsste man etwas (`SKILLS.md` §6). */
    return "Zu diesem Kunden liegt noch nichts vor. Schreibe ohne Vorwissen.";
  }

  return teile.join("\n\n");
}

/**
 * Der Teil der Anweisung, der sich zwischen Aufrufen **kaum ändert**.
 * Blöcke 1 bis 3. Bildet den Präfix fürs Caching.
 */
export function stabilerTeil(skill: Skill, stilprofil = STILPROFIL_START): string {
  return [ROLLE, stilprofil, skill.anweisung].join("\n\n---\n\n");
}

/**
 * Schlüssel für das Prompt-Caching.
 *
 * Muss sich genau dann ändern, wenn sich der stabile Teil ändert — sonst
 * bekäme Mistral einen Cache-Treffer auf einem Präfix, das gar nicht mehr
 * passt. Deshalb steckt der Skillname drin: Ein anderer Skill heißt ein
 * anderer Block 3.
 */
export function zwischenspeicherSchluessel(
  skill: Skill,
  nutzerId: string,
): string {
  return `verfassen-${skill.name}-${nutzerId}`;
}

export type AnweisungAngaben = {
  skill: Skill;
  kontext: Kontext;
  eingehenderText?: string;
  stichworte: string;
  stilprofil?: string;
};

/**
 * Die vollständige Anweisung als Nachrichtenfolge.
 *
 * Der stabile Teil steht als eine Systemnachricht vorn, damit der Präfix
 * ununterbrochen ist — mehrere Systemnachrichten hintereinander wären für
 * das Caching dasselbe, aber schwerer zu prüfen.
 */
export function anweisungBauen(angaben: AnweisungAngaben): Nachricht[] {
  const { skill, kontext, eingehenderText, stichworte, stilprofil } = angaben;

  const system = [
    stabilerTeil(skill, stilprofil),
    "---",
    kundenBlock(kontext),
    regelnBlock(kontext),
  ]
    .filter((t) => t.trim())
    .join("\n\n");

  const nutzer = [
    eingehenderText
      ? `Eingegangene Mail:\n---\n${eingehenderText.trim()}\n---`
      : "Es gibt keine eingegangene Mail. Sie schreibt von sich aus.",
    `Was sie sagen will: ${stichworte.trim()}`,
    ZWEI_FASSUNGEN,
  ].join("\n\n");

  return [
    { rolle: "system", inhalt: system },
    { rolle: "nutzer", inhalt: nutzer },
  ];
}

/**
 * Die Anweisung für zwei Fassungen, wörtlich aus `MODELL.md` §2b.
 *
 * Warum zwei: Ihr Engpass ist Grübelzeit. Auswählen ist leichter als bewerten —
 * ein einzelner Vorschlag wird zerdacht, zwei nebeneinander erzwingen eine
 * Entscheidung. Und die getroffene Wahl ist zugleich ein Lernsignal.
 */
export const ZWEI_FASSUNGEN = `Schreibe zwei Fassungen dieser Mail.

Fassung A: knapp. Nur das Nötige, höchstens fünf Sätze.
Fassung B: ausführlicher. Mit Begründung und einem Satz zum weiteren Vorgehen.

Beide Fassungen halten sich an alle oben genannten Vorgaben.
Trenne sie durch eine Zeile mit ---
Keine Überschriften, keine Erklärungen.`;

/**
 * Zerlegt die Antwort in die beiden Fassungen.
 *
 * Das Modell hält sich meistens an die Trennzeile, aber nicht immer. Kommt nur
 * ein Teil, wird er als knappe Fassung genommen und die zweite bleibt leer —
 * besser eine Fassung als eine Fehlermeldung. Sie sieht dann eben nur eine.
 */
export function fassungenTrennen(text: string): {
  knapp: string;
  ausfuehrlich: string;
} {
  const teile = text
    .split(/^\s*-{3,}\s*$/m)
    .map((t) => t.trim())
    .filter(Boolean);

  if (teile.length >= 2) {
    return { knapp: teile[0]!, ausfuehrlich: teile[1]! };
  }

  return { knapp: text.trim(), ausfuehrlich: "" };
}
