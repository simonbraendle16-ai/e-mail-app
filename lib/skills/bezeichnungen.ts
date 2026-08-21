/**
 * Wie die Skills in der Oberfläche heißen.
 *
 * Getrennt von den Skill-Dateien, weil dort technische Bezeichner stehen
 * (`anfrage-angebot`) und sie einen deutschen Satz lesen soll
 * („Als Anfrage behandelt"). `DESIGN.md` §7: keine Fachbegriffe.
 *
 * Fehlt eine Bezeichnung, wird der Bezeichner lesbar gemacht statt einen
 * Fehler zu werfen — ein neuer Skill soll auch ohne Eintrag hier funktionieren.
 */

const BEZEICHNUNGEN: Record<string, string> = {
  liefertermin: "Liefertermin-Mail",
  "anfrage-angebot": "Anfrage",
  "auftrag-bestellung": "Bestellung",
  allgemein: "allgemeine Mail",
};

export function bezeichnung(skillName: string): string {
  const bekannt = BEZEICHNUNGEN[skillName];
  if (bekannt) return bekannt;

  /* Rückfall: „neuer-skill" wird zu „Neuer Skill". */
  return skillName
    .split("-")
    .map((teil) => teil.charAt(0).toUpperCase() + teil.slice(1))
    .join(" ");
}
