import "server-only";
import { einordnen } from "@/lib/modell";
import { regelVorschlagen } from "@/lib/db/regeln";
import type { Regel } from "@/lib/db/regeln";
import { aenderungenFinden, lohntAbleitung, type Aenderung } from "./vergleich";

/**
 * Regelableitung aus ihren eigenen Bearbeitungen (`PLAN.md` §4, Weg 2).
 *
 * **Ableiten ja, stillschweigend übernehmen nie.** Ableitung aus
 * Textänderungen rät zwangsläufig. Wenn die App still das Falsche lernt,
 * verschlechtert sie sich mit jedem Tag, und die Nutzerin versteht nicht,
 * warum. Deshalb endet dieser Weg immer bei einer Frage, nie bei einer
 * Tatsache.
 *
 * Das ist zugleich die Absicherung für den Fall, dass Weg 2 sich als zu
 * fehleranfällig erweist: Er lässt sich abschalten, ohne dass die
 * Korrekturschleife ausfällt — Weg 1 trägt sie dann allein.
 */

/** Ein Vorschlag, den sie beantworten soll. */
export type Regelvorschlag = {
  /** Der Satz, den sie liest: was beobachtet wurde. */
  beobachtung: string;
  /** Die Frage dazu. */
  frage: string;
  /** Der Regeltext, der bei „Ja" gespeichert wird. */
  regel: string;
  /** Optionales Suchmuster für die maschinelle Prüfung. */
  muster: string | null;
};

export type AbleitungAngaben = {
  nutzerId: string;
  vorher: string;
  nachher: string;
  kundeId?: string | null;
  /** Was schon aktiv oder abgelehnt ist — dazu wird nicht erneut gefragt. */
  bekannt: Regel[];
  abbruch?: AbortSignal;
};

export async function regelAbleiten(
  angaben: AbleitungAngaben,
): Promise<Regelvorschlag | null> {
  const aenderungen = aenderungenFinden(angaben.vorher, angaben.nachher);

  /* Kein Modellaufruf für einen Tippfehler. */
  if (!lohntAbleitung(aenderungen)) return null;

  try {
    const antwort = await einordnen({
      zweck: "regel-ableiten",
      nutzerId: angaben.nutzerId,
      hoechstlaenge: 200,
      abbruch: angaben.abbruch,
      nachrichten: [
        {
          rolle: "system",
          inhalt: [
            "Eine Bürokraft hat einen Mailentwurf überarbeitet. Du bekommst die geänderten Stellen.",
            "",
            "Steckt darin eine wiederkehrende Stilregel — also etwas, das sie künftig immer so haben will?",
            "",
            "Antworte mit genau einer Zeile:",
            "REGEL: <die Regel in einem kurzen deutschen Satz, aus ihrer Sicht formuliert>",
            "",
            "Antworte mit einem Bindestrich, wenn es sich nur um eine inhaltliche Änderung,",
            "einen Tippfehler oder eine einmalige Umformulierung handelt.",
            "Rate nicht. Im Zweifel: Bindestrich.",
          ].join("\n"),
        },
        {
          rolle: "nutzer",
          inhalt: aenderungen
            .slice(0, 8)
            .map(
              (a) =>
                `Vorher: ${a.vorher || "(nichts)"}\nNachher: ${a.nachher || "(gestrichen)"}`,
            )
            .join("\n\n"),
        },
      ],
    });

    const regel = antwort.text
      .split("\n")
      .map((z) => z.trim())
      .find((z) => z.toUpperCase().startsWith("REGEL:"))
      ?.slice(6)
      .trim();

    if (!regel || regel === "-") return null;

    /* Wonach sie schon einmal gefragt wurde, wird nicht erneut gefragt —
       weder bei einem Ja noch bei einem Nein. Ein Nein muss ein Nein
       bleiben, sonst ist die Rückfrage eine Belästigung. */
    if (schonBekannt(regel, angaben.bekannt)) return null;

    const muster = musterAusAenderungen(aenderungen);

    /* Als Vorschlag ablegen. Er wirkt nicht — bis sie Ja sagt. */
    await regelVorschlagen({
      nutzerId: angaben.nutzerId,
      text: regel,
      kundeId: null,
      muster,
    });

    return {
      beobachtung: beobachtungssatz(aenderungen),
      frage: "Soll ich mir das merken?",
      regel,
      muster,
    };
  } catch {
    /* Die Ableitung ist ein Zusatz. Fällt sie aus, ist ihre Bearbeitung
       trotzdem übernommen — das ist der Teil, der zählt. */
    return null;
  }
}

/* ------------------------------------------------------------------------ */

function normal(text: string): string {
  return text.toLowerCase().replace(/[^\wäöüß ]/g, "").replace(/\s+/g, " ").trim();
}

function schonBekannt(regel: string, bekannt: Regel[]): boolean {
  const gesucht = normal(regel);
  return bekannt.some((r) => normal(r.text) === gesucht);
}

/**
 * Der Satz, den sie liest — nah am Beispiel aus `PLAN.md` §4:
 * *„Du hast ‚mit freundlichen Grüßen' durch ‚Viele Grüße' ersetzt."*
 *
 * Ein Beispiel überzeugt mehr als eine abstrakte Regel: Sie kann sofort
 * beurteilen, ob die App das Richtige verstanden hat.
 */
function beobachtungssatz(aenderungen: Aenderung[]): string {
  const ersetzt = aenderungen.find(
    (a) => a.vorher.trim() && a.nachher.trim(),
  );

  if (!ersetzt) return "Du hast am Text etwas geändert.";

  return `Du hast „${kurz(ersetzt.vorher)}" durch „${kurz(ersetzt.nachher)}" ersetzt.`;
}

function kurz(text: string): string {
  const eine = text.replace(/\s+/g, " ").trim();
  return eine.length > 60 ? `${eine.slice(0, 60)} …` : eine;
}

/**
 * Ein Suchmuster nur, wenn die gestrichene Stelle kurz und eindeutig ist.
 *
 * Ein Muster aus einem ganzen Absatz würde nie wieder treffen und stünde
 * bloß als toter Eintrag in der Datenbank. Lieber gar keins: Die Regel wirkt
 * dann über die Anweisung an das Modell, nur eben ohne die zweite
 * Absicherung.
 */
function musterAusAenderungen(aenderungen: Aenderung[]): string | null {
  const gestrichen = aenderungen
    .map((a) => a.vorher.trim())
    .filter((v) => v.length > 3 && v.length <= 40);

  const erstes = gestrichen[0];
  if (!erstes) return null;

  return erstes.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
