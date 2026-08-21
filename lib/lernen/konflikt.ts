import type { Regel } from "@/lib/db/regeln";

/**
 * Konflikterkennung zwischen Stilregeln (`PLAN.md` §6, Phase 8).
 *
 * **Warum das nötig ist:** Regeln sammeln sich über Monate an. Irgendwann
 * steht „Nie ‚Mit freundlichen Grüßen'" neben „Immer ‚Mit freundlichen
 * Grüßen'" — die eine im Januar gesetzt, die andere im Juni. Das Modell
 * bekommt dann zwei einander ausschließende Vorgaben und befolgt eine davon
 * nach Zufall. Für sie sieht das aus, als hielte die App sich mal an ihre
 * Anweisung und mal nicht — und das untergräbt genau die Zusage, auf der
 * alles steht.
 *
 * Aufgelöst wird nichts automatisch. Sie sieht den Widerspruch und
 * entscheidet; die App weiß nicht, welche der beiden Regeln die jüngere
 * Absicht ist.
 */

export type Konflikt = {
  a: Regel;
  b: Regel;
  /** Der Satz, den sie liest. */
  text: string;
};

/** Wörter, die dieselbe Sache verbieten bzw. verlangen. */
const VERBOT = /\b(nie|niemals|kein|keine|nicht|vermeide|weglassen|streich)\b/i;
const GEBOT = /\b(immer|stets|bitte|verwende|nimm|benutze|schreib)\b/i;

/**
 * Der inhaltliche Kern einer Regel: das, worüber sie etwas sagt.
 *
 * Anführungszeichen sind das verlässlichste Signal — „Nie ‚Mit freundlichen
 * Grüßen'" und „Immer ‚Mit freundlichen Grüßen'" streiten erkennbar über
 * dieselbe Formulierung. Ohne Anführungszeichen bleiben die bedeutungstragenden
 * Wörter.
 */
function kern(regel: string): string {
  const zitat = regel.match(/[„"'‚»]([^"'“‘«]{3,})[""'‘«]/);
  if (zitat?.[1]) return zitat[1].toLowerCase().trim();

  return regel
    .toLowerCase()
    .replace(VERBOT, " ")
    .replace(GEBOT, " ")
    .replace(/[^\wäöüß ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .sort()
    .join(" ");
}

function richtung(regel: Regel): "verbot" | "gebot" | "unklar" {
  if (regel.art === "vermeiden") return "verbot";
  if (regel.art === "bevorzugen") return "gebot";
  if (VERBOT.test(regel.text)) return "verbot";
  if (GEBOT.test(regel.text)) return "gebot";
  return "unklar";
}

/**
 * Findet Paare aktiver Regeln, die über dieselbe Sache das Gegenteil sagen.
 *
 * Geprüft werden nur **aktive** Regeln und nur solche, die im selben
 * Geltungsbereich liegen: Eine kundenspezifische Regel *darf* einer globalen
 * widersprechen — sie überschreibt sie, das ist so gewollt (`PLAN.md` §4).
 * Ein Widerspruch ist es erst, wenn beide gleich weit gelten.
 */
export function konflikteFinden(regeln: Regel[]): Konflikt[] {
  const aktiv = regeln.filter((r) => r.status === "aktiv");
  const gefunden: Konflikt[] = [];

  for (let i = 0; i < aktiv.length; i++) {
    for (let j = i + 1; j < aktiv.length; j++) {
      const a = aktiv[i]!;
      const b = aktiv[j]!;

      if (a.kundeId !== b.kundeId) continue;

      const kernA = kern(a.text);
      const kernB = kern(b.text);
      if (!kernA || kernA !== kernB) continue;

      const richtungA = richtung(a);
      const richtungB = richtung(b);

      if (
        richtungA === "unklar" ||
        richtungB === "unklar" ||
        richtungA === richtungB
      ) {
        continue;
      }

      gefunden.push({
        a,
        b,
        text: `Diese beiden Regeln widersprechen sich: „${a.text}" und „${b.text}". Welche soll gelten?`,
      });
    }
  }

  return gefunden;
}
