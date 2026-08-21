/**
 * Preise je Million Token, in Euro.
 *
 * **Stand der Planung** (`CLAUDE.md` §7), umgerechnet aus den dort genannten
 * Dollarpreisen mit einem groben Kurs. Sie dienen der Kostenanzeige und der
 * Warnschwelle, nicht der Buchhaltung — die verbindliche Zahl steht auf der
 * Rechnung.
 *
 * Wenn die Anzeige spürbar von der Rechnung abweicht, gehören diese Werte
 * nachgezogen. Sie stehen bewusst an einer Stelle und nicht verstreut im Code.
 */

export type Preis = { ein: number; aus: number };

const KURS = 0.92; // Dollar zu Euro, grob

const dollar = (ein: number, aus: number): Preis => ({
  ein: ein * KURS,
  aus: aus * KURS,
});

export const PREISE: Record<string, Preis> = {
  // Large 3: rund $2 / $6 je Mio. Token
  "mistral-large-2512": dollar(2, 6),
  // Medium 3.5: rund $1 / $3
  "mistral-medium-2604": dollar(1, 3),
  // Small 4: Preis noch nicht bestätigt, angesetzt wie Small 3.1 ($0.20 / $0.60)
  "mistral-small-2603": dollar(0.2, 0.6),
  // Einbettungen
  "mistral-embed-2312": dollar(0.1, 0),
  // Dokumentenerkennung (Phase 10)
  "mistral-ocr-2512": dollar(1, 0),
};

/**
 * Was ein Aufruf gekostet hat.
 * Unbekanntes Modell → 0. Lieber eine Lücke in der Anzeige als eine
 * erfundene Zahl, die nach Gewissheit aussieht.
 */
export function kostenBerechnen(
  modell: string,
  tokenEin: number,
  tokenAus: number,
): number {
  const preis = PREISE[modell];
  if (!preis) return 0;
  return (tokenEin / 1_000_000) * preis.ein + (tokenAus / 1_000_000) * preis.aus;
}
