/**
 * Was eine maschinelle Prüfung zurückgibt (`MODELL.md` §4).
 *
 * Die Prüfungen laufen **ohne Modell und ohne Kosten**, nach jeder
 * Formulierung, bevor sie das Ergebnis sieht. Das ist die Schicht, die auch
 * dann noch greift, wenn das Modell einen schlechten Tag hat.
 */

export const BEFUNDARTEN = [
  /** Eine `vermeiden`-Regel mit Muster wurde verletzt. */
  "verbotene-formulierung",
  /** Eine Zahl, ein Datum, ein Betrag steht in keiner Quelle. */
  "erfundene-angabe",
  /** Anrede, Hauptteil oder Grußformel fehlt. */
  "unvollstaendig",
  /** Eine gewollte Lücke `[…]`, die sie ausfüllen soll. */
  "luecke",
  /** Ein Pseudonym `[KUNDE_1]` hat die Rückersetzung überlebt. */
  "pseudonym-rest",
  /** Über 250 Wörter. */
  "laenge",
] as const;

export type Befundart = (typeof BEFUNDARTEN)[number];

/**
 * Was mit dem Befund geschieht. Die Zuordnung ist nicht frei gewählt, sie
 * steht in der Tabelle in `MODELL.md` §4.
 */
export type Folge =
  /**
   * Genau ein automatischer Neuversuch mit ausdrücklichem Hinweis. Danach
   * sichtbare Warnung. Genau einer, nicht mehr: Ein zweiter kostet noch
   * einmal Geld und Wartezeit, und wenn das Modell zweimal dieselbe Regel
   * überliest, hilft ein drittes Mal auch nicht.
   */
  | "neuversuch"
  /**
   * Die Stelle wird ihr markiert. **Kein stiller Neuversuch** — sie muss es
   * sehen. Gilt für erfundene Angaben: Ein falscher Preis in einer
   * Kundenmail ist der einzige Fehler in diesem Projekt, der echten Schaden
   * anrichten kann, und ein automatisch korrigierter falscher Preis wäre
   * immer noch falsch, nur unsichtbar.
   */
  | "markieren"
  /** Nur ein Satz daneben, keine Änderung am Text. */
  | "hinweis";

export type Befund = {
  art: Befundart;
  folge: Folge;
  /**
   * Was sie liest. Deutsch, ganzer Satz, kein Jargon, kein Code, keine
   * Fehlernummer (`CLAUDE.md` §2).
   */
  text: string;
  /**
   * Die betroffene Stelle im Entwurf, wörtlich — damit die Oberfläche sie
   * hervorheben kann und sie nicht selbst suchen muss.
   */
  stellen: string[];
};

/** Sortiert nach Dringlichkeit: Was Schaden anrichten kann, steht oben. */
const RANG: Record<Befundart, number> = {
  "erfundene-angabe": 0,
  "pseudonym-rest": 1,
  "verbotene-formulierung": 2,
  unvollstaendig: 3,
  luecke: 4,
  laenge: 5,
};

export function nachDringlichkeit(befunde: Befund[]): Befund[] {
  return [...befunde].sort((a, b) => RANG[a.art] - RANG[b.art]);
}
