import { describe, expect, it } from "vitest";
import { rueckschritteFinden, urteil, type Durchlauf } from "./vergleich";
import type { Befund } from "@/lib/pruefungen/typen";

function befund(teil: Partial<Befund>): Befund {
  return {
    art: "verbotene-formulierung",
    folge: "neuversuch",
    text: "Befund",
    stellen: [],
    ...teil,
  };
}

function durchlauf(
  ergebnisse: Durchlauf["ergebnisse"],
): Durchlauf {
  return {
    gelaufenAm: "2026-08-21T00:00:00.000Z",
    modell: "mistral",
    ergebnisse,
  };
}

const SAUBER = {
  mailId: "a",
  befunde: [] as Befund[],
  glossarLuecken: 0,
  woerter: 100,
};

describe("rueckschritteFinden", () => {
  it("meldet nichts, wenn sich nichts geändert hat", () => {
    const ergebnis = rueckschritteFinden(
      durchlauf([SAUBER]),
      durchlauf([SAUBER]),
    );
    expect(ergebnis.rueckschritte).toEqual([]);
    expect(ergebnis.verglichen).toBe(1);
  });

  it("meldet eine neu verletzte Regel", () => {
    const ergebnis = rueckschritteFinden(
      durchlauf([SAUBER]),
      durchlauf([{ ...SAUBER, befunde: [befund({})] }]),
    );

    expect(ergebnis.rueckschritte).toHaveLength(1);
    expect(ergebnis.rueckschritte[0]?.text).toContain("Regel");
  });

  it("hält eine schon vorher verletzte Regel nicht für einen Rückschritt", () => {
    /* Der Fall war schon kaputt. Ihn jeder Änderung anzulasten hiesse,
       dass nie wieder etwas durchginge. */
    const kaputt = { ...SAUBER, befunde: [befund({})] };
    const ergebnis = rueckschritteFinden(
      durchlauf([kaputt]),
      durchlauf([kaputt]),
    );
    expect(ergebnis.rueckschritte).toEqual([]);
  });

  it("meldet eine Längenabweichung über 40 %", () => {
    const ergebnis = rueckschritteFinden(
      durchlauf([SAUBER]),
      durchlauf([{ ...SAUBER, woerter: 160 }]),
    );
    expect(ergebnis.rueckschritte[0]?.text).toContain("Länge");
  });

  it("lässt eine kleinere Längenänderung durch", () => {
    const ergebnis = rueckschritteFinden(
      durchlauf([SAUBER]),
      durchlauf([{ ...SAUBER, woerter: 120 }]),
    );
    expect(ergebnis.rueckschritte).toEqual([]);
  });

  it("meldet zusätzlich fehlende Glossarbegriffe", () => {
    const ergebnis = rueckschritteFinden(
      durchlauf([SAUBER]),
      durchlauf([{ ...SAUBER, glossarLuecken: 2 }]),
    );
    expect(ergebnis.rueckschritte[0]?.text).toContain("Glossarbegriff");
  });

  it("zählt eine Verbesserung, ohne sie als Rückschritt zu werten", () => {
    const ergebnis = rueckschritteFinden(
      durchlauf([{ ...SAUBER, befunde: [befund({})] }]),
      durchlauf([SAUBER]),
    );
    expect(ergebnis.rueckschritte).toEqual([]);
    expect(ergebnis.besser).toBe(1);
  });

  it("ignoriert reine Hinweise", () => {
    /* Eine Lücke ist gewollt, kein Mangel. */
    const ergebnis = rueckschritteFinden(
      durchlauf([SAUBER]),
      durchlauf([
        { ...SAUBER, befunde: [befund({ art: "luecke", folge: "hinweis" })] },
      ]),
    );
    expect(ergebnis.rueckschritte).toEqual([]);
  });

  it("vergleicht nur Fälle, die in beiden Durchläufen vorkommen", () => {
    const ergebnis = rueckschritteFinden(
      durchlauf([SAUBER]),
      durchlauf([{ ...SAUBER, mailId: "b", befunde: [befund({})] }]),
    );
    expect(ergebnis.verglichen).toBe(0);
    expect(ergebnis.rueckschritte).toEqual([]);
  });
});

describe("urteil", () => {
  it("sagt deutlich, wenn die Änderung nicht übernommen werden soll", () => {
    const ergebnis = rueckschritteFinden(
      durchlauf([SAUBER]),
      durchlauf([{ ...SAUBER, befunde: [befund({})] }]),
    );
    expect(urteil(ergebnis)).toContain("nicht übernommen");
  });

  it("bestätigt einen sauberen Durchlauf", () => {
    const ergebnis = rueckschritteFinden(
      durchlauf([SAUBER]),
      durchlauf([SAUBER]),
    );
    expect(urteil(ergebnis)).toContain("Kein Rückschritt");
  });

  it("sagt es, wenn es nichts zu vergleichen gab", () => {
    expect(urteil({ rueckschritte: [], besser: 0, verglichen: 0 })).toContain(
      "nichts zu vergleichen",
    );
  });
});
