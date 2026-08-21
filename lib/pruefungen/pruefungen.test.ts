import { describe, expect, it } from "vitest";
import { angabenBelegt, angabenLesen } from "./angaben";
import { neuversuchHinweis, pruefen } from "./pruefen";
import type { Kontextregel } from "@/lib/verfassen/kontext";

const OHNE_REGELN: Kontextregel[] = [];

function regel(teil: Partial<Kontextregel>): Kontextregel {
  return {
    text: "Regel",
    kundenspezifisch: false,
    art: "vermeiden",
    muster: null,
    ...teil,
  };
}

/* ------------------------------------------------------------------------ */

describe("angabenLesen", () => {
  it("liest ein Datum als eine Angabe, nicht als drei Zahlen", () => {
    const gelesen = angabenLesen("Wir liefern am 12.03.2026.");
    expect(gelesen).toHaveLength(1);
    expect(gelesen[0]?.art).toBe("datum");
    expect(gelesen[0]?.normal).toBe("12.3.");
  });

  it("versteht den ausgeschriebenen Monat", () => {
    expect(angabenLesen("am 12. März")[0]?.normal).toBe("12.3.");
    expect(angabenLesen("am 3. Dezember 2026")[0]?.normal).toBe("3.12.");
  });

  it("löst die deutsche Zahlschreibweise auf", () => {
    expect(angabenLesen("1.200 Laib")[0]?.normal).toBe("1200");
    expect(angabenLesen("4,50 Euro")[0]?.normal).toBe("4.5");
    expect(angabenLesen("1.200,50 Euro")[0]?.normal).toBe("1200.5");
  });

  it("liest Uhrzeit und Kalenderwoche", () => {
    expect(angabenLesen("um 8:00 Uhr")[0]?.normal).toBe("8:00");
    expect(angabenLesen("in KW 12")[0]?.normal).toBe("kw12");
  });

  it("ignoriert Gliederungsziffern am Zeilenanfang", () => {
    expect(angabenLesen("1. Erstens\n2. Zweitens")).toHaveLength(0);
  });
});

describe("angabenBelegt", () => {
  it("erkennt dieselbe Menge in anderer Schreibweise als belegt", () => {
    expect(angabenBelegt("Wir liefern 1.200 Laib.", ["1200 Laib"])).toEqual([]);
  });

  it("erkennt denselben Tag in anderer Schreibweise als belegt", () => {
    expect(angabenBelegt("Lieferung am 12.03.2026", ["12. März"])).toEqual([]);
  });

  it("lässt ein Datum ohne Jahr für eins mit Jahr gelten", () => {
    expect(angabenBelegt("am 13.03.", ["Termin 13.03.2026"])).toEqual([]);
  });

  it("meldet eine Zahl, die in keiner Quelle steht", () => {
    const offen = angabenBelegt("Der Preis liegt bei 9,80 Euro.", [
      "Kunde fragt nach dem Preis",
    ]);
    expect(offen).toHaveLength(1);
    expect(offen[0]?.wortlaut).toBe("9,80");
  });

  it("meldet ein aus einem Wochentag erfundenes Datum", () => {
    /* In den Stichworten steht nur „Freitag" — das Kalenderdatum hat sich
       das Modell dazugedacht. Genau der Fall, der schaden kann. */
    const offen = angabenBelegt("Die Lieferung geht am 13.03. raus.", [
      "Lieferung geht Freitag raus",
    ]);
    expect(offen.map((a) => a.wortlaut)).toEqual(["13.03."]);
  });

  it("meldet dieselbe unbelegte Angabe nur einmal", () => {
    const offen = angabenBelegt("500 Stück, also 500 insgesamt.", []);
    expect(offen).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------------ */

const SAUBER = `Sehr geehrter Herr de Vries,

vielen Dank für Ihre Nachricht. Die Lieferung geht wie besprochen raus.

Mit freundlichen Grüßen
Andrea`;

describe("pruefen", () => {
  it("lässt eine saubere Mail ohne Befund durch", () => {
    expect(
      pruefen({ entwurf: SAUBER, quellen: [], regeln: OHNE_REGELN }),
    ).toEqual([]);
  });

  it("markiert eine erfundene Angabe, statt neu zu schreiben", () => {
    const befunde = pruefen({
      entwurf: SAUBER.replace("wie besprochen", "am 13.03.2026"),
      quellen: ["Lieferung kommt bald"],
      regeln: OHNE_REGELN,
    });

    const angabe = befunde.find((b) => b.art === "erfundene-angabe");
    expect(angabe?.folge).toBe("markieren");
    expect(angabe?.stellen).toContain("13.03.2026");
  });

  it("stellt die erfundene Angabe an die erste Stelle", () => {
    const befunde = pruefen({
      entwurf: `Hallo,\n\n${"Wort ".repeat(260)} 9,80 Euro.\n\nViele Grüße`,
      quellen: [],
      regeln: OHNE_REGELN,
    });
    expect(befunde[0]?.art).toBe("erfundene-angabe");
  });

  it("schlägt bei einer verletzten vermeiden-Regel einen Neuversuch vor", () => {
    const befunde = pruefen({
      entwurf: SAUBER,
      quellen: [],
      regeln: [
        regel({
          text: "Nie „Mit freundlichen Grüßen“",
          muster: "Mit freundlichen Grüßen",
        }),
      ],
    });

    const treffer = befunde.find((b) => b.art === "verbotene-formulierung");
    expect(treffer?.folge).toBe("neuversuch");
  });

  it("überspringt eine Regel mit kaputtem Muster, statt zu scheitern", () => {
    expect(() =>
      pruefen({
        entwurf: SAUBER,
        quellen: [],
        regeln: [regel({ muster: "([unvollstaendig" })],
      }),
    ).not.toThrow();
  });

  it("prüft nur vermeiden-Regeln auf Muster", () => {
    const befunde = pruefen({
      entwurf: SAUBER,
      quellen: [],
      regeln: [regel({ art: "bevorzugen", muster: "Mit freundlichen Grüßen" })],
    });
    expect(befunde.find((b) => b.art === "verbotene-formulierung")).toBeUndefined();
  });

  it("meldet eine fehlende Grußformel als Neuversuch", () => {
    const befunde = pruefen({
      entwurf: "Sehr geehrter Herr de Vries,\n\ndie Lieferung geht raus.",
      quellen: [],
      regeln: OHNE_REGELN,
    });

    const treffer = befunde.find((b) => b.art === "unvollstaendig");
    expect(treffer?.folge).toBe("neuversuch");
    expect(treffer?.text).toContain("Grußformel");
  });

  it("behandelt eine Lücke als Hinweis, nicht als Fehler", () => {
    const befunde = pruefen({
      entwurf: SAUBER.replace("wie besprochen", "am [Datum einsetzen]"),
      quellen: [],
      regeln: OHNE_REGELN,
    });

    const treffer = befunde.find((b) => b.art === "luecke");
    expect(treffer?.folge).toBe("hinweis");
    expect(treffer?.stellen).toEqual(["[Datum einsetzen]"]);
  });

  it("zählt ein übriggebliebenes Pseudonym nicht als Lücke", () => {
    const befunde = pruefen({
      entwurf: SAUBER.replace("Herr de Vries", "[KUNDE_1]"),
      quellen: [],
      regeln: OHNE_REGELN,
    });

    expect(befunde.find((b) => b.art === "pseudonym-rest")?.folge).toBe(
      "markieren",
    );
    expect(befunde.find((b) => b.art === "luecke")).toBeUndefined();
  });

  it("weist auf übermäßige Länge hin, ohne etwas zu ändern", () => {
    const befunde = pruefen({
      entwurf: `Hallo,\n\n${"Wort ".repeat(260)}\n\nViele Grüße`,
      quellen: [],
      regeln: OHNE_REGELN,
    });
    expect(befunde.find((b) => b.art === "laenge")?.folge).toBe("hinweis");
  });
});

describe("neuversuchHinweis", () => {
  it("bleibt still, wenn nichts neu zu schreiben ist", () => {
    const befunde = pruefen({
      entwurf: SAUBER.replace("wie besprochen", "am [Datum einsetzen]"),
      quellen: [],
      regeln: OHNE_REGELN,
    });
    expect(neuversuchHinweis(befunde)).toBeNull();
  });

  it("benennt, was zu beheben ist", () => {
    const befunde = pruefen({
      entwurf: "Sehr geehrter Herr de Vries,\n\ndie Lieferung geht raus.",
      quellen: [],
      regeln: OHNE_REGELN,
    });

    const hinweis = neuversuchHinweis(befunde);
    expect(hinweis).toContain("Grußformel");
    expect(hinweis).toContain("Erfinde keine Zahlen");
  });
});
