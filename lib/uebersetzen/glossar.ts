import type { Glossareintrag } from "@/lib/db/glossar";

/**
 * Glossarabgleich und Terminologie-Nachkontrolle (`MODELL.md` §3 und §4,
 * Skill `uebersetzer`).
 *
 * **Exakter Zeichenkettenabgleich, keine Ähnlichkeitssuche.** Das steht so in
 * der Spezifikation und ist keine Bequemlichkeit: Terminologie darf nicht
 * geraten werden. Eine Ähnlichkeitssuche würde „Bergkäse" auf „Hartkäse"
 * ziehen, und dann steht in einer Kundenmail ein Produkt, das nie gemeint war.
 *
 * Groß- und Kleinschreibung zählt dabei nicht — am Satzanfang steht derselbe
 * Begriff groß —, alles andere schon.
 */

/** Für den regulären Ausdruck entschärfen. */
function entschaerft(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Endungen, die ein Begriff im Satz annimmt, ohne ein anderer Begriff zu
 * werden — „wheel" wird zu „wheels", „Laib" zu „Laibe" oder „Laiben".
 *
 * **Warum das nötig ist:** Ein Glossareintrag steht in der Grundform, im
 * Fließtext steht er gebeugt. Ohne diese Endungen meldete die Nachkontrolle
 * „mountain cheese fehlt", obwohl „mountain cheeses" dasteht — und nach dem
 * zweiten solchen Fehlalarm glaubt sie der Prüfung nicht mehr.
 *
 * Bewusst nur ein kurzer Anhang und keine echte Grammatik: Er deckt Plural
 * und Genitiv ab, ohne dass „Laib" jemals auf „Laibchen" trifft — dafür
 * müsste die Endung in der Liste stehen, und das tut sie nicht.
 */
const ENDUNGEN = "(?:e|en|er|es|s|n)?";

function begriffsMuster(begriff: string): RegExp {
  return new RegExp(`\\b${entschaerft(begriff)}${ENDUNGEN}\\b`, "i");
}

/**
 * Welche Glossarbegriffe im deutschen Text vorkommen.
 *
 * Die Wortgrenze verhindert, dass „Laib" in „Laibchen" trifft. Deutsche
 * Zusammensetzungen bleiben damit außen vor — das ist die richtige Seite des
 * Irrtums: einen Begriff nicht vorzuschreiben ist harmlos, einen falschen
 * vorzuschreiben nicht.
 */
export function begriffeImText(
  text: string,
  glossar: Glossareintrag[],
): Glossareintrag[] {
  return glossar.filter((eintrag) => {
    if (!eintrag.de.trim()) return false;
    return begriffsMuster(eintrag.de).test(text);
  });
}

/**
 * Die Zeilen, die als verbindliche Vorgabe in die Übersetzungsanweisung
 * gehen — **nur bestätigte Begriffe**. Ein Vorschlag, den sie nie gesehen
 * hat, darf dem Modell nicht als unverhandelbar verkauft werden.
 */
export function vorgabeZeilen(treffer: Glossareintrag[]): string[] {
  return treffer
    .filter((t) => t.verbindlich)
    .map((t) => `  ${t.de} → ${t.en}`);
}

export type Glossarabweichung = {
  de: string;
  en: string;
};

/**
 * Die Terminologie-Nachkontrolle: Steht jeder vorgeschriebene Begriff auch
 * wirklich in der englischen Fassung?
 *
 * Das ist die Glossarprüfung aus `MODELL.md` §4 — die einzige der sechs
 * maschinellen Prüfungen, die im deutschen Verfassen nichts zu prüfen hatte
 * und deshalb erst hier entsteht. Sie kostet nichts: ein Zeichenkettenvergleich,
 * kein Modellaufruf.
 */
export function glossarAbweichungen(
  englisch: string,
  vorgeschrieben: Glossareintrag[],
): Glossarabweichung[] {
  return vorgeschrieben
    .filter((t) => t.verbindlich && t.en.trim())
    .filter((t) => !begriffsMuster(t.en).test(englisch))
    .map((t) => ({ de: t.de, en: t.en }));
}

/**
 * Der Zusatz für die eine gezielte Nachbesserung. Er nennt genau die
 * Begriffe, die fehlen — „übersetze nochmal" würde dasselbe Ergebnis liefern.
 */
export function nachbesserungHinweis(
  abweichungen: Glossarabweichung[],
): string | null {
  if (abweichungen.length === 0) return null;

  return [
    "In der Übersetzung fehlen verbindliche Fachbegriffe. Gib die Mail erneut aus und verwende genau diese Wörter:",
    ...abweichungen.map((a) => `- ${a.de} → ${a.en}`),
    "Ändere sonst nichts an der Übersetzung.",
  ].join("\n");
}
