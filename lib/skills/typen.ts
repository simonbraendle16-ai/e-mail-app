/**
 * Was ein Skill ist (`SKILLS.md`).
 *
 * Ein Skill ist ein benannter Anweisungsbaustein mit eigenen Signalwörtern,
 * eigenem Kontextbedarf und eigener Modellstufe. Skills liegen als Dateien
 * unter `skills/<name>.md` — eine neue Fähigkeit ist eine neue Datei, kein
 * Codeeingriff.
 */

import type { Stufe } from "@/lib/modell/schnittstelle";

export type SkillKlasse = "fach" | "system";

/** Welche Wissensquellen ein Skill braucht. Spart Token, wo sie nichts bringen. */
export type Kontextquelle =
  | "kundenakte"
  | "letzte_mails"
  | "letzte_fassungen"
  | "textbausteine"
  | "dokumente"
  | "preislisten"
  | "sortiment"
  | "glossar"
  | "stilregeln";

export type Skill = {
  name: string;
  klasse: SkillKlasse;
  /** Wörter, die diesen Skill in Betracht ziehen lassen — ohne Modell. */
  signalwoerter: string[];
  kontext: Kontextquelle[];
  modell: Stufe;
  /** Wann ein System-Skill läuft. Fach-Skills tragen das nicht. */
  laeuft?: string;
  /** Greift, wenn kein anderer Fach-Skill passt. Genau einer trägt das. */
  rueckfallebene?: boolean;
  /** Überschreibt die übliche Streuung — die Rückübersetzung braucht 0.1. */
  streuung?: number;

  /**
   * Der Fließtext unter dem Kopf — Zweck, Aufbau, Regeln, Grenzen.
   * Geht wörtlich als Block 3 in die Anweisung (`MODELL.md` §2).
   */
  anweisung: string;

  /** Erste Zeile des Zweck-Abschnitts. Für die Einordnung und die Anzeige. */
  kurzbeschreibung: string;
};

/**
 * Wie ein Skill ausgewählt wurde. Sie sieht das immer, deshalb muss es
 * erklärbar sein und nicht nur ein Ergebnis (`SKILLS.md`).
 */
export type SkillWahl = {
  fachSkill: Skill;
  systemSkills: Skill[];
  /** Wie die Wahl zustande kam — für die Anzeige und zum Nachvollziehen. */
  begruendung: "signalwort" | "eingeordnet" | "rueckfall" | "von-ihr-gewaehlt";
  /** Welche Signalwörter getroffen haben. Leer bei Rückfall. */
  treffer: string[];
};
