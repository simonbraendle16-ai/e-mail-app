/**
 * Sichert ihren getippten Text im Browser (`MODELL.md` §5).
 *
 * > „Ihr eingegebener Text wird im Browser zwischengespeichert, **bevor
 * > irgendein Aufruf startet**. Kein Ausfall darf sie Tipparbeit kosten."
 *
 * Was das abfängt: versehentliches Neuladen, ein geschlossener Tab, ein
 * Absturz mitten im Formulieren. Nicht abgefangen wird ein anderer Rechner —
 * das wäre Serversache und lohnt den Aufwand hier nicht.
 *
 * **Kein Kundendatum verlässt dabei die Maschine.** `localStorage` ist an
 * diesen Browser und diese Adresse gebunden; die Kundenmail liegt ohnehin
 * schon in ihrem Postfach auf demselben Rechner.
 */

const SCHLUESSEL = "e-mail-app.entwurf";

/** Nach dieser Zeit ist ein Entwurf nicht mehr das, was sie gerade tut. */
const HALTBAR_MS = 24 * 60 * 60 * 1000;

export type Entwurf = {
  eingehenderText: string;
  stichworte: string;
  kundeId: string | null;
  gesichertAm: number;
};

/**
 * Jeder Zugriff ist eingepackt: In einem privaten Fenster, bei gesperrten
 * Website-Daten oder bei vollem Speicher wirft `localStorage`. Das darf die
 * App nicht aufhalten — Sichern ist ein Zusatz, kein Betriebsmittel.
 */
export function entwurfSichern(
  entwurf: Omit<Entwurf, "gesichertAm">,
): void {
  try {
    if (!entwurf.eingehenderText.trim() && !entwurf.stichworte.trim()) {
      entwurfVergessen();
      return;
    }

    localStorage.setItem(
      SCHLUESSEL,
      JSON.stringify({ ...entwurf, gesichertAm: Date.now() }),
    );
  } catch {
    /* Kein Speicher, kein Drama. */
  }
}

export function entwurfLesen(): Entwurf | null {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    if (!roh) return null;

    const entwurf = JSON.parse(roh) as Entwurf;

    if (Date.now() - entwurf.gesichertAm > HALTBAR_MS) {
      entwurfVergessen();
      return null;
    }

    if (!entwurf.eingehenderText?.trim() && !entwurf.stichworte?.trim()) {
      return null;
    }

    return entwurf;
  } catch {
    return null;
  }
}

export function entwurfVergessen(): void {
  try {
    localStorage.removeItem(SCHLUESSEL);
  } catch {
    /* siehe oben */
  }
}
