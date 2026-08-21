import { describe, expect, it } from "vitest";
import { kostenBerechnen } from "./preise";

/**
 * Kostenrechnerei versagt still: Die App läuft weiter, nur zeigt sie eine
 * Zahl, die mit der Rechnung nichts zu tun hat. Und eine Anzeige, der man
 * nicht trauen kann, wird ignoriert — dann ist die Warnschwelle wertlos.
 */

const LARGE = "mistral-large-2512";
const SMALL = "mistral-small-2603";

describe("kostenBerechnen", () => {
  it("rechnet Eingabe und Ausgabe getrennt ab", () => {
    /* Large: 2 $/Mio ein, 6 $/Mio aus, Kurs 0,92.
       1 Mio ein + 1 Mio aus = (2 + 6) * 0,92 = 7,36 € */
    expect(kostenBerechnen(LARGE, 1_000_000, 1_000_000)).toBeCloseTo(7.36, 4);
  });

  it("berechnet gecachte Token zum Bruchteil", () => {
    /* Der Kern der Sache: 272 von 312 Token kamen im Versuch aus dem
       Zwischenspeicher. Ohne diesen Faktor läge die Anzeige dauerhaft
       deutlich über der Rechnung. */
    const ohne = kostenBerechnen(LARGE, 1_000_000, 0);
    const mitCache = kostenBerechnen(LARGE, 1_000_000, 0, 1_000_000);

    expect(mitCache).toBeCloseTo(ohne * 0.1, 6);
  });

  it("zieht gecachte Token von den vollen ab, statt sie doppelt zu zählen", () => {
    /* 1000 Token, davon 800 gecacht: 200 voll + 800 zum Zehntel. */
    const preisJeToken = kostenBerechnen(LARGE, 1, 0);
    const erwartet = preisJeToken * 200 + preisJeToken * 800 * 0.1;

    expect(kostenBerechnen(LARGE, 1000, 0, 800)).toBeCloseTo(erwartet, 10);
  });

  it("wird nie negativ, auch bei unsinnigen Angaben", () => {
    /* Meldete der Dienst je mehr gecachte als gesamte Token, wäre eine
       negative Rechnung das falsche Ergebnis. */
    expect(kostenBerechnen(LARGE, 100, 0, 500)).toBeGreaterThanOrEqual(0);
  });

  it("ist ohne Zwischenspeicher unverändert", () => {
    /* Der neue Parameter darf die bisherige Rechnung nicht verschieben. */
    expect(kostenBerechnen(SMALL, 5000, 2000, 0)).toBeCloseTo(
      kostenBerechnen(SMALL, 5000, 2000),
      10,
    );
  });

  it("gibt bei unbekanntem Modell null zurück statt zu raten", () => {
    /* Lieber eine Lücke in der Anzeige als eine erfundene Zahl, die nach
       Gewissheit aussieht. */
    expect(kostenBerechnen("gibt-es-nicht", 1_000_000, 1_000_000)).toBe(0);
  });

  it("macht das kleine Modell deutlich billiger als das große", () => {
    /* Das ist die Kostensteuerung aus MODELL.md §1 -- wenn die Rechnung das
       nicht abbildet, stimmt an den Preisen etwas nicht. */
    expect(kostenBerechnen(SMALL, 1_000_000, 1_000_000)).toBeLessThan(
      kostenBerechnen(LARGE, 1_000_000, 1_000_000) / 5,
    );
  });
});
