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
 *
 * Die Flächen sitzen bündig am Rand und reichen von oben nach unten durch.
 * Sie sind das Erste, was sie morgens sieht — sie sollen als Fläche wirken,
 * auf die man drauftippt, nicht als Kästchen in der Bildschirmmitte.
 */
export default function StartSeite() {
  return (
    <>
      <Kopfzeile />
      <main>
        <div className="px-4 py-6">
          <Begruessung />
        </div>

        {/* Randbündig: kein Abstand nach links, nach rechts oder zwischen
            Fläche und Fensterkante. Links deutlich größer — der Normalfall. */}
        <div className="grid grid-cols-[3fr_2fr] gap-1 min-h-[380px]">
          <Link
            href="/antworten"
            className="bg-papier px-6 py-7 text-2xl font-semibold text-text hover:bg-grund-tief transition-colors flex items-center"
          >
            Auf eine Mail
            <br />
            antworten
          </Link>

          <Link
            href="/antworten?art=neu"
            className="bg-grund-tief px-6 py-7 text-xl font-semibold text-text hover:bg-papier transition-colors flex items-center"
          >
            Neue Mail
            <br />
            schreiben
          </Link>
        </div>

        {/* Die Liste bleibt auf Lesebreite. Über die ganze Fensterbreite
            gespreizt fielen Kunde und Datum so weit auseinander, dass man
            die Zeile zweimal lesen müsste. */}
        <div className="px-4 py-6 max-w-seite">
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
    </>
  );
}
