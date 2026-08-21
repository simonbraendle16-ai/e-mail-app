import { describe, expect, it } from "vitest";
import { brauchbar } from "./verdichten";

/**
 * Die Gegenprobe der Verdichtung.
 *
 * Sie ist die letzte Instanz vor einer Änderung, die **niemand mehr
 * kontrolliert**: Der Lauf passiert nachts, sie merkt nichts davon, und das
 * Ergebnis ersetzt dauerhaft den Wortlaut im Gedächtnis der App. Was hier
 * durchrutscht, bleibt.
 */

const GUT = `Kunde fragte nach dem Liefertermin einer Nachbestellung.
Ton: freundlich, geschäftlich, kurze Sätze.
Typisch: „Viele Grüße" statt „Mit freundlichen Grüßen".
Gelernt: möchte Lieferungen früh in der Woche.`;

describe("brauchbar", () => {
  it("lässt eine saubere Verdichtung durch", () => {
    expect(brauchbar(GUT)).toBe(true);
  });

  it("weist einen übriggebliebenen Platzhalter ab", () => {
    /* Die Rückersetzung hat versagt — „[KUNDE_1]" stünde sonst dauerhaft
       in der Akte, und niemand würde es je bemerken. */
    expect(brauchbar(GUT.replace("Kunde", "[KUNDE_1]"))).toBe(false);
  });

  it("weist einen Betrag ab", () => {
    expect(brauchbar(`${GUT}\nPreis lag bei 9,80 EUR je Kilo.`)).toBe(false);
  });

  it("weist eine Menge ab", () => {
    expect(brauchbar(`${GUT}\nEs ging um 200 Laib.`)).toBe(false);
  });

  it("weist ein konkretes Datum ab", () => {
    expect(brauchbar(`${GUT}\nGeliefert wurde am 13.03.2026.`)).toBe(false);
  });

  it("weist einen leeren oder zu kurzen Text ab", () => {
    expect(brauchbar("")).toBe(false);
    expect(brauchbar("Kurz.")).toBe(false);
  });

  it("stört sich nicht an harmlosen Zahlen im Fließtext", () => {
    /* „früh in der Woche" darf nicht daran scheitern, dass irgendwo eine
       Ziffer steht — sonst würde nie etwas verdichtet. */
    expect(brauchbar(`${GUT}\nDer Kunde meldet sich meist 2 Mal im Quartal.`)).toBe(
      true,
    );
  });
});
