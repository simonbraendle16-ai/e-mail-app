import { ModellFehler } from "./schnittstelle";

/**
 * Wiederholung mit wachsendem Abstand (`MODELL.md` §5).
 *
 * Drei Versuche bei Netzproblemen und Serverfehlern. Bei Ratenbegrenzung wird
 * gewartet, was der Dienst vorgibt — das ist kein Fehler, sondern eine Bitte
 * um Geduld.
 *
 * Was **nicht** wiederholt wird: ein falscher Schlüssel, eine kaputte Anfrage,
 * ein zu langer Text. Dreimal dieselbe Ablehnung einzuholen kostet nur Zeit
 * und verschleiert die Ursache.
 */

const VERSUCHE = 3;
const GRUNDWARTEZEIT_MS = 800;

/** Fehler, bei denen ein zweiter Versuch sinnvoll ist. */
function lohntWiederholung(status: number | undefined): boolean {
  if (status === undefined) return true; // Netzproblem, kein HTTP-Status
  if (status === 429) return true; // Ratenbegrenzung
  if (status >= 500) return true; // beim Dienst ging etwas schief
  if (status === 408) return true; // Zeitüberschreitung
  return false;
}

export class HttpFehler extends Error {
  constructor(
    readonly status: number,
    readonly rumpf: string,
    /** Sekunden, die der Dienst zu warten bittet. */
    readonly nachSekunden?: number,
  ) {
    super(`HTTP ${status}: ${rumpf.slice(0, 300)}`);
    this.name = "HttpFehler";
  }
}

function schlafen(ms: number, abbruch?: AbortSignal): Promise<void> {
  return new Promise((fertig, scheitern) => {
    if (abbruch?.aborted) return scheitern(new Error("abgebrochen"));
    const zeitgeber = setTimeout(fertig, ms);
    abbruch?.addEventListener(
      "abort",
      () => {
        clearTimeout(zeitgeber);
        scheitern(new Error("abgebrochen"));
      },
      { once: true },
    );
  });
}

export async function mitWiederholung<T>(
  was: () => Promise<T>,
  abbruch?: AbortSignal,
): Promise<T> {
  let letzterFehler: unknown;

  for (let versuch = 1; versuch <= VERSUCHE; versuch++) {
    try {
      return await was();
    } catch (fehler) {
      letzterFehler = fehler;

      if (abbruch?.aborted) throw fehler;

      const status = fehler instanceof HttpFehler ? fehler.status : undefined;
      if (!lohntWiederholung(status)) break;
      if (versuch === VERSUCHE) break;

      /* Bei Ratenbegrenzung sagt der Dienst selbst, wie lange er braucht.
         Dagegen anzurechnen wäre unhöflich und würde die Sperre verlängern. */
      const gewuenscht =
        fehler instanceof HttpFehler && fehler.nachSekunden
          ? fehler.nachSekunden * 1000
          : 0;

      /* Wachsender Abstand plus ein zufälliger Anteil: Ohne den treffen
         mehrere Wiederholungen exakt gleichzeitig wieder ein. */
      const wachsend =
        GRUNDWARTEZEIT_MS * 2 ** (versuch - 1) + Math.random() * 400;

      await schlafen(Math.max(gewuenscht, wachsend), abbruch);
    }
  }

  throw uebersetzeFehler(letzterFehler);
}

/**
 * Macht aus einem technischen Fehler einen Satz, den sie lesen kann.
 * Kein Code, kein Englisch, kein Stacktrace — und immer eine Anweisung,
 * was jetzt zu tun ist (`DESIGN.md` §7).
 */
export function uebersetzeFehler(fehler: unknown): ModellFehler {
  if (fehler instanceof ModellFehler) return fehler;

  const status = fehler instanceof HttpFehler ? fehler.status : undefined;
  const technisch = fehler instanceof Error ? fehler.message : String(fehler);

  if (status === 401 || status === 403) {
    return new ModellFehler(
      "Die Anmeldung beim Schreibdienst klemmt. Das muss einmal eingerichtet werden — sag deinem Sohn Bescheid.",
      technisch,
      fehler,
    );
  }

  if (status === 429) {
    return new ModellFehler(
      "Gerade ist viel los. Einen Moment noch, dann probier es nochmal.",
      technisch,
      fehler,
    );
  }

  if (status === 400 || status === 422) {
    return new ModellFehler(
      "Mit dem Text stimmt etwas nicht — vielleicht ist er zu lang. Kürze ihn und probier es nochmal.",
      technisch,
      fehler,
    );
  }

  return new ModellFehler(
    "Die Verbindung klemmt gerade. Dein Text ist gespeichert, probier es in einer Minute nochmal.",
    technisch,
    fehler,
  );
}
