import "server-only";
import { einordnen } from "@/lib/modell";
import { fachSkills, rueckfallSkill, skillFinden, systemSkills } from "./register";
import { istEindeutig, signalwortAbgleich } from "./signalwoerter";
import type { Skill, SkillWahl } from "./typen";

/**
 * Die zweistufige Skill-Auswahl (`SKILLS.md`).
 *
 *   Stufe 1: Signalwort-Abgleich — kein Modell, kostenlos, sofort
 *   Stufe 2: Einordnung durch das kleine Modell — nur wenn nötig
 *
 * Das Ergebnis ist immer **genau ein Fach-Skill** plus die System-Skills, die
 * zur Lage passen. Zwei Fach-Skills gleichzeitig sind ausgeschlossen: Ihre
 * Aufbauvorgaben widersprächen einander, und heraus käme eine Mail, die weder
 * das eine noch das andere ist.
 */

export type AuswahlAngaben = {
  eingehenderText?: string;
  stichworte?: string;
  nutzerId: string;
  /** Sprache des Kunden — entscheidet über Übersetzer und Rückübersetzung. */
  kundensprache?: "de" | "en";
  /** Hat sie den Skill selbst gewählt, gilt das ohne Rückfrage. */
  vonIhrGewaehlt?: string;
  abbruch?: AbortSignal;
};

/**
 * Welche System-Skills mitlaufen.
 *
 * Sie werden nicht ausgewählt, sondern folgen aus der Lage: `wissensabruf`
 * läuft immer, die Übersetzung nur bei englischen Kunden. Deshalb steht das
 * hier als Regel und nicht in einem Modellaufruf — es gibt nichts zu raten.
 */
function passendeSystemSkills(sprache: "de" | "en" | undefined): Skill[] {
  return systemSkills().filter((skill) => {
    switch (skill.laeuft) {
      case "immer":
        return true;
      case "kundensprache-englisch":
      case "nach-englischer-fassung":
        return sprache === "en";
      case "nach-korrektur":
        /* Läuft erst nach ihrer Korrektur, gehört also nicht in die
           Auswahl für den ersten Entwurf. */
        return false;
      default:
        return false;
    }
  });
}

/**
 * Wählt den Fach-Skill und die begleitenden System-Skills.
 *
 * Fällt der Modellaufruf in Stufe 2 aus, wird **nicht** abgebrochen: Dann
 * greift der beste Signalwort-Treffer, sonst die Rückfallebene. Ein Ausfall
 * der Einordnung darf sie nicht daran hindern, eine Mail zu schreiben —
 * ein vielleicht nicht ideal gewählter Aufbau ist besser als kein Entwurf.
 */
export async function skillWaehlen(
  angaben: AuswahlAngaben,
): Promise<SkillWahl> {
  const system = passendeSystemSkills(angaben.kundensprache);

  /* Ihre Wahl schlägt alles. Sie sieht den Skill und kann umschalten —
     wenn sie das tut, wird nicht nachverhandelt. */
  if (angaben.vonIhrGewaehlt) {
    const gewaehlt = skillFinden(angaben.vonIhrGewaehlt);
    if (gewaehlt && gewaehlt.klasse === "fach") {
      return {
        fachSkill: gewaehlt,
        systemSkills: system,
        begruendung: "von-ihr-gewaehlt",
        treffer: [],
      };
    }
  }

  const text = [angaben.eingehenderText, angaben.stichworte]
    .filter(Boolean)
    .join("\n\n");

  if (!text.trim()) {
    return {
      fachSkill: rueckfallSkill(),
      systemSkills: system,
      begruendung: "rueckfall",
      treffer: [],
    };
  }

  /* --- Stufe 1: Signalwörter ------------------------------------------- */
  const kandidaten = fachSkills().filter((s) => !s.rueckfallebene);
  const treffer = signalwortAbgleich(text, kandidaten);

  if (treffer.length === 0) {
    return {
      fachSkill: rueckfallSkill(),
      systemSkills: system,
      begruendung: "rueckfall",
      treffer: [],
    };
  }

  if (istEindeutig(treffer)) {
    const bester = treffer[0]!;
    return {
      fachSkill: bester.skill,
      systemSkills: system,
      begruendung: "signalwort",
      treffer: bester.woerter,
    };
  }

  /* --- Stufe 2: Einordnung durch das kleine Modell ---------------------- */
  try {
    const eingeordnet = await einordnenLassen(text, treffer.map((t) => t.skill), angaben);
    if (eingeordnet) {
      return {
        fachSkill: eingeordnet,
        systemSkills: system,
        begruendung: "eingeordnet",
        treffer: treffer.find((t) => t.skill === eingeordnet)?.woerter ?? [],
      };
    }
  } catch {
    /* Absichtlich verschluckt: siehe Kommentar über der Funktion. */
  }

  const bester = treffer[0]!;
  return {
    fachSkill: bester.skill,
    systemSkills: system,
    begruendung: "signalwort",
    treffer: bester.woerter,
  };
}

/**
 * Der günstige Einordnungsschritt.
 *
 * Das Modell bekommt **nur die Vorauswahl** und deren Kurzbeschreibungen, nicht
 * die vollständigen Anweisungen aller acht Skills — ein Einordnungsaufruf mit
 * acht vollen Anweisungen wäre teurer als das Formulieren selbst.
 *
 * Es bekommt auch keine Kundennamen: Für die Frage „was für eine Mail ist das"
 * spielt der Name keine Rolle, und was nicht gebraucht wird, geht nicht raus.
 */
async function einordnenLassen(
  text: string,
  kandidaten: Skill[],
  angaben: AuswahlAngaben,
): Promise<Skill | undefined> {
  const liste = kandidaten
    .map((s) => `${s.name}: ${s.kurzbeschreibung}`)
    .join("\n");

  const antwort = await einordnen({
    zweck: "einordnen",
    nutzerId: angaben.nutzerId,
    abbruch: angaben.abbruch,
    hoechstlaenge: 20,
    streuung: 0,
    nachrichten: [
      {
        rolle: "system",
        inhalt:
          "Du ordnest eine geschäftliche E-Mail einer von mehreren Arten zu.\n" +
          "Antworte mit genau einem Wort: dem Namen der Art. Keine Erklärung, " +
          "kein Satz, keine Anführungszeichen.",
      },
      {
        rolle: "nutzer",
        inhalt:
          `Zur Wahl stehen:\n${liste}\n\n` +
          `Text:\n---\n${text.slice(0, 3000)}\n---\n\n` +
          `Welche Art ist das?`,
      },
    ],
  });

  /* Aufräumen, statt auf eine saubere Antwort zu hoffen: Modelle setzen gern
     einen Punkt, Anführungszeichen oder ein „Das ist eine ..." davor. */
  const gesagt = antwort.text
    .toLowerCase()
    .replace(/[^a-zäöüß-]/g, " ")
    .trim();

  return kandidaten.find(
    (s) => gesagt === s.name || gesagt.split(/\s+/).includes(s.name),
  );
}
