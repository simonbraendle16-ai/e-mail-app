import { angabenLesen } from "@/lib/pruefungen/angaben";

/**
 * Der Vergleichsschritt hinter der Rückübersetzung (`MODELL.md` §3b,
 * Skill `rueckuebersetzung`).
 *
 * **Warum es diesen Schritt überhaupt gibt:** Sie braucht die App, *weil* sie
 * das Fach-Englisch nicht sicher beurteilen kann — also kann sie das Ergebnis
 * auch nicht prüfen. Die Terminologiekontrolle prüft Begriffe, nicht Sinn:
 * „we can deliver" statt „we could deliver" besteht jede Glossarprüfung und
 * ändert trotzdem die Zusage.
 *
 * Die Rückübersetzung allein reicht dafür nicht. Nebeneinander gestellte Texte
 * liest man großzügig; eine verschobene Zusage übersieht man dabei zuverlässig.
 * Deshalb wird **maschinell** verglichen, und zwar nur an den drei Stellen, an
 * denen eine Abweichung wirklich etwas ändert: Zusagen, Verneinungen, Zahlen.
 *
 * **Bewusst nur diese drei.** Ein allgemeiner Textvergleich würde bei jeder
 * Übersetzung anschlagen — sie *soll* anders formuliert sein. Nur wo sich die
 * Aussage ändert, ist eine Meldung berechtigt.
 */

export type Abweichungsart = "zusage" | "verneinung" | "zahl";

export type Abweichung = {
  art: Abweichungsart;
  /** Was sie liest. */
  text: string;
  /** Stellen in der Rückübersetzung, die hervorgehoben werden. */
  stellen: string[];
};

/**
 * Zusagen. Der Unterschied zwischen fest und weich ist der ganze Punkt:
 * „wir können liefern" ist eine Zusage, „wir könnten liefern" ist keine.
 */
const ZUSAGEN = [
  {
    name: "können",
    fest: /\b(kann|kannst|können|könnt)\b/gi,
    weich: /\b(könnte|könnten|könntest|könntet)\b/gi,
  },
  {
    name: "werden",
    fest: /\b(wird|werde|werden|wirst|werdet)\b/gi,
    weich: /\b(würde|würden|würdest|würdet)\b/gi,
  },
  {
    name: "müssen",
    fest: /\b(muss|musst|müssen|müsst)\b/gi,
    weich: /\b(müsste|müssten|müsstest|müsstet)\b/gi,
  },
  {
    name: "sollen",
    fest: /\b(soll|sollst|sollen|sollt)\b/gi,
    weich: /\b(sollte|sollten|solltest|solltet)\b/gi,
  },
] as const;

const VERNEINUNG = /\b(nicht|kein|keine|keinen|keiner|keinem|keines|nie|niemals|ohne)\b/gi;

function treffer(text: string, muster: RegExp): string[] {
  return [...text.matchAll(new RegExp(muster.source, muster.flags))].map(
    (t) => t[0],
  );
}

/**
 * Vergleicht das deutsche Original mit der Rückübersetzung.
 *
 * Verglichen wird die **Anzahl** je Kategorie, nicht die Position. Die
 * Wortstellung ändert sich beim Übersetzen zwangsläufig; wie oft eine feste
 * Zusage vorkommt, sollte sich dagegen nicht ändern.
 */
export function abweichungenFinden(
  original: string,
  rueckuebersetzung: string,
): Abweichung[] {
  const gefunden: Abweichung[] = [];

  /* --- Zusagen --------------------------------------------------------- */
  for (const zusage of ZUSAGEN) {
    const festVor = treffer(original, zusage.fest).length;
    const festNach = treffer(rueckuebersetzung, zusage.fest).length;
    const weichVor = treffer(original, zusage.weich).length;
    const weichNach = treffer(rueckuebersetzung, zusage.weich).length;

    if (festVor === festNach && weichVor === weichNach) continue;

    /* Aus fest wurde weich: die Zusage ist auf dem Weg ins Englische
       schwächer geworden. Der umgekehrte Fall ist der gefährlichere — dann
       verspricht die englische Mail mehr, als sie sagen wollte. */
    const staerker = festNach > festVor;

    gefunden.push({
      art: "zusage",
      text: staerker
        ? `Im Englischen klingt die Zusage mit „${zusage.name}" verbindlicher als in deinem deutschen Text. Schau bitte, ob du das so sagen willst.`
        : `Die Zusage mit „${zusage.name}" klingt im Englischen zurückhaltender als bei dir. Schau bitte, ob das noch passt.`,
      stellen: staerker
        ? treffer(rueckuebersetzung, zusage.fest)
        : treffer(rueckuebersetzung, zusage.weich),
    });
  }

  /* --- Verneinungen ---------------------------------------------------- */
  const verneinungVor = treffer(original, VERNEINUNG);
  const verneinungNach = treffer(rueckuebersetzung, VERNEINUNG);

  if (verneinungVor.length !== verneinungNach.length) {
    /* Eine verlorene oder hinzugekommene Verneinung dreht die Aussage um.
       Von allen Übersetzungsfehlern ist das der folgenreichste. */
    gefunden.push({
      art: "verneinung",
      text:
        verneinungNach.length < verneinungVor.length
          ? "In der englischen Fassung fehlt eine Verneinung, die bei dir steht. Bitte lies die Stelle genau."
          : "In der englischen Fassung steht eine Verneinung mehr als bei dir. Bitte lies die Stelle genau.",
      stellen: verneinungNach,
    });
  }

  /* --- Zahlen ---------------------------------------------------------- */
  const vor = new Set(angabenLesen(original).map((a) => a.normal));
  const nachAngaben = angabenLesen(rueckuebersetzung);
  const nach = new Set(nachAngaben.map((a) => a.normal));

  const verloren = [...vor].filter((n) => !nach.has(n));
  const dazu = nachAngaben.filter((a) => !vor.has(a.normal));

  if (verloren.length > 0 || dazu.length > 0) {
    gefunden.push({
      art: "zahl",
      text:
        dazu.length > 0
          ? `In der englischen Fassung steht eine Angabe, die bei dir nicht vorkommt: ${dazu
              .map((a) => `„${a.wortlaut}"`)
              .join(", ")}.`
          : "Eine Zahl oder ein Datum aus deinem Text taucht in der englischen Fassung nicht auf.",
      stellen: dazu.map((a) => a.wortlaut),
    });
  }

  return gefunden;
}
