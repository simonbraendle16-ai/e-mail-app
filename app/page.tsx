import Link from "next/link";
import { Kopfzeile } from "@/components/kopfzeile";
import { Begruessung } from "@/components/begruessung";
import { letzteMails } from "@/lib/beispieldaten";

/**
 * Bildschirm 1 — Start (DESIGN.md §5).
 *
 * Zwei Flächen. Die linke ist deutlich größer, weil sie der Normalfall ist:
 * Auf eine Mail antworten. Darunter die letzten Mails zum Weiterarbeiten.
 * Sonst passiert hier nichts.
 */

export default function StartSeite() {
  return (
    <>
      <Kopfzeile />
      <main className="mx-auto max-w-seite px-4 py-7">
        <Begruessung />

        {/* Links deutlich größer — sie ist der Normalfall. */}
        <div className="grid grid-cols-[3fr_2fr] gap-4 mb-8">
          <Link
            href="/antworten"
            className="bg-papier rounded-karte shadow-papier px-5 py-7 text-xl font-semibold text-text hover:bg-grund-tief transition-colors"
          >
            Auf eine Mail
            <br />
            antworten
          </Link>

          <Link
            href="/antworten?art=neu"
            className="bg-grund-tief rounded-karte border border-linie px-5 py-7 text-m font-semibold text-text hover:bg-papier transition-colors"
          >
            Neue Mail
            <br />
            schreiben
          </Link>
        </div>

        <h2 className="text-s font-semibold text-text-leise mb-3">Zuletzt</h2>

        {letzteMails.length === 0 ? (
          <p className="text-m text-text-leise">
            Noch nichts geschrieben. Fang oben an.
          </p>
        ) : (
          <ul className="flex flex-col">
            {letzteMails.slice(0, 5).map((mail) => (
              <li key={mail.id}>
                <Link
                  href="/antworten/ergebnis"
                  className="flex items-baseline justify-between gap-4 py-3 border-b border-linie hover:bg-grund-tief transition-colors"
                >
                  <span className="text-m">
                    {mail.kunde}
                    <span className="text-text-leise"> · {mail.thema}</span>
                  </span>
                  <span className="text-xs text-text-leise">{mail.wann}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
