import { describe, expect, it } from "vitest";
import { aenderungenFinden, inSaetze, lohntAbleitung } from "./vergleich";
import { konflikteFinden } from "./konflikt";
import type { Regel } from "@/lib/db/regeln";

function regel(teil: Partial<Regel>): Regel {
  return {
    id: Math.random().toString(36).slice(2),
    text: "Regel",
    art: "vermeiden",
    status: "aktiv",
    herkunft: "ausdruecklich",
    kundeId: null,
    muster: null,
    belege: 1,
    ...teil,
  };
}

/* ------------------------------------------------------------------------ */

describe("inSaetze", () => {
  it("trennt an Satzzeichen und Zeilenumbrüchen", () => {
    const saetze = inSaetze("Hallo Herr Meier,\n\nes geht raus. Danke!");
    expect(saetze).toEqual(["Hallo Herr Meier,", "es geht raus.", "Danke!"]);
  });
});

describe("aenderungenFinden", () => {
  it("meldet nichts, wenn nichts geändert wurde", () => {
    const text = "Hallo Herr Meier,\n\nes geht raus.\n\nViele Grüße";
    expect(aenderungenFinden(text, text)).toEqual([]);
  });

  it("findet eine ersetzte Grußformel", () => {
    const aenderungen = aenderungenFinden(
      "Hallo,\n\nes geht raus.\n\nMit freundlichen Grüßen",
      "Hallo,\n\nes geht raus.\n\nViele Grüße",
    );

    expect(aenderungen).toHaveLength(1);
    expect(aenderungen[0]?.vorher).toBe("Mit freundlichen Grüßen");
    expect(aenderungen[0]?.nachher).toBe("Viele Grüße");
  });

  it("meldet nach einem eingefügten Satz nicht alles Folgende als geändert", () => {
    /* Ein einfacher Zeilenvergleich würde hier drei Änderungen melden. Aus
       dieser Flut liesse sich keine Regel mehr herauslesen. */
    const aenderungen = aenderungenFinden(
      "Hallo,\n\nes geht raus.\n\nViele Grüße",
      "Hallo,\n\ndanke für Ihre Nachricht.\n\nes geht raus.\n\nViele Grüße",
    );

    expect(aenderungen).toHaveLength(1);
    expect(aenderungen[0]?.nachher).toBe("danke für Ihre Nachricht.");
  });

  it("erkennt einen gestrichenen Satz", () => {
    const aenderungen = aenderungenFinden(
      "Hallo,\n\nes geht raus.\n\nViele Grüße",
      "Hallo,\n\nViele Grüße",
    );

    expect(aenderungen[0]?.vorher).toBe("es geht raus.");
    expect(aenderungen[0]?.nachher).toBe("");
  });
});

describe("lohntAbleitung", () => {
  it("lohnt nicht ohne Änderung", () => {
    expect(lohntAbleitung([])).toBe(false);
  });

  it("lohnt nicht für einen gestrichenen Satz allein", () => {
    /* Eine Streichung sagt nichts über einen wiederkehrenden Stil — sie
       kann genauso gut inhaltlich sein. */
    expect(lohntAbleitung([{ vorher: "es geht raus.", nachher: "" }])).toBe(
      false,
    );
  });

  it("lohnt nicht für einen Tippfehler", () => {
    expect(
      lohntAbleitung([{ vorher: "Grüsse", nachher: "grüsse" }]),
    ).toBe(false);
  });

  it("lohnt für eine ersetzte Formulierung", () => {
    expect(
      lohntAbleitung([
        { vorher: "Mit freundlichen Grüßen", nachher: "Viele Grüße" },
      ]),
    ).toBe(true);
  });
});

/* ------------------------------------------------------------------------ */

describe("konflikteFinden", () => {
  it("findet zwei Regeln, die über dieselbe Formulierung streiten", () => {
    const konflikte = konflikteFinden([
      regel({ text: "Nie „Mit freundlichen Grüßen“", art: "vermeiden" }),
      regel({ text: "Immer „Mit freundlichen Grüßen“", art: "bevorzugen" }),
    ]);

    expect(konflikte).toHaveLength(1);
    expect(konflikte[0]?.text).toContain("widersprechen sich");
  });

  it("hält zwei gleichgerichtete Regeln nicht für einen Widerspruch", () => {
    expect(
      konflikteFinden([
        regel({ text: "Nie „Mit freundlichen Grüßen“", art: "vermeiden" }),
        regel({ text: "Nie „Hochachtungsvoll“", art: "vermeiden" }),
      ]),
    ).toEqual([]);
  });

  it("lässt eine kundenspezifische Regel der globalen widersprechen", () => {
    /* Das ist kein Konflikt, sondern der vorgesehene Weg: kundenspezifische
       Regeln überschreiben globale (`PLAN.md` §4). */
    expect(
      konflikteFinden([
        regel({ text: "Nie „Mit freundlichen Grüßen“", art: "vermeiden" }),
        regel({
          text: "Immer „Mit freundlichen Grüßen“",
          art: "bevorzugen",
          kundeId: "kunde-1",
        }),
      ]),
    ).toEqual([]);
  });

  it("prüft nur aktive Regeln", () => {
    expect(
      konflikteFinden([
        regel({ text: "Nie „Mit freundlichen Grüßen“", art: "vermeiden" }),
        regel({
          text: "Immer „Mit freundlichen Grüßen“",
          art: "bevorzugen",
          status: "vorgeschlagen",
        }),
      ]),
    ).toEqual([]);
  });

  it("hält unterschiedliche Formulierungen auseinander", () => {
    expect(
      konflikteFinden([
        regel({ text: "Nie „Mit freundlichen Grüßen“", art: "vermeiden" }),
        regel({ text: "Immer „Viele Grüße“", art: "bevorzugen" }),
      ]),
    ).toEqual([]);
  });
});
