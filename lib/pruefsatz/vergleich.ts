import type { Befund } from "@/lib/pruefungen/typen";

/**
 * Die Rückschrittsprüfung (`MODELL.md` §6, Stufe 3).
 *
 * > „Ändere ich später eine Anweisung oder ein Modell, laufen die gesammelten
 * > Fälle erneut durch. Verglichen wird **maschinell, nicht nach Geschmack**."
 *
 * **Was hier bewusst nicht gemessen wird: „Klingt das gut?"** Das ist genau
 * die Frage, die seine Mutter besser beantwortet als jede Maschine — und ein
 * Modell, das das Ergebnis eines anderen Modells benotet, misst vor allem
 * seinen eigenen Geschmack. Gemessen wird nur, was hart entscheidbar ist.
 */

/** Was von einem Durchlauf je Fall übrigbleibt. */
export type Fallergebnis = {
  mailId: string;
  /** Wie viele der maschinellen Prüfungen angeschlagen haben. */
  befunde: Befund[];
  /** Verbindliche Glossarbegriffe, die fehlten. */
  glossarLuecken: number;
  /** Wortzahl des Ergebnisses. */
  woerter: number;
};

export type Durchlauf = {
  /** Wann und womit — zum Nachvollziehen. */
  gelaufenAm: string;
  modell: string;
  ergebnisse: Fallergebnis[];
};

export type Rueckschritt = {
  mailId: string;
  /** Was sie beziehungsweise der User liest. */
  text: string;
};

export type Vergleichsergebnis = {
  rueckschritte: Rueckschritt[];
  /** Fälle, die sich verbessert haben — nur zur Einordnung. */
  besser: number;
  /** Fälle, die in beiden Durchläufen vorkamen. */
  verglichen: number;
};

/** Über diese Abweichung hinaus gilt die Länge als verändert (`MODELL.md` §6). */
const LAENGENSCHWELLE = 0.4;

function harteBefunde(ergebnis: Fallergebnis): number {
  /* Hinweise zählen nicht: Eine Lücke ist gewollt, und die Länge wird
     ohnehin getrennt geprüft. Ein Rückschritt ist nur, was schadet. */
  return ergebnis.befunde.filter((b) => b.folge !== "hinweis").length;
}

function verletzteRegeln(ergebnis: Fallergebnis): number {
  return ergebnis.befunde.filter((b) => b.art === "verbotene-formulierung")
    .length;
}

/**
 * Vergleicht zwei Durchläufe.
 *
 * **Ein Rückschritt ist eine Verschlechterung gegenüber dem letzten
 * Durchlauf, nicht ein absoluter Fehler.** Ein Fall, der schon vorher eine
 * Regel verletzte und es weiterhin tut, ist kein Rückschritt — er war schon
 * kaputt. Sonst würde jede Änderung an allen Altlasten gemessen und nie
 * durchgehen.
 */
export function rueckschritteFinden(
  vorher: Durchlauf,
  nachher: Durchlauf,
): Vergleichsergebnis {
  const alt = new Map(vorher.ergebnisse.map((e) => [e.mailId, e]));

  const rueckschritte: Rueckschritt[] = [];
  let besser = 0;
  let verglichen = 0;

  for (const neu of nachher.ergebnisse) {
    const vorherFall = alt.get(neu.mailId);
    if (!vorherFall) continue;
    verglichen++;

    const gruende: string[] = [];

    if (harteBefunde(neu) > harteBefunde(vorherFall)) {
      gruende.push(
        `die maschinellen Prüfungen schlagen jetzt ${harteBefunde(neu)}-mal an statt ${harteBefunde(vorherFall)}-mal`,
      );
    }

    if (neu.glossarLuecken > vorherFall.glossarLuecken) {
      gruende.push(
        `${neu.glossarLuecken - vorherFall.glossarLuecken} Glossarbegriff(e) fehlen zusätzlich`,
      );
    }

    if (verletzteRegeln(neu) > verletzteRegeln(vorherFall)) {
      gruende.push("eine Regel wird verletzt, die vorher eingehalten wurde");
    }

    if (vorherFall.woerter > 0) {
      const abweichung =
        Math.abs(neu.woerter - vorherFall.woerter) / vorherFall.woerter;
      if (abweichung > LAENGENSCHWELLE) {
        gruende.push(
          `die Länge weicht um ${Math.round(abweichung * 100)} % ab`,
        );
      }
    }

    if (gruende.length > 0) {
      rueckschritte.push({
        mailId: neu.mailId,
        text: gruende.join("; "),
      });
      continue;
    }

    if (
      harteBefunde(neu) < harteBefunde(vorherFall) ||
      neu.glossarLuecken < vorherFall.glossarLuecken
    ) {
      besser++;
    }
  }

  return { rueckschritte, besser, verglichen };
}

/**
 * Das Urteil in einem Satz.
 *
 * > „Wird eine dieser Fragen schlechter beantwortet als beim letzten
 * > Durchlauf, gilt die Änderung als Rückschritt und wird nicht übernommen."
 */
export function urteil(ergebnis: Vergleichsergebnis): string {
  if (ergebnis.verglichen === 0) {
    return "Kein Fall aus dem letzten Durchlauf war diesmal dabei — es gibt nichts zu vergleichen.";
  }

  if (ergebnis.rueckschritte.length === 0) {
    return ergebnis.besser > 0
      ? `Kein Rückschritt. ${ergebnis.besser} von ${ergebnis.verglichen} Fällen sind besser geworden.`
      : `Kein Rückschritt bei ${ergebnis.verglichen} Fällen.`;
  }

  return `RÜCKSCHRITT bei ${ergebnis.rueckschritte.length} von ${ergebnis.verglichen} Fällen. Die Änderung sollte nicht übernommen werden.`;
}
