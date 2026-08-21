import { Zurueck } from "@/components/zurueck";
import { Skillmarke } from "@/components/skillmarke";
import { bezeichnung } from "@/lib/skills/bezeichnungen";
import { fachSkills } from "@/lib/skills/register";
import { Knopf, KnopfLink } from "@/components/bausteine/knopf";
import { Papier, Mailtext } from "@/components/bausteine/papier";
import { Hinweisstreifen } from "@/components/bausteine/hinweisstreifen";
import { Aufklappbar } from "./aufklappbar";
import { Werkzeugleiste } from "./werkzeugleiste";
import {
  fassungAusfuehrlich,
  fassungEnglisch,
  fassungKnapp,
  kunden,
  regelVorschlag,
  rueckuebersetzung,
} from "@/lib/beispieldaten";

export const metadata = { title: "Ergebnis" };

/**
 * Bildschirm 3 — Ergebnis (DESIGN.md §5).
 *
 * Zwei Zustände, beide hier zu sehen:
 *
 *  1. Auswahl — zwei Fassungen nebeneinander, knapp und ausführlicher.
 *     Ihr Engpass ist Grübelzeit, nicht Tipparbeit. Auswählen bricht eine
 *     Grübelschleife zuverlässiger als ein einzelner Vorschlag, den man
 *     dann doch wieder zerdenkt (CLAUDE.md §1, SKILLS.md).
 *
 *  2. Gewählt — die Mail allein, direkt bearbeitbar, mit Kopieren,
 *     „Passt nicht?", Fassung zurück und der Bewertung.
 *
 * Phase 1: Kulisse. Die Logik entsteht in Phase 5 bis 8.
 */

const meier = kunden[0]!;
const vanDijk = kunden[1]!;

export default async function ErgebnisSeite({
  searchParams,
}: {
  searchParams: Promise<{
    gewaehlt?: string;
    sprache?: string;
    zustand?: string;
    skill?: string;
  }>;
}) {
  const { gewaehlt, sprache, zustand, skill } = await searchParams;

  /* Die waehlbaren Skills kommen aus den Dateien unter skills/, nicht aus einer
     Liste im Code: Eine neue Datei erscheint hier von allein (SKILLS.md). */
  const waehlbareSkills = fachSkills().map((s) => ({
    name: s.name,
    bezeichnung: bezeichnung(s.name),
  }));
  const aktiverSkill =
    skill && waehlbareSkills.some((s) => s.name === skill)
      ? skill
      : "liefertermin";
  const englisch = sprache === "en";
  const kunde = englisch ? vanDijk : meier;
  const zeigtVorschlag = zustand === "regelvorschlag";
  const zahlOhneBeleg = zustand === "zahl-ohne-beleg";

  const gewaehlteFassung = englisch
    ? fassungEnglisch
    : gewaehlt === "ausfuehrlich"
      ? fassungAusfuehrlich
      : fassungKnapp;

  return (
    <>
      <main className="max-w-seite px-5 py-6">
        <Zurueck nach="/antworten" />

        {/* Sie sieht immer, welcher Skill greift, und kann umschalten
            (SKILLS.md). Die Auswahl kommt aus den Skill-Dateien, nicht aus
            einer Liste im Code — ein neuer Skill erscheint hier von allein. */}
        <div className="mb-5">
          <Skillmarke
            aktiv={{ name: aktiverSkill, bezeichnung: bezeichnung(aktiverSkill) }}
            auswahl={waehlbareSkills}
          />
        </div>

        {zahlOhneBeleg ? (
          <div className="mb-5 max-w-inhalt">
            <Hinweisstreifen>
              Das Datum im Text stand nirgends in deinen Angaben. Schau bitte
              drüber, bevor du die Mail abschickst.
            </Hinweisstreifen>
          </div>
        ) : null}

        {gewaehlt || englisch ? (
          /* --- Zustand 2: eine Fassung, die Arbeitsfläche ------------- */
          <div className="max-w-inhalt flex flex-col gap-5">
            <Papier>
              <Mailtext text={gewaehlteFassung} />
            </Papier>

            <Werkzeugleiste kundenname={kunde.name} />

            {englisch ? (
              /* Ihr Sicherheitsnetz: sie braucht die App, weil sie das
                 Fach-Englisch nicht sicher beurteilen kann (SKILLS.md §8). */
              <Aufklappbar zeile="Steht da, was du meinst?">
                <p className="text-s text-text-leise mb-3">
                  Das Englische, zurück ins Deutsche übertragen — wörtlich,
                  nicht schön. Steht hier, was du sagen wolltest, stimmt es.
                </p>
                <Papier>
                  <Mailtext text={rueckuebersetzung} />
                </Papier>
              </Aufklappbar>
            ) : null}

            {zeigtVorschlag ? (
              /* Abgeleitete Regeln werden immer nur vorgeschlagen, nie
                 stillschweigend übernommen (PLAN.md §4). */
              <div className="flex flex-col gap-3">
                <Hinweisstreifen>
                  {regelVorschlag.beobachtung} {regelVorschlag.frage}
                </Hinweisstreifen>
                <div className="flex gap-3">
                  <Knopf art="neben">Ja, merken</Knopf>
                  <Knopf art="neben">Nur bei {kunde.name}</Knopf>
                  <Knopf art="text">Nein</Knopf>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          /* --- Zustand 1: zwei Fassungen zur Auswahl ------------------ */
          <>
            <p className="text-m text-text-leise mb-5">
              Zwei Fassungen. Nimm die, die passt — du kannst sie danach noch
              ändern.
            </p>

            <div className="grid grid-cols-2 gap-5">
              {[
                { marke: "knapp", titel: "Knapp", text: fassungKnapp },
                {
                  marke: "ausfuehrlich",
                  titel: "Ausführlicher",
                  text: fassungAusfuehrlich,
                },
              ].map((fassung) => (
                <div key={fassung.marke} className="flex flex-col gap-3">
                  <h2 className="text-s font-semibold text-text-leise">
                    {fassung.titel}
                  </h2>
                  <Papier className="flex-1">
                    <Mailtext text={fassung.text} />
                  </Papier>
                  <div>
                    <KnopfLink
                      art="neben"
                      href={`/antworten/ergebnis?gewaehlt=${fassung.marke}`}
                    >
                      Diese nehmen
                    </KnopfLink>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
