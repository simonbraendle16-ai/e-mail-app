import { describe, expect, it } from "vitest";
import {
  begriffeImText,
  glossarAbweichungen,
  nachbesserungHinweis,
  vorgabeZeilen,
} from "./glossar";
import { abweichungenFinden } from "./abweichung";
import {
  rueckuebersetzungAnweisung,
  uebersetzungAnweisung,
} from "./anweisung";
import type { Glossareintrag } from "@/lib/db/glossar";

function eintrag(teil: Partial<Glossareintrag>): Glossareintrag {
  return {
    id: "1",
    de: "Bergkäse",
    en: "mountain cheese",
    verbindlich: true,
    bereich: "kaese",
    ...teil,
  };
}

const GLOSSAR = [
  eintrag({ id: "1", de: "Bergkäse", en: "mountain cheese" }),
  eintrag({ id: "2", de: "Laib", en: "wheel" }),
  eintrag({ id: "3", de: "Reifegrad", en: "maturity level", verbindlich: false }),
];

/* ------------------------------------------------------------------------ */

describe("begriffeImText", () => {
  it("findet einen Begriff unabhängig von der Großschreibung", () => {
    const treffer = begriffeImText("bergkäse in Laiben", GLOSSAR);
    expect(treffer.map((t) => t.de)).toContain("Bergkäse");
  });

  it("trifft nicht mitten im Wort", () => {
    /* „Laib" darf nicht in „Laibchen" treffen — einen falschen Begriff
       vorzuschreiben ist schlimmer, als einen auszulassen. */
    const treffer = begriffeImText("Wir liefern Laibchen.", GLOSSAR);
    expect(treffer.map((t) => t.de)).not.toContain("Laib");
  });

  it("meldet nichts, wenn kein Begriff vorkommt", () => {
    expect(begriffeImText("Guten Tag, alles bestens.", GLOSSAR)).toEqual([]);
  });
});

describe("vorgabeZeilen", () => {
  it("gibt nur bestätigte Begriffe als verbindlich weiter", () => {
    const zeilen = vorgabeZeilen(GLOSSAR);
    expect(zeilen.join("\n")).toContain("Bergkäse → mountain cheese");
    expect(zeilen.join("\n")).not.toContain("Reifegrad");
  });
});

describe("glossarAbweichungen", () => {
  it("bleibt still, wenn jeder Begriff verwendet wurde", () => {
    expect(
      glossarAbweichungen("We ship mountain cheese in wheels.", GLOSSAR),
    ).toEqual([]);
  });

  it("meldet einen vorgeschriebenen Begriff, der fehlt", () => {
    const offen = glossarAbweichungen("We ship alpine cheese.", GLOSSAR);
    expect(offen.map((a) => a.de)).toContain("Bergkäse");
  });

  it("verlangt einen unbestätigten Begriff nicht", () => {
    const offen = glossarAbweichungen("We ship mountain cheese in wheels.", [
      eintrag({ de: "Reifegrad", en: "maturity level", verbindlich: false }),
    ]);
    expect(offen).toEqual([]);
  });

  it("nennt die fehlenden Begriffe im Nachbesserungshinweis", () => {
    const offen = glossarAbweichungen("We ship alpine cheese.", GLOSSAR);
    expect(nachbesserungHinweis(offen)).toContain("mountain cheese");
  });

  it("gibt ohne Abweichung keinen Hinweis", () => {
    expect(nachbesserungHinweis([])).toBeNull();
  });
});

/* ------------------------------------------------------------------------ */

describe("abweichungenFinden", () => {
  it("bleibt still, wenn die Rückübersetzung dasselbe sagt", () => {
    expect(
      abweichungenFinden(
        "Wir können am Freitag liefern.",
        "Wir können am Freitag liefern.",
      ),
    ).toEqual([]);
  });

  it("meldet eine verbindlicher gewordene Zusage", () => {
    /* Der gefährliche Fall: Im Deutschen ein Vielleicht, im Englischen eine
       Zusage. */
    const gefunden = abweichungenFinden(
      "Wir könnten die Lieferung vorziehen.",
      "Wir können die Lieferung vorziehen.",
    );

    const zusage = gefunden.find((a) => a.art === "zusage");
    expect(zusage?.text).toContain("verbindlicher");
  });

  it("meldet eine abgeschwächte Zusage", () => {
    const gefunden = abweichungenFinden(
      "Wir können die Lieferung vorziehen.",
      "Wir könnten die Lieferung vorziehen.",
    );

    const zusage = gefunden.find((a) => a.art === "zusage");
    expect(zusage?.text).toContain("zurückhaltender");
  });

  it("meldet eine verlorene Verneinung", () => {
    const gefunden = abweichungenFinden(
      "Wir können den Termin nicht halten.",
      "Wir können den Termin halten.",
    );
    expect(gefunden.find((a) => a.art === "verneinung")?.text).toContain(
      "fehlt eine Verneinung",
    );
  });

  it("meldet eine hinzugekommene Verneinung", () => {
    const gefunden = abweichungenFinden(
      "Wir können den Termin halten.",
      "Wir können den Termin nicht halten.",
    );
    expect(gefunden.find((a) => a.art === "verneinung")?.text).toContain(
      "eine Verneinung mehr",
    );
  });

  it("meldet eine Zahl, die erst im Englischen auftaucht", () => {
    const gefunden = abweichungenFinden(
      "Wir liefern die bestellte Menge.",
      "Wir liefern 500 Stück.",
    );

    const zahl = gefunden.find((a) => a.art === "zahl");
    expect(zahl?.stellen).toContain("500");
  });

  it("meldet eine verlorene Zahl", () => {
    const gefunden = abweichungenFinden(
      "Wir liefern 500 Stück.",
      "Wir liefern die bestellte Menge.",
    );
    expect(gefunden.find((a) => a.art === "zahl")).toBeDefined();
  });

  it("stört sich nicht an anderer Wortstellung", () => {
    expect(
      abweichungenFinden(
        "Am Freitag geht die Lieferung raus.",
        "Die Lieferung geht am Freitag raus.",
      ),
    ).toEqual([]);
  });
});

/* ------------------------------------------------------------------------ */

describe("uebersetzungAnweisung", () => {
  it("schreibt bestätigte Begriffe verbindlich vor", () => {
    const [system] = uebersetzungAnweisung({
      deutsch: "Wir liefern Bergkäse.",
      vorgaben: ["  Bergkäse → mountain cheese"],
    });
    expect(system?.inhalt).toContain("keine Synonyme");
    expect(system?.inhalt).toContain("mountain cheese");
  });

  it("sagt ausdrücklich, wenn es noch keine Vorgaben gibt", () => {
    const [system] = uebersetzungAnweisung({
      deutsch: "Wir liefern.",
      vorgaben: [],
    });
    expect(system?.inhalt).toContain("keine verbindlichen Begriffe");
  });

  it("nimmt britisches Englisch, außer bei Nordamerika", () => {
    const [britisch] = uebersetzungAnweisung({ deutsch: "x", vorgaben: [] });
    expect(britisch?.inhalt).toContain("Britisches Englisch");

    const [amerikanisch] = uebersetzungAnweisung({
      deutsch: "x",
      vorgaben: [],
      land: "USA",
    });
    expect(amerikanisch?.inhalt).toContain("Amerikanisches Englisch");
  });

  it("lässt Lücken unübersetzt stehen", () => {
    const [system] = uebersetzungAnweisung({ deutsch: "x", vorgaben: [] });
    expect(system?.inhalt).toContain("eckigen Klammern");
  });
});

describe("rueckuebersetzungAnweisung", () => {
  it("schickt das deutsche Original nicht mit", () => {
    const nachrichten = rueckuebersetzungAnweisung("We can deliver on Friday.");
    const alles = nachrichten.map((n) => n.inhalt).join("\n");

    expect(alles).toContain("We can deliver on Friday.");
    /* Die Funktion nimmt das Original gar nicht erst entgegen — was nicht
       übergeben werden kann, kann auch nicht mitgeschickt werden. */
    expect(alles).not.toContain("Wir können am Freitag liefern");
  });

  it("verlangt Wortgetreue statt Sprachgefühl", () => {
    const [system] = rueckuebersetzungAnweisung("x");
    expect(system?.inhalt).toContain("Nicht schön machen");
  });
});
