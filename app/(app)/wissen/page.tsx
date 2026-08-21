import { Regelverwaltung } from "@/components/regelverwaltung";
import { Glossarliste } from "@/components/wissen/glossarliste";
import { Bausteinliste } from "@/components/wissen/bausteinliste";
import { Unterlagenliste } from "@/components/wissen/unterlagenliste";
import { regelnAlle } from "@/lib/db/regeln";
import { konflikteFinden } from "@/lib/lernen/konflikt";
import { glossarLaden } from "@/lib/db/glossar";
import { bausteineAlle } from "@/lib/db/bausteine";
import { unterlagenAlle } from "@/lib/wissen/dokumente";

export const metadata = { title: "Wissen" };

/**
 * Bildschirm 5 — Wissen (DESIGN.md §5).
 *
 * Vier Abschnitte: Fachbegriffe, Textbausteine, Unterlagen und — seit
 * Phase 8 — was die App sich gemerkt hat. Vorschläge der App stehen oben
 * unter „Ist das richtig?" mit Übernehmen und Verwerfen.
 *
 * **Dieser Bildschirm darf nie geöffnet werden müssen** — er ist Angebot,
 * nicht Aufgabe. Die App funktioniert, wenn sie ihn nie ansieht: Das Glossar
 * füllt sich beim Übersetzen, die Regeln beim Korrigieren, die Unterlagen
 * sind ein Zusatz. Nur die Textbausteine legt jemand von Hand an, und auch
 * die nur einmal.
 *
 * Seit Phase 10 stehen hier echte Daten statt Kulisse.
 */
export default async function WissenSeite() {
  /* Jeder Teil einzeln und ausfallsicher. Fällt einer aus, fehlt ein
     Abschnitt — der Bildschirm öffnet trotzdem. */
  const [glossar, bausteine, unterlagen, regeln] = await Promise.all([
    glossarLaden(),
    bausteineAlle(),
    unterlagenAlle(),
    regelnAlle().catch(() => []),
  ]);

  return (
    <>
      <main className="max-w-inhalt px-5 py-6">
        <h1 className="text-xl font-semibold mb-5">Wissen</h1>

        <section className="mb-7">
          <h2 className="text-s font-semibold text-text-leise mb-3">
            Fachbegriffe
          </h2>
          <Glossarliste eintraege={glossar} />
        </section>

        <section className="mb-7">
          <h2 className="text-s font-semibold text-text-leise mb-3">
            Textbausteine
          </h2>
          <Bausteinliste bausteine={bausteine} />
        </section>

        <section className="mb-7">
          <h2 className="text-s font-semibold text-text-leise mb-3">
            Unterlagen
          </h2>
          <Unterlagenliste unterlagen={unterlagen} />
        </section>

        {/* Vierter Abschnitt, in Phase 8 dazugekommen. `DESIGN.md` §5 nennt
            für diesen Bildschirm drei. Die Regelverwaltung aus `PLAN.md` §6
            braucht aber einen Ort, und keiner der fünf Bildschirme passt
            besser: Was die App gelernt hat, ist Wissen. Vor allem gilt hier
            dieselbe Leitidee — Angebot, nicht Aufgabe. */}
        <section>
          <h2 className="text-s font-semibold text-text-leise mb-3">
            Was ich mir gemerkt habe
          </h2>
          <Regelverwaltung
            anfangsregeln={regeln}
            konflikte={konflikteFinden(regeln)}
          />
        </section>
      </main>
    </>
  );
}
