import { uebrigePlatzhalter } from "@/lib/modell/pseudonymisierung";
import { angabenBelegt } from "./angaben";
import { nachDringlichkeit, type Befund } from "./typen";
import type { Kontextregel } from "@/lib/verfassen/kontext";

/**
 * Die maschinellen Prüfungen (`MODELL.md` §4).
 *
 * **Kein Modell, keine Kosten, laufen immer.** Deshalb sind sie die Schicht,
 * auf die Verlass ist: Sie kosten nichts, also gibt es keinen Grund, sie
 * jemals wegzulassen.
 *
 * Bewusst eine reine Funktion ohne Datenbank- und Netzzugriff — sie ist
 * damit vollständig testbar, und das ist bei der Zahlenprüfung nicht
 * Bequemlichkeit, sondern Notwendigkeit.
 */

export type PruefAngaben = {
  /** Der Entwurf, den das Modell geliefert hat. */
  entwurf: string;
  /**
   * Woraus jede Zahl und jedes Datum stammen darf: ihre Stichworte, die
   * eingegangene Kundenmail, bestätigte Fakten aus der Akte, Textbausteine,
   * Dokumentauszüge.
   *
   * **Frühere Mails gehören ausdrücklich nicht dazu.** Sie stehen zwar im
   * Kontext, aber als Tonbeispiel — Zahlen darin gehören zu anderen
   * Vorgängen. Ließe man sie als Beleg gelten, wäre der Preis aus einem
   * Angebot vom März plötzlich für jede spätere Mail gedeckt. Das ist genau
   * die Sorte Fehler, die diese Prüfung verhindern soll.
   */
  quellen: string[];
  /** Aktive Stilregeln, aus denen die `vermeiden`-Muster kommen. */
  regeln: Kontextregel[];
};

/** Länger als das ist eine Kundenmail nur mit gutem Grund (`MODELL.md` §4). */
const WORTGRENZE = 250;

export function pruefen(angaben: PruefAngaben): Befund[] {
  const { entwurf, quellen, regeln } = angaben;

  return nachDringlichkeit([
    ...erfundeneAngaben(entwurf, quellen),
    ...pseudonymreste(entwurf),
    ...verboteneFormulierungen(entwurf, regeln),
    ...aufbau(entwurf),
    ...luecken(entwurf),
    ...laenge(entwurf),
  ]);
}

/* ------------------------------------------------------------------------ */

/**
 * Die wichtigste Prüfung von allen. Ein falscher Preis in einer Kundenmail
 * ist der einzige Fehler in diesem Projekt, der echten Schaden anrichten
 * kann.
 *
 * Deshalb **kein stiller Neuversuch**: Die Stelle wird ihr markiert. Ein
 * automatisch korrigierter falscher Preis wäre immer noch falsch, nur nicht
 * mehr sichtbar.
 */
function erfundeneAngaben(entwurf: string, quellen: string[]): Befund[] {
  const offen = angabenBelegt(entwurf, quellen);
  if (offen.length === 0) return [];

  const woerter = offen.map((a) => a.wortlaut);

  return [
    {
      art: "erfundene-angabe",
      folge: "markieren",
      text:
        offen.length === 1
          ? `„${woerter[0]}" stand nirgends — bitte prüf diese Angabe, bevor du die Mail abschickst.`
          : `Diese Angaben standen nirgends: ${woerter.map((w) => `„${w}"`).join(", ")}. Bitte prüf sie, bevor du die Mail abschickst.`,
      stellen: woerter,
    },
  ];
}

/**
 * Ein Pseudonym, das die Rückersetzung überlebt hat, stünde in der Mail an
 * den Kunden — der peinlichste mögliche Fehler dieser App.
 */
function pseudonymreste(entwurf: string): Befund[] {
  const uebrig = uebrigePlatzhalter(entwurf);
  if (uebrig.length === 0) return [];

  return [
    {
      art: "pseudonym-rest",
      folge: "markieren",
      text:
        "In der Mail steht noch ein Platzhalter statt eines Namens. Bitte schau drüber, bevor du sie abschickst.",
      stellen: uebrig,
    },
  ];
}

/**
 * `vermeiden`-Regeln mit Suchmuster. Das ist die doppelte Absicherung neben
 * der Anweisung an das Modell: Die Anweisung kann überlesen werden, das
 * Muster nicht.
 */
function verboteneFormulierungen(
  entwurf: string,
  regeln: Kontextregel[],
): Befund[] {
  const verletzt: { regel: string; stelle: string }[] = [];

  for (const regel of regeln) {
    if (regel.art !== "vermeiden" || !regel.muster) continue;

    /* Die Muster stammen aus ihrer eigenen Regelverwaltung, nicht von
       außen. Trotzdem eingepackt und begrenzt: Ein Ausdruck mit einem
       Tippfehler wirft beim Übersetzen, und ein sehr langer könnte die
       Suche über Gebühr beschäftigen. Beides darf eine fertige Mail nicht
       aufhalten — im Zweifel fällt die Prüfung für diese eine Regel aus,
       die Anweisung an das Modell wirkt weiterhin. */
    if (regel.muster.length > 200) continue;

    try {
      const treffer = entwurf.match(new RegExp(regel.muster, "i"));
      if (treffer) verletzt.push({ regel: regel.text, stelle: treffer[0] });
    } catch {
      continue;
    }
  }

  if (verletzt.length === 0) return [];

  return [
    {
      art: "verbotene-formulierung",
      folge: "neuversuch",
      text: `Da steht etwas, das du nicht haben wolltest: ${verletzt
        .map((v) => `„${v.stelle}"`)
        .join(", ")}.`,
      stellen: verletzt.map((v) => v.stelle),
    },
  ];
}

/** Anrede, Hauptteil, Grußformel. */
const ANREDE = /^\s*(sehr geehrte|hallo|guten (tag|morgen|abend)|liebe)/i;
const GRUSS =
  /(mit freundlichen grüßen|viele grüße|beste grüße|herzliche grüße|freundliche grüße|liebe grüße|mit besten grüßen)/i;

function aufbau(entwurf: string): Befund[] {
  const text = entwurf.trim();
  if (!text) return [];

  const fehlt: string[] = [];
  if (!ANREDE.test(text)) fehlt.push("die Anrede");
  if (!GRUSS.test(text)) fehlt.push("die Grußformel");

  if (fehlt.length === 0) return [];

  return [
    {
      art: "unvollstaendig",
      folge: "neuversuch",
      text: `In der Mail fehlt ${fehlt.join(" und ")}.`,
      stellen: [],
    },
  ];
}

/**
 * Eine Lücke `[…]` ist **kein Fehler, sondern gewollt**: Das Modell soll
 * lieber eine Lücke lassen, als etwas zu erfinden. Sie wird hervorgehoben,
 * damit sie ausgefüllt wird — aber nichts wird deswegen neu geschrieben.
 */
function luecken(entwurf: string): Befund[] {
  /* Pseudonyme sind auch eckige Klammern, gehören aber zum Befund oben. */
  const alle = [...entwurf.matchAll(/\[[^\]\n]{1,60}\]/g)]
    .map((t) => t[0])
    .filter((t) => !/^\[(?:KUNDE|PERSON)_\d+\]$/.test(t) && t !== "[ICH]");

  if (alle.length === 0) return [];

  const einmalig = [...new Set(alle)];

  return [
    {
      art: "luecke",
      folge: "hinweis",
      text:
        einmalig.length === 1
          ? `Eine Stelle habe ich offen gelassen: ${einmalig[0]}. Die kannst nur du füllen.`
          : `Ein paar Stellen habe ich offen gelassen: ${einmalig.join(", ")}. Die kannst nur du füllen.`,
      stellen: einmalig,
    },
  ];
}

function laenge(entwurf: string): Befund[] {
  const woerter = entwurf.trim().split(/\s+/).filter(Boolean).length;
  if (woerter <= WORTGRENZE) return [];

  return [
    {
      art: "laenge",
      folge: "hinweis",
      text: `Die Mail ist mit ${woerter} Wörtern ziemlich lang geraten.`,
      stellen: [],
    },
  ];
}

/**
 * Der Zusatz für den einen erlaubten Neuversuch. Er benennt, was schiefging —
 * ein bloßes „nochmal" würde dasselbe Ergebnis liefern.
 */
export function neuversuchHinweis(befunde: Befund[]): string | null {
  const zuBeheben = befunde.filter((b) => b.folge === "neuversuch");
  if (zuBeheben.length === 0) return null;

  return [
    "Der vorige Entwurf hatte diese Mängel. Schreibe die Mail neu und behebe sie:",
    ...zuBeheben.map((b) => `- ${b.text}`),
    "Ändere sonst nichts am Inhalt. Erfinde keine Zahlen und keine Termine.",
  ].join("\n");
}
