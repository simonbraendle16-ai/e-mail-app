import { bezeichnung } from "@/lib/skills/bezeichnungen";
import { fachSkills } from "@/lib/skills/register";
import { Antwortformular } from "./formular";

export const metadata = { title: "Antwort schreiben" };

/**
 * Bildschirm 2 — Antworten (`DESIGN.md` §5).
 *
 * Der Bildschirm, auf dem sie den Tag verbringt. Drei Bereiche untereinander:
 * Kundenmail einfügen · was sie sagen will · fertige Antwort.
 *
 * Die Arbeit passiert im Formular (Client), weil der Text einlaufen muss,
 * während er entsteht. Hier steht nur, was sich nicht ändert.
 */
export default async function AntwortenSeite({
  searchParams,
}: {
  searchParams: Promise<{ art?: string }>;
}) {
  const { art } = await searchParams;
  const neueMail = art === "neu";

  /* Die wählbaren Skills kommen aus den Dateien unter `skills/`, nicht aus
     einer Liste im Code — ein neuer Skill erscheint hier von allein. */
  const waehlbareSkills = fachSkills().map((s) => ({
    name: s.name,
    bezeichnung: bezeichnung(s.name),
  }));

  return (
    <main className="max-w-inhalt px-5 py-6">
      <h1 className="text-xl font-semibold mb-5">
        {neueMail ? "Neue Mail schreiben" : "Antwort schreiben"}
      </h1>

      <Antwortformular waehlbareSkills={waehlbareSkills} neueMail={neueMail} />
    </main>
  );
}
