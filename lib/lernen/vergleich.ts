/**
 * Satzweiser Vergleich zweier Fassungen (`PLAN.md` §4, Weg 2).
 *
 * **Kein Modell.** Was sie geändert hat, ist eine Tatsache und muss nicht
 * geraten werden. Geraten wird erst im nächsten Schritt — ob hinter den
 * Änderungen eine *Regel* steckt —, und dafür ist es entscheidend, dass die
 * Änderungen selbst sauber vorliegen.
 *
 * > „Änderungen werden gesammelt, nicht sofort gedeutet."
 */

export type Aenderung = {
  vorher: string;
  nachher: string;
};

/**
 * Zerlegt in Sätze. Grob, aber ausreichend: Es geht darum, Änderungen
 * zuzuordnen, nicht um Grammatik. Zeilenumbrüche zählen als Grenze, damit
 * Anrede und Grußformel eigene Einheiten bleiben — genau dort sitzen die
 * meisten ihrer Korrekturen.
 */
export function inSaetze(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normal(satz: string): string {
  return satz.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Was sich zwischen zwei Fassungen geändert hat.
 *
 * Sätze, die unverändert blieben, fallen heraus — auch wenn sie ihre Stelle
 * gewechselt haben. Eine Umstellung ist keine Stilkorrektur, und sie als
 * solche zu melden würde die Regelableitung mit Rauschen füttern.
 *
 * Der Abgleich läuft über die längste gemeinsame Teilfolge. Ein einfacher
 * Zeilenvergleich würde nach einem eingefügten Satz alles Folgende als
 * geändert melden — und aus dieser Flut ließe sich keine Regel mehr
 * herauslesen.
 */
export function aenderungenFinden(
  vorher: string,
  nachher: string,
): Aenderung[] {
  const alt = inSaetze(vorher);
  const neu = inSaetze(nachher);

  const gemeinsam = laengsteTeilfolge(alt.map(normal), neu.map(normal));

  const aenderungen: Aenderung[] = [];
  let i = 0;
  let j = 0;

  for (const treffer of [...gemeinsam, null]) {
    const bisAlt = treffer ? treffer.alt : alt.length;
    const bisNeu = treffer ? treffer.neu : neu.length;

    const entfernt = alt.slice(i, bisAlt);
    const ergaenzt = neu.slice(j, bisNeu);

    if (entfernt.length > 0 || ergaenzt.length > 0) {
      aenderungen.push({
        vorher: entfernt.join(" "),
        nachher: ergaenzt.join(" "),
      });
    }

    i = bisAlt + 1;
    j = bisNeu + 1;
  }

  return aenderungen;
}

/** Positionen der längsten gemeinsamen Teilfolge. */
function laengsteTeilfolge(
  alt: string[],
  neu: string[],
): { alt: number; neu: number }[] {
  const tabelle: number[][] = Array.from({ length: alt.length + 1 }, () =>
    new Array<number>(neu.length + 1).fill(0),
  );

  for (let i = alt.length - 1; i >= 0; i--) {
    for (let j = neu.length - 1; j >= 0; j--) {
      tabelle[i]![j]! =
        alt[i] === neu[j]
          ? tabelle[i + 1]![j + 1]! + 1
          : Math.max(tabelle[i + 1]![j]!, tabelle[i]![j + 1]!);
    }
  }

  const wege: { alt: number; neu: number }[] = [];
  let i = 0;
  let j = 0;

  while (i < alt.length && j < neu.length) {
    if (alt[i] === neu[j]) {
      wege.push({ alt: i, neu: j });
      i++;
      j++;
    } else if (tabelle[i + 1]![j]! >= tabelle[i]![j + 1]!) {
      i++;
    } else {
      j++;
    }
  }

  return wege;
}

/**
 * Lohnt sich die Ableitung überhaupt?
 *
 * Ein Modellaufruf für jeden Tippfehler wäre Geldverbrennung — und ein
 * Regelvorschlag für einen Tippfehler wäre Unsinn. Deshalb: nur wenn
 * überhaupt etwas ersetzt wurde und die Änderung mehr ist als ein
 * korrigierter Buchstabe.
 */
export function lohntAbleitung(aenderungen: Aenderung[]): boolean {
  return aenderungen.some(
    (a) =>
      a.vorher.trim().length > 3 &&
      a.nachher.trim().length > 0 &&
      normal(a.vorher) !== normal(a.nachher),
  );
}
