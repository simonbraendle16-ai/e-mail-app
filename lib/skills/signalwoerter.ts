import type { Skill } from "./typen";

/**
 * Stufe 1 der Skill-Auswahl: Signalwort-Abgleich (`SKILLS.md`).
 *
 * Kein Modell, keine Kosten, kein Warten. Ergebnis ist eine **Vorauswahl**,
 * keine Entscheidung — die fällt in Stufe 2.
 *
 * Warum zweistufig: Ein reiner Signalwort-Abgleich wäre stur. „Wann kommt die
 * Bestellung?" enthält Signalwörter von zwei Skills, und wer nur zählt, wählt
 * den mit den meisten Treffern statt den passenden. Ein reiner Modellaufruf
 * wäre umgekehrt teuer und langsam für etwas, das meistens eindeutig ist.
 */

export type Treffer = {
  skill: Skill;
  /** Welche Signalwörter im Text vorkamen. */
  woerter: string[];
  /** Wie oft insgesamt — mehrfaches Vorkommen zählt mit. */
  anzahl: number;
};

/**
 * Sucht ein Signalwort im Text.
 *
 * Wortgrenzen sind wichtig: Ohne sie fände „Termin" auch in „terminiert" und
 * „Preis" in „Preisliste" — Letzteres wäre sogar erwünscht, Ersteres nicht.
 * Deshalb wird am Anfang auf eine Wortgrenze bestanden, am Ende nicht: So
 * findet „Liefer" auch „Lieferung", aber „Termin" nicht „bestimmt".
 *
 * Mehrwortige Signale („wann kommt") werden als Ganzes gesucht.
 */
function zaehleVorkommen(text: string, signal: string): number {
  const escaped = signal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const muster = new RegExp(`\\b${escaped}`, "gi");
  return (text.match(muster) ?? []).length;
}

/**
 * Gleicht Text gegen die Signalwörter aller übergebenen Skills ab.
 *
 * `text` sollte die eingegangene Mail **und** ihre Stichworte enthalten —
 * oft steht das entscheidende Wort nicht in der Kundenmail, sondern in dem,
 * was sie antworten will.
 */
export function signalwortAbgleich(text: string, skills: Skill[]): Treffer[] {
  const gefunden: Treffer[] = [];

  for (const skill of skills) {
    if (skill.signalwoerter.length === 0) continue;

    const woerter: string[] = [];
    let anzahl = 0;

    for (const signal of skill.signalwoerter) {
      const vorkommen = zaehleVorkommen(text, signal);
      if (vorkommen > 0) {
        woerter.push(signal);
        anzahl += vorkommen;
      }
    }

    if (woerter.length > 0) gefunden.push({ skill, woerter, anzahl });
  }

  /* Nach Anzahl verschiedener Signalwörter sortieren, dann nach Häufigkeit.
     Drei verschiedene Treffer wiegen schwerer als dreimal dasselbe Wort —
     Letzteres kann ein einzelner Satz sein, der zufällig ein Wort wiederholt. */
  return gefunden.sort(
    (a, b) => b.woerter.length - a.woerter.length || b.anzahl - a.anzahl,
  );
}

/**
 * Ist die Vorauswahl eindeutig genug, um Stufe 2 zu sparen?
 *
 * Eindeutig heißt: genau ein Skill hat getroffen, oder der erste hat deutlich
 * mehr verschiedene Signalwörter als der zweite. Dann kostet ein Modellaufruf
 * nur Zeit und Geld für ein Ergebnis, das schon feststeht.
 */
export function istEindeutig(treffer: Treffer[]): boolean {
  if (treffer.length === 0) return false;
  if (treffer.length === 1) return true;

  const [erster, zweiter] = treffer as [Treffer, Treffer];
  return erster.woerter.length >= zweiter.woerter.length * 2;
}
