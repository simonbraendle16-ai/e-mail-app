import { describe, expect, it } from "vitest";
import {
  pseudonymisieren,
  uebrigePlatzhalter,
  zurueckersetzen,
} from "./pseudonymisierung";

/**
 * Die Pseudonymisierung ist die Schicht zwischen ihren Kundendaten und einem
 * fremden Server. Versagt sie, merkt es niemand — der Aufruf geht durch, die
 * Mail kommt zurück, nur stand der Klartext eben doch im Netz.
 */

describe("pseudonymisieren", () => {
  it("ersetzt Kundennamen durch nummerierte Platzhalter", () => {
    const { texte, zuordnung } = pseudonymisieren(
      ["Bitte an Meier & Co. schreiben."],
      { kunde: "Meier & Co." },
    );

    expect(texte[0]).toBe("Bitte an [KUNDE_1] schreiben.");
    expect(zuordnung.tabelle.get("[KUNDE_1]")).toBe("Meier & Co.");
  });

  it("ersetzt den längeren Namen zuerst", () => {
    /* Der Kern der Sache: Würde „Meier" zuerst ersetzt, bliebe
       „[PERSON_1] & Co." stehen — der Firmenname wäre weiter im Klartext. */
    const { texte } = pseudonymisieren(["Herr Meier von Meier & Co."], {
      kunde: "Meier & Co.",
      ansprechpartner: "Meier",
    });

    expect(texte[0]).not.toContain("Meier &");
    expect(texte[0]).toContain("[KUNDE_1]");
  });

  it("erwischt den Namen auch kleingeschrieben", () => {
    const { texte } = pseudonymisieren(["hallo herr sörensen"], {
      ansprechpartner: "Sörensen",
    });

    expect(texte[0]).not.toContain("sörensen");
  });

  it("hält mehrere Personen auseinander", () => {
    /* Generische Platzhalter würden hier zusammenfallen, und das Modell
       schriebe die Mail womöglich an die falsche Person. */
    const { texte, zuordnung } = pseudonymisieren(
      ["Frau de Vries und Herr Sörensen"],
      { ansprechpartner: "de Vries", weitere: ["Sörensen"] },
    );

    expect(texte[0]).toContain("[PERSON_1]");
    expect(texte[0]).toContain("[PERSON_2]");
    expect(zuordnung.tabelle.size).toBe(2);
  });

  it("lässt sehr kurze Werte in Ruhe", () => {
    /* Ein einzelner Buchstabe als Name würde den ganzen Text zerhacken. */
    const { texte } = pseudonymisieren(["Ein Brief an alle"], { kunde: "A" });

    expect(texte[0]).toBe("Ein Brief an alle");
  });

  it("nimmt denselben Namen nur einmal auf", () => {
    const { zuordnung } = pseudonymisieren(["Meier"], {
      kunde: "Meier",
      firma: "Meier",
    });

    expect(zuordnung.tabelle.size).toBe(1);
  });

  it("verarbeitet mehrere Texte mit derselben Zuordnung", () => {
    const { texte, zuordnung } = pseudonymisieren(
      ["Anfrage von Alpenhof", "Antwort an Alpenhof"],
      { kunde: "Alpenhof" },
    );

    expect(texte[0]).toContain("[KUNDE_1]");
    expect(texte[1]).toContain("[KUNDE_1]");
    expect(zuordnung.tabelle.size).toBe(1);
  });
});

describe("zurueckersetzen", () => {
  it("stellt den Ausgangstext wieder her", () => {
    const original = "Sehr geehrter Herr Meier von Meier & Co.";
    const { texte, zuordnung } = pseudonymisieren([original], {
      kunde: "Meier & Co.",
      ansprechpartner: "Herr Meier",
    });

    expect(zurueckersetzen(texte[0]!, zuordnung)).toBe(original);
  });

  it("setzt Namen auch in einer neu geschriebenen Antwort ein", () => {
    const { zuordnung } = pseudonymisieren(["Meier & Co."], {
      kunde: "Meier & Co.",
    });

    const vomModell = "Guten Tag, die Lieferung an [KUNDE_1] geht raus.";

    expect(zurueckersetzen(vomModell, zuordnung)).toBe(
      "Guten Tag, die Lieferung an Meier & Co. geht raus.",
    );
  });
});

describe("uebrigePlatzhalter", () => {
  it("findet einen erfundenen Platzhalter", () => {
    /* Das Modell erfindet gelegentlich [KUNDE_3], wo es nur zwei gibt.
       Unbemerkt stünde das in der Mail an den Kunden. */
    expect(uebrigePlatzhalter("Sehr geehrter [KUNDE_3],")).toEqual([
      "[KUNDE_3]",
    ]);
  });

  it("meldet nichts bei sauberem Text", () => {
    expect(uebrigePlatzhalter("Sehr geehrter Herr Meier,")).toEqual([]);
  });

  it("nennt jeden Platzhalter nur einmal", () => {
    expect(uebrigePlatzhalter("[PERSON_1] und nochmal [PERSON_1]")).toEqual([
      "[PERSON_1]",
    ]);
  });

  it("verwechselt Lückenmarkierungen nicht mit Platzhaltern", () => {
    /* [Preis eintragen] ist gewollt und muss stehen bleiben. */
    expect(uebrigePlatzhalter("Der Preis ist [Preis eintragen].")).toEqual([]);
  });
});
