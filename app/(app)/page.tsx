import Link from "next/link";
import { Begruessung } from "@/components/begruessung";
import { letzteMails } from "@/lib/beispieldaten";

/**
 * Bildschirm 1 — Start (DESIGN.md §5).
 *
 * Die Navigation sitzt in der Seitenleiste. Hier steht der Einstieg in das,
 * was sie den ganzen Tag tut: auf eine Mail antworten. Die Fläche dafür ist
 * deutlich größer, weil sie der Normalfall ist — dass derselbe Weg auch in
 * der Leiste steht, ist kein Widerspruch: die Leiste ist der kurze Sprung
 * von überall her, diese Fläche ist der Anfang des Tages.
 */
export default function StartSeite() {
  return (
    <main>
      <div className="px-5 pt-6 pb-4">
        <Begruessung />
      </div>

      {/* Randbündig zum Inhaltsbereich, ohne Rundung. */}
      <div className="grid grid-cols-[3fr_2fr] gap-1">
        <Link
          href="/antworten"
          className="bg-papier px-6 py-8 text-2xl font-semibold text-text hover:bg-grund-tief transition-colors flex items-center"
        >
          Auf eine Mail
          <br />
          antworten
        </Link>

        <Link
          href="/antworten?art=neu"
          className="bg-grund-tief px-6 py-8 text-xl font-semibold text-text hover:bg-papier transition-colors flex items-center"
        >
          Neue Mail
          <br />
          schreiben
        </Link>
      </div>

      {/* Die Liste bleibt auf Lesebreite. Über die ganze Fensterbreite
          gespreizt fielen Kunde und Datum so weit auseinander, dass man
          die Zeile zweimal lesen müsste. */}
      <div className="px-5 py-6 max-w-seite">
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
      </div>
    </main>
  );
}
