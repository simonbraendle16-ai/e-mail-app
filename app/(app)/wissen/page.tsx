import { Knopf } from "@/components/bausteine/knopf";
import { Regelverwaltung } from "@/components/regelverwaltung";
import { regelnAlle } from "@/lib/db/regeln";
import { konflikteFinden } from "@/lib/lernen/konflikt";
import {
  dokumente,
  glossar,
  glossarVorschlaege,
  textbausteine,
} from "@/lib/beispieldaten";

export const metadata = { title: "Wissen" };

/**
 * Bildschirm 5 — Wissen (DESIGN.md §5).
 *
 * Drei Abschnitte: Glossar, Textbausteine, Dokumente. Vorschläge der App
 * stehen oben unter „Ist das richtig?" mit Übernehmen und Verwerfen.
 *
 * Dieser Bildschirm darf nie geöffnet werden müssen — er ist Angebot,
 * nicht Aufgabe. Die App funktioniert, wenn sie ihn nie ansieht.
 */
export default async function WissenSeite({
  searchParams,
}: {
  searchParams: Promise<{ zustand?: string }>;
}) {
  const { zustand } = await searchParams;
  const leer = zustand === "leer";

  /* Ein Ausfall der Datenbank darf diesen Bildschirm nicht sprengen — er ist
     Angebot, nicht Aufgabe. Dann steht der Abschnitt eben leer da. */
  const regeln = await regelnAlle().catch(() => []);
  const konflikte = konflikteFinden(regeln);

  return (
    <>
      <main className="max-w-inhalt px-5 py-6">
        <h1 className="text-xl font-semibold mb-5">Wissen</h1>

        {/* Vorschläge stehen oben. Ein Klick, und der Begriff ist verbindlich. */}
        {!leer && glossarVorschlaege.length > 0 ? (
          <section className="mb-7">
            <h2 className="text-s font-semibold text-text-leise mb-3">
              Ist das richtig?
            </h2>
            <ul className="flex flex-col gap-3">
              {glossarVorschlaege.map((eintrag) => (
                <li
                  key={eintrag.de}
                  className="bg-hinweis-flae border-l-[3px] border-hinweis px-4 py-3"
                >
                  <p className="text-m mb-3">
                    Heißt <strong>{eintrag.de}</strong> bei euch{" "}
                    <strong>{eintrag.en}</strong>?
                  </p>
                  <div className="flex gap-3">
                    <Knopf art="neben">Ja, so heißt das</Knopf>
                    <Knopf art="text">Verwerfen</Knopf>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mb-7">
          <h2 className="text-s font-semibold text-text-leise mb-3">
            Fachbegriffe
          </h2>
          {leer || glossar.length === 0 ? (
            <p className="text-m text-text-leise">
              Noch keine Begriffe. Sie sammeln sich, während du schreibst — ich
              frage beim Übersetzen einmal nach, und dann steht es fest.
            </p>
          ) : (
            <ul>
              {glossar.map((eintrag) => (
                <li
                  key={eintrag.de}
                  className="flex items-baseline justify-between gap-4 py-3 border-b border-linie"
                >
                  <span className="text-m">
                    {eintrag.de}
                    <span className="text-text-leise"> → </span>
                    {eintrag.en}
                  </span>
                  <span className="text-xs text-text-leise">
                    {eintrag.bereich}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-7">
          <h2 className="text-s font-semibold text-text-leise mb-3">
            Textbausteine
          </h2>
          {leer ? (
            <p className="text-m text-text-leise">
              Noch keine Bausteine. Deine Signatur und feste Formulierungen
              kommen hierher.
            </p>
          ) : (
            <ul>
              {textbausteine.map((baustein) => (
                <li
                  key={baustein.name}
                  className="flex items-baseline justify-between gap-4 py-3 border-b border-linie"
                >
                  <span className="text-m">{baustein.name}</span>
                  <span className="text-xs text-text-leise">
                    {baustein.zweck}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-s font-semibold text-text-leise mb-3">
            Unterlagen
          </h2>
          {leer ? (
            <p className="text-m text-text-leise">
              Noch keine Unterlagen. Preislisten und Angebote kannst du hier
              ablegen — dann kenne ich die Zahlen daraus.
            </p>
          ) : (
            <ul className="mb-4">
              {dokumente.map((dokument) => (
                <li
                  key={dokument.name}
                  className="flex items-baseline justify-between gap-4 py-3 border-b border-linie"
                >
                  <span className="text-m">{dokument.name}</span>
                  <span className="text-xs text-text-leise">
                    {dokument.art} · {dokument.stand}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Knopf art="neben">Unterlage hinzufügen</Knopf>
        </section>

        {/* Vierter Abschnitt, in Phase 8 dazugekommen. `DESIGN.md` §5 nennt
            für diesen Bildschirm drei — Glossar, Textbausteine, Dokumente.
            Die Regelverwaltung aus `PLAN.md` §6 braucht aber einen Ort, und
            keiner der fünf Bildschirme passt besser: Was die App gelernt
            hat, ist Wissen. Vor allem gilt hier dieselbe Leitidee — Angebot,
            nicht Aufgabe. Sie muss nie hierher, sie kann. */}
        <section className="mt-7">
          <h2 className="text-s font-semibold text-text-leise mb-3">
            Was ich mir gemerkt habe
          </h2>
          <Regelverwaltung anfangsregeln={regeln} konflikte={konflikte} />
        </section>
      </main>
    </>
  );
}
