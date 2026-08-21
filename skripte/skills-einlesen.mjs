/**
 * Liest `skills/*.md` und schreibt sie als TypeScript-Modul nach
 * `lib/skills/inhalte.gen.ts`.
 *
 * **Warum überhaupt?** `SKILLS.md` sagt: „Skills liegen als Dateien im Repo
 * und werden beim Start eingelesen." Auf Cloudflare Workers gibt es aber kein
 * Dateisystem — `readFileSync` zur Laufzeit ginge dort nicht. Deshalb wandern
 * die Dateien beim Bauen in den Code.
 *
 * **Der Anspruch bleibt erfüllt:** Eine neue Fähigkeit ist weiterhin eine neue
 * Datei unter `skills/`, kein Codeeingriff. „Beim Start eingelesen" heißt auf
 * Cloudflare ohnehin „beim Ausliefern" — und dieses Skript läuft automatisch
 * vor jedem Bau und vor `npm run dev`.
 *
 * Aufruf: node skripte/skills-einlesen.mjs
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const hier = dirname(fileURLToPath(import.meta.url));
const wurzel = join(hier, "..");
const skillOrdner = join(wurzel, "skills");
const ziel = join(wurzel, "lib", "skills", "inhalte.gen.ts");

const dateien = readdirSync(skillOrdner)
  .filter((d) => d.endsWith(".md"))
  .sort();

if (dateien.length === 0) {
  console.error(
    "Keine Skill-Dateien in skills/ gefunden. Ohne mindestens einen " +
      "Fach-Skill mit rueckfallebene: true kann die App nichts einordnen.",
  );
  process.exit(1);
}

const eintraege = dateien.map((datei) => {
  const inhalt = readFileSync(join(skillOrdner, datei), "utf8");
  /* JSON.stringify erledigt das Escapen von Anführungszeichen, Zeilenumbrüchen
     und allem, was sonst in einem Markdown-Text vorkommt. */
  return `  [${JSON.stringify(datei)}]: ${JSON.stringify(inhalt)},`;
});

const ausgabe = `/**
 * ERZEUGT — nicht von Hand ändern.
 *
 * Inhalt von \`skills/*.md\`, eingebettet zur Bauzeit. Auf Cloudflare Workers
 * gibt es kein Dateisystem; deshalb wandern die Dateien beim Bauen hierher.
 *
 * Neu erzeugen: npm run skills
 * Läuft automatisch vor \`npm run dev\` und \`npm run build\`.
 *
 * Zuletzt erzeugt aus ${dateien.length} Datei${dateien.length === 1 ? "" : "en"}.
 */

export const SKILL_DATEIEN: Record<string, string> = {
${eintraege.join("\n")}
};
`;

writeFileSync(ziel, ausgabe, "utf8");

console.log(
  `${dateien.length} Skills eingelesen: ${dateien
    .map((d) => d.replace(/\.md$/, ""))
    .join(", ")}`,
);
