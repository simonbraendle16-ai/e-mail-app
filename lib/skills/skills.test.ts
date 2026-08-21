import { describe, expect, it } from "vitest";
import { skillLesen, SkillFehler } from "./lesen";
import {
  alleSkills,
  fachSkills,
  rueckfallSkill,
  systemSkills,
} from "./register";
import { istEindeutig, signalwortAbgleich } from "./signalwoerter";

/**
 * Die Skill-Auswahl versagt still: Die App schreibt eine Mail, nur eben mit
 * dem falschen Aufbau. Das fällt niemandem auf, der nicht beide Varianten
 * nebeneinander sieht — und sie sieht immer nur eine.
 */

describe("skillLesen", () => {
  const gueltig = `---
name: beispiel
klasse: fach
signalwoerter: [Termin, wann kommt]
kontext: [kundenakte, letzte_mails]
modell: gross
---

## Zweck

Ein Beispiel, das nichts weiter tut.

## Regeln

- Keine.
`;

  it("liest Kopf und Anweisung", () => {
    const skill = skillLesen("beispiel.md", gueltig);

    expect(skill.name).toBe("beispiel");
    expect(skill.klasse).toBe("fach");
    expect(skill.signalwoerter).toEqual(["Termin", "wann kommt"]);
    expect(skill.kontext).toEqual(["kundenakte", "letzte_mails"]);
    expect(skill.modell).toBe("gross");
    expect(skill.anweisung).toContain("## Zweck");
  });

  it("zieht die Kurzbeschreibung aus dem Zweck-Abschnitt", () => {
    /* Die geht in den Einordnungsschritt — mit den vollen Anweisungen aller
       Skills wäre der teurer als das Formulieren selbst. */
    expect(skillLesen("beispiel.md", gueltig).kurzbeschreibung).toBe(
      "Ein Beispiel, das nichts weiter tut.",
    );
  });

  it("beschwert sich, wenn der Name nicht zum Dateinamen passt", () => {
    /* Sonst sucht man den Fehler an der falschen Stelle: In der Oberfläche
       steht ein Name, den es im Repo nicht gibt. */
    expect(() => skillLesen("anders.md", gueltig)).toThrow(SkillFehler);
  });

  it("beschwert sich bei fehlendem Kopf", () => {
    expect(() => skillLesen("x.md", "## Zweck\n\nNur Text.")).toThrow(
      SkillFehler,
    );
  });

  it("beschwert sich bei unbekannter Kontextquelle", () => {
    /* Ein Tippfehler soll auffallen, nicht durchrutschen — sonst fehlt beim
       Formulieren still eine Wissensquelle. */
    const kaputt = gueltig.replace("[kundenakte, letzte_mails]", "[kundenkarte]");

    expect(() => skillLesen("beispiel.md", kaputt)).toThrow(/kundenkarte/);
  });

  it("beschwert sich bei leerer Anweisung", () => {
    const leer = `---
name: leer
klasse: fach
modell: klein
---

`;
    expect(() => skillLesen("leer.md", leer)).toThrow(SkillFehler);
  });

  it("liest eine Streuung, wenn eine dasteht", () => {
    const mitStreuung = gueltig.replace(
      "modell: gross",
      "modell: gross\nstreuung: 0.1",
    );

    expect(skillLesen("beispiel.md", mitStreuung).streuung).toBe(0.1);
  });
});

describe("die tatsächlichen Skill-Dateien", () => {
  it("lassen sich alle lesen", () => {
    expect(alleSkills().length).toBeGreaterThanOrEqual(8);
  });

  it("haben genau eine Rückfallebene", () => {
    /* Bei keiner bliebe eine Mail ohne Skill, bei mehreren wäre die Wahl
       zwischen ihnen willkürlich. */
    const rueckfall = fachSkills().filter((s) => s.rueckfallebene);

    expect(rueckfall).toHaveLength(1);
    expect(rueckfall[0]!.name).toBe("allgemein");
  });

  it("enthalten die vier Fach-Skills aus SKILLS.md", () => {
    const namen = fachSkills().map((s) => s.name).sort();

    expect(namen).toEqual([
      "allgemein",
      "anfrage-angebot",
      "auftrag-bestellung",
      "liefertermin",
    ]);
  });

  it("enthalten die vier System-Skills aus SKILLS.md", () => {
    const namen = systemSkills().map((s) => s.name).sort();

    expect(namen).toEqual([
      "rueckuebersetzung",
      "selbstverbesserung",
      "uebersetzer",
      "wissensabruf",
    ]);
  });

  it("geben der Rückübersetzung eine niedrige Streuung", () => {
    /* SKILLS.md §8: wörtlich, nicht schön. Bei üblicher Streuung glättet sie
       und die Kontrolle wird wertlos. */
    const rueck = systemSkills().find((s) => s.name === "rueckuebersetzung");

    expect(rueck!.streuung).toBeLessThanOrEqual(0.15);
  });

  it("lassen die Rückfallebene ohne Signalwörter", () => {
    /* Sonst zöge sie Treffer an sich und wäre nicht mehr die Rückfallebene,
       sondern ein Konkurrent. */
    expect(rueckfallSkill().signalwoerter).toEqual([]);
  });
});

describe("signalwortAbgleich", () => {
  const skills = fachSkills().filter((s) => !s.rueckfallebene);

  it("erkennt eine Liefertermin-Mail", () => {
    const treffer = signalwortAbgleich(
      "Wann kommt die Lieferung? Wir bräuchten den Termin.",
      skills,
    );

    expect(treffer[0]!.skill.name).toBe("liefertermin");
  });

  it("erkennt eine Preisanfrage", () => {
    const treffer = signalwortAbgleich(
      "Bitte um ein Angebot mit Preis und Konditionen.",
      skills,
    );

    expect(treffer[0]!.skill.name).toBe("anfrage-angebot");
  });

  it("erkennt eine Bestellung", () => {
    const treffer = signalwortAbgleich(
      "Wir möchten eine Nachbestellung aufgeben, bitte um Auftragsbestätigung.",
      skills,
    );

    expect(treffer[0]!.skill.name).toBe("auftrag-bestellung");
  });

  it("findet nichts in einer Mail ohne Signalwörter", () => {
    expect(
      signalwortAbgleich("Vielen Dank für das nette Gespräch gestern.", skills),
    ).toEqual([]);
  });

  it("achtet auf Wortgrenzen am Anfang", () => {
    /* „bestimmt" darf nicht als „Termin" durchgehen. */
    const treffer = signalwortAbgleich("Das ist bestimmt richtig so.", skills);

    expect(treffer).toEqual([]);
  });

  it("findet Wortformen mit Endung", () => {
    /* „Liefer" soll „Lieferung" finden — deshalb keine Wortgrenze am Ende. */
    const treffer = signalwortAbgleich("Die Lieferungen verzögern sich.", skills);

    expect(treffer[0]!.skill.name).toBe("liefertermin");
  });

  it("nennt die Wörter, die getroffen haben", () => {
    /* Sie sieht, warum ein Skill gewählt wurde — das muss erklärbar sein. */
    const treffer = signalwortAbgleich("Wann kommt die Lieferung?", skills);

    expect(treffer[0]!.woerter.length).toBeGreaterThan(0);
  });
});

describe("istEindeutig", () => {
  const skills = fachSkills().filter((s) => !s.rueckfallebene);

  it("ist eindeutig, wenn nur ein Skill trifft", () => {
    const treffer = signalwortAbgleich("Wann kommt die Lieferung?", skills);

    expect(istEindeutig(treffer)).toBe(true);
  });

  it("ist nicht eindeutig ohne Treffer", () => {
    expect(istEindeutig([])).toBe(false);
  });

  it("ist bei einer Mischmail nicht eindeutig", () => {
    /* „Wann kommt unsere Bestellung, und was kostet die Nachbestellung?"
       trifft mehrere Skills ähnlich stark — hier lohnt der Einordnungsschritt,
       weil bloßes Zählen den falschen wählen würde. */
    const treffer = signalwortAbgleich(
      "Wann kommt unsere Bestellung? Und was kostet eine Nachbestellung, " +
        "bitte mit Preis und Konditionen.",
      skills,
    );

    expect(treffer.length).toBeGreaterThan(1);
    expect(istEindeutig(treffer)).toBe(false);
  });
});
