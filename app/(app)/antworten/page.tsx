import Link from "next/link";
import { KnopfLink } from "@/components/bausteine/knopf";
import { Textbereich } from "@/components/bausteine/feld";
import { Kundenmarke } from "@/components/bausteine/kundenmarke";
import { Hinweisstreifen } from "@/components/bausteine/hinweisstreifen";
import { eingegangeneMail, ihreStichworte, kunden } from "@/lib/beispieldaten";

export const metadata = { title: "Antwort schreiben" };

/**
 * Bildschirm 2 — Antworten (DESIGN.md §5).
 *
 * Drei Bereiche untereinander: Kundenmail einfügen · was sie sagen will ·
 * ein Knopf. Der Kunde wird beim Einfügen erkannt und angezeigt — nicht als
 * Auswahlliste, die sie bedienen muss, sondern als Feststellung mit der
 * Möglichkeit zu widersprechen.
 *
 * Phase 1: Kulisse. Die Zustände sind über die Adresse erreichbar, damit sie
 * beurteilt werden können. Die Logik entsteht in Phase 5.
 */

const meier = kunden[0]!;

/** Ehrlich, ruhig, ohne Zahlen, die niemand prüfen kann (DESIGN.md §5). */
const SCHRITTE = [
  "Ich schaue nach, was wir Meier & Co. zuletzt geschrieben haben.",
  "Ich formuliere.",
];

export default async function AntwortenSeite({
  searchParams,
}: {
  searchParams: Promise<{ art?: string; zustand?: string }>;
}) {
  const { art, zustand } = await searchParams;
  const neueMail = art === "neu";
  const laeuft = zustand === "laeuft";
  const kundeUnklar = zustand === "kunde-unklar";
  const fehler = zustand === "fehler";

  return (
    <>
      <main className="max-w-inhalt px-5 py-6">

        <h1 className="text-xl font-semibold mb-5">
          {neueMail ? "Neue Mail schreiben" : "Antwort schreiben"}
        </h1>

        {/* Der Kunde: Feststellung, nicht Auswahlliste. */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-s text-text-leise font-semibold">Kunde</span>
          {kundeUnklar ? (
            <span className="text-m text-text-leise">noch offen</span>
          ) : (
            <>
              <Kundenmarke name={meier.name} sprache={meier.sprache} />
              <Link
                href="/kunden"
                className="text-m text-gruen hover:underline"
              >
                ändern
              </Link>
            </>
          )}
        </div>

        {kundeUnklar ? (
          <div className="mb-5">
            <Hinweisstreifen>
              Zu wem gehört diese Mail? Sag es mir einmal, dann merke ich es
              mir.
            </Hinweisstreifen>
          </div>
        ) : null}

        {fehler ? (
          <div className="mb-5">
            <Hinweisstreifen>
              Die Verbindung klemmt gerade. Dein Text ist gespeichert, probier
              es in einer Minute nochmal.
            </Hinweisstreifen>
          </div>
        ) : null}

        <div className="flex flex-col gap-5">
          {neueMail ? null : (
            <Textbereich
              beschriftung="Mail vom Kunden"
              name="eingehend"
              rows={8}
              defaultValue={eingegangeneMail}
              placeholder="Die Mail hier einfügen."
            />
          )}

          <Textbereich
            beschriftung="Was möchtest du sagen?"
            hilfe="Zwei Sätze reichen. Stichworte genügen."
            name="stichworte"
            rows={3}
            defaultValue={ihreStichworte}
            placeholder="Lieferung geht Freitag raus"
          />

          {laeuft ? (
            /* Kein Ladekreis, kein Fortschrittsbalken. Eine Zeile Text,
               die sagt, was gerade passiert (DESIGN.md §5). */
            <div aria-live="polite" className="py-3">
              <p className="text-m text-text-leise">{SCHRITTE[0]}</p>
            </div>
          ) : (
            <div className="flex justify-end">
              <KnopfLink href="/antworten/ergebnis">
                Antwort schreiben
              </KnopfLink>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
