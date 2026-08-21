import { SKILL_DATEIEN } from "./inhalte.gen";
import { skillLesen } from "./lesen";
import type { Skill } from "./typen";

/**
 * Alle Skills, einmal gelesen und geprüft.
 *
 * Die Prüfung passiert beim ersten Zugriff und wirft bei einem Fehler laut:
 * Ein Skill mit kaputtem Kopf würde sonst still fehlen, und die App wählte
 * die Rückfallebene, ohne dass jemand den Grund fände.
 */

let gelesen: Skill[] | undefined;

function alleLesen(): Skill[] {
  const skills = Object.entries(SKILL_DATEIEN).map(([datei, inhalt]) =>
    skillLesen(datei, inhalt),
  );

  const fach = skills.filter((s) => s.klasse === "fach");
  const rueckfall = fach.filter((s) => s.rueckfallebene);

  if (rueckfall.length !== 1) {
    /* Ohne genau eine Rückfallebene ist die Auswahl nicht entscheidbar:
       bei keiner bliebe eine Mail ohne Skill, bei mehreren wäre die Wahl
       zwischen ihnen willkürlich. */
    throw new Error(
      `Genau ein Fach-Skill muss "rueckfallebene: true" tragen, gefunden: ${
        rueckfall.length === 0
          ? "keiner"
          : rueckfall.map((s) => s.name).join(", ")
      }.`,
    );
  }

  return skills;
}

export function alleSkills(): Skill[] {
  gelesen ??= alleLesen();
  return gelesen;
}

export function fachSkills(): Skill[] {
  return alleSkills().filter((s) => s.klasse === "fach");
}

export function systemSkills(): Skill[] {
  return alleSkills().filter((s) => s.klasse === "system");
}

export function skillFinden(name: string): Skill | undefined {
  return alleSkills().find((s) => s.name === name);
}

/** Der Skill, der greift, wenn kein anderer passt. */
export function rueckfallSkill(): Skill {
  const skill = fachSkills().find((s) => s.rueckfallebene);
  if (!skill) throw new Error("Kein Rückfall-Skill vorhanden.");
  return skill;
}

/** Nur für Tests: erzwingt das Neulesen. */
export function registerVergessen(): void {
  gelesen = undefined;
}
