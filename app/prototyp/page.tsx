import Link from "next/link";

export const metadata = { title: "Prototyp-Übersicht" };

/**
 * Nur für den User — diese Seite ist von nirgends aus verlinkt und
 * verschwindet am Ende von Phase 1 wieder.
 *
 * Sie führt zu jedem Bildschirm und jedem Zustand, damit der Design-Prototyp
 * vollständig beurteilt werden kann, ohne dass Kulisse in die eigentlichen
 * Bildschirme wandert.
 */

const gruppen: { titel: string; eintraege: { pfad: string; was: string }[] }[] =
  [
    {
      titel: "1 · Start",
      eintraege: [{ pfad: "/", was: "Begrüßung, zwei Flächen, letzte Mails" }],
    },
    {
      titel: "2 · Antworten",
      eintraege: [
        { pfad: "/antworten", was: "Normalfall — auf eine Mail antworten" },
        { pfad: "/antworten?art=neu", was: "Neue Mail, ohne eingehenden Text" },
        {
          pfad: "/antworten?zustand=laeuft",
          was: "Während gearbeitet wird — eine Zeile Text, kein Ladekreis",
        },
        {
          pfad: "/antworten?zustand=kunde-unklar",
          was: "Kunde nicht erkannt — die App fragt, statt zu raten",
        },
        {
          pfad: "/antworten?zustand=fehler",
          was: "Verbindung klemmt — ihr Text ist gespeichert",
        },
      ],
    },
    {
      titel: "3 · Ergebnis",
      eintraege: [
        {
          pfad: "/antworten/ergebnis",
          was: "Zwei Fassungen zur Auswahl — knapp und ausführlicher",
        },
        {
          pfad: "/antworten/ergebnis?gewaehlt=knapp",
          was: "Gewählte Fassung, bearbeitbar, mit Kopieren und Bewertung",
        },
        {
          pfad: "/antworten/ergebnis?sprache=en",
          was: "Englischer Kunde — mit Rückübersetzung zum Gegenlesen",
        },
        {
          pfad: "/antworten/ergebnis?gewaehlt=knapp&zustand=regelvorschlag",
          was: "Abgeleitete Regel wird vorgeschlagen, nie still übernommen",
        },
        {
          pfad: "/antworten/ergebnis?gewaehlt=knapp&zustand=zahl-ohne-beleg",
          was: "Eine Angabe stand nirgends — sie muss es sehen",
        },
      ],
    },
    {
      titel: "4 · Kunden",
      eintraege: [
        { pfad: "/kunden", was: "Liste" },
        { pfad: "/kunden?zustand=leer", was: "Noch keine Kunden" },
        { pfad: "/kunden/meier", was: "Akte mit Gelerntem und Regeln" },
        { pfad: "/kunden/nordfood", was: "Akte, zu der noch nichts bekannt ist" },
      ],
    },
    {
      titel: "5 · Wissen",
      eintraege: [
        { pfad: "/wissen", was: "Glossar, Bausteine, Unterlagen, Vorschläge" },
        { pfad: "/wissen?zustand=leer", was: "Alles leer — wie am ersten Tag" },
      ],
    },
    {
      titel: "Randfälle",
      eintraege: [
        { pfad: "/gibtsnicht", was: "Seite nicht gefunden" },
        { pfad: "/anmelden", was: "Anmeldung per Link" },
      ],
    },
  ];

export default function PrototypSeite() {
  return (
    <main className="mx-auto max-w-inhalt px-4 py-6">
      <h1 className="text-xl font-semibold mb-2">Prototyp — alle Zustände</h1>
      <p className="text-m text-text-leise mb-6">
        Diese Seite ist nur für dich. Sie ist von nirgends verlinkt und fällt
        am Ende von Phase 1 weg.
      </p>

      {gruppen.map((gruppe) => (
        <section key={gruppe.titel} className="mb-6">
          <h2 className="text-s font-semibold text-text-leise mb-3">
            {gruppe.titel}
          </h2>
          <ul>
            {gruppe.eintraege.map((eintrag) => (
              <li key={eintrag.pfad} className="py-2 border-b border-linie">
                <Link
                  href={eintrag.pfad}
                  className="text-m text-gruen hover:underline"
                >
                  {eintrag.was}
                </Link>
                <div className="text-xs text-text-leise">{eintrag.pfad}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
