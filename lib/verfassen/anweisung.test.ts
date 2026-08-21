import { describe, expect, it } from "vitest";
import { fassungenTrennen, ROLLE, ZWEI_FASSUNGEN } from "./anweisung";

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
