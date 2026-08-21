import { describe, expect, it } from "vitest";
import {
  brauchbareAntwort,
  fassungenTrennen,
  ROLLE,
  ZWEI_FASSUNGEN,
} from "./anweisung";

/**
 * Das Trennen der Fassungen versagt still: Kommt es durcheinander, sieht sie
 * zwei Hälften derselben Mail statt zweier Fassungen — und merkt nicht, dass
 * die App etwas falsch macht, sondern hält das Ergebnis für schlecht.
 */

describe("fassungenTrennen", () => {
  it("trennt an der Trennzeile", () => {
    const antwort = `Hallo Herr Meier,

kurz und knapp.

Viele Grüße
---
Hallo Herr Meier,

etwas ausführlicher, mit Begründung.

Viele Grüße`;

    const { knapp, ausfuehrlich } = fassungenTrennen(antwort);

    expect(knapp).toContain("kurz und knapp");
    expect(ausfuehrlich).toContain("ausführlicher");
  });

  it("verträgt mehr als drei Striche", () => {
    /* Modelle schreiben gern ----- statt ---. */
    const { knapp, ausfuehrlich } = fassungenTrennen("Erste\n-----\nZweite");

    expect(knapp).toBe("Erste");
    expect(ausfuehrlich).toBe("Zweite");
  });

  it("verträgt Leerzeichen um die Trennzeile", () => {
    const { knapp, ausfuehrlich } = fassungenTrennen("Erste\n  ---  \nZweite");

    expect(knapp).toBe("Erste");
    expect(ausfuehrlich).toBe("Zweite");
  });

  it("nimmt bei nur einer Fassung diese als knappe", () => {
    /* Besser eine Fassung als eine Fehlermeldung — sie sieht dann eben nur
       eine, statt vor einem leeren Bildschirm zu stehen. */
    const { knapp, ausfuehrlich } = fassungenTrennen("Nur eine Mail.");

    expect(knapp).toBe("Nur eine Mail.");
    expect(ausfuehrlich).toBe("");
  });

  it("zerschneidet keinen Gedankenstrich mitten im Satz", () => {
    /* „—" und „-" dürfen nicht als Trennzeile gelten, sonst zerfällt eine
       einzelne Mail in zwei Bruchstücke. */
    const text = "Die Ware kommt Freitag — pünktlich zum Wochenende.";
    const { knapp, ausfuehrlich } = fassungenTrennen(text);

    expect(knapp).toBe(text);
    expect(ausfuehrlich).toBe("");
  });

  it("verwirft leere Abschnitte", () => {
    const { knapp, ausfuehrlich } = fassungenTrennen("\n---\nErste\n---\nZweite");

    expect(knapp).toBe("Erste");
    expect(ausfuehrlich).toBe("Zweite");
  });
});

describe("die feste Rollen-Anweisung", () => {
  it("verbietet das Erfinden von Zahlen", () => {
    /* Der einzige Fehler in diesem Projekt, der echten Schaden anrichtet. */
    expect(ROLLE).toContain("erfindest nichts");
    expect(ROLLE).toContain("eckigen Klammern");
  });

  it("verbietet Kommentare zur eigenen Arbeit", () => {
    /* Ohne diesen Satz liefern Modelle gern „Hier ist Ihre E-Mail:" mit
       Nachbemerkungen, und sie müsste das jedes Mal wegräumen. */
    expect(ROLLE).toContain("kommentierst deine eigene Arbeit nicht");
  });

  it("verbietet Betreffzeile und Signaturplatzhalter", () => {
    /* Im Durchstich in Phase 3 aufgefallen: Das Modell setzte „**Betreff:**"
       und „[Ihr Name]" in die Mail. Beides muss sie sonst wegräumen. */
    expect(ROLLE).toContain("Keine Betreffzeile");
    expect(ROLLE).toContain("Keine Platzhalter für Signatur");
  });
});

describe("die Zwei-Fassungen-Anweisung", () => {
  it("nennt beide Fassungen und die Trennung", () => {
    expect(ZWEI_FASSUNGEN).toContain("Fassung A");
    expect(ZWEI_FASSUNGEN).toContain("Fassung B");
    expect(ZWEI_FASSUNGEN).toContain("---");
  });

  it("begrenzt die knappe Fassung", () => {
    expect(ZWEI_FASSUNGEN).toContain("höchstens fünf Sätze");
  });
});

/**
 * `MODELL.md` §5: „Antwort leer oder unbrauchbar → Ein Neuversuch, dann
 * ehrliche Meldung — **kein leerer Bildschirm**."
 *
 * Die maschinellen Prüfungen fangen diesen Fall nicht ab: An einem leeren
 * Text finden sie nichts zu beanstanden. Ohne diese Prüfung ginge die leere
 * Mail als fertige Mail durch, und sie stünde vor genau dem leeren
 * Bildschirm, den die Spezifikation ausschließt.
 */
describe("brauchbareAntwort", () => {
  const ECHT = `Hallo Herr Meier,

die Lieferung geht wie besprochen raus.

Viele Grüße`;

  it("lässt eine echte Mail durch", () => {
    expect(brauchbareAntwort(ECHT)).toBe(true);
  });

  it("weist eine leere Antwort ab", () => {
    expect(brauchbareAntwort("")).toBe(false);
    expect(brauchbareAntwort("   \n\n  ")).toBe(false);
  });

  it("weist einen Rest ab, der keine Mail sein kann", () => {
    expect(brauchbareAntwort("Hallo,")).toBe(false);
  });

  it("weist eine Absage des Modells ab", () => {
    /* Manche Modelle antworten statt mit einer Mail mit einer Erklärung,
       warum sie nicht können. Das ist kein Entwurf, auch wenn es aussieht
       wie Text — und ungefiltert stünde es als Mail an einen Kunden da. */
    expect(
      brauchbareAntwort(
        "I'm sorry, I cannot help with composing this email for you.",
      ),
    ).toBe(false);
    expect(
      brauchbareAntwort(
        "Es tut mir leid, aber ich kann diese Mail nicht schreiben.",
      ),
    ).toBe(false);
  });

  it("hält eine Mail, die eine Entschuldigung enthält, nicht für eine Absage", () => {
    /* „Es tut mir leid, die Lieferung verzögert sich" ist genau die Art Mail,
       die sie täglich schreibt. Die darf nicht als Absage durchfallen —
       sonst schlägt die Prüfung ausgerechnet bei den unangenehmen Mails zu,
       bei denen die App am meisten hilft. */
    expect(
      brauchbareAntwort(
        "Hallo Herr Meier,\n\nes tut mir leid, die Lieferung verzögert sich um zwei Tage.\n\nViele Grüße",
      ),
    ).toBe(true);
  });
});
