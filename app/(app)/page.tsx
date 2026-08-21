import Link from "next/link";
import { Begruessung } from "@/components/begruessung";
import { letzteMails } from "@/lib/db/mails";
import { alleKunden } from "@/lib/db/kunden";

/**
 * Bildschirm 1 — Start (DESIGN.md §5).
 *
 * Die Navigation sitzt in der Seitenleiste. Hier steht der Einstieg in das,
 * was sie den ganzen Tag tut: auf eine Mail antworten. Die Fläche dafür ist
 * deutlich größer, weil sie der Normalfall ist — dass derselbe Weg auch in
 * der Leiste steht, ist kein Widerspruch: die Leiste ist der kurze Sprung
 * von überall her, diese Fläche ist der Anfang des Tages.
 *
 * Seit Phase 12 steht unter „Zuletzt" ihre echte Historie.
 */

function wann(wert: string | null): string {
  if (!wert) return "";

  try {
    const datum = new Date(wert);
    const tage = Math.floor((Date.now() - datum.getTime()) / 86_400_000);

    /* „Heute" und „gestern" liest sich schneller als ein Datum, und mehr
       als eine Woche zurück will sie ohnehin selten wissen. */
    if (tage <= 0) return "heute";
    if (tage === 1) return "gestern";
    if (tage < 7) return `vor ${tage} Tagen`;

    return datum.toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
    });
  } catch {
    return "";
  }
}

export default async function StartSeite() {
  /* Beides ausfallsicher: Die Startseite ist der Einstieg in den Tag. Sie
     darf nicht der Ort sein, an dem eine klemmende Datenbank sie aufhält. */
  const [mails, kunden] = await Promise.all([
    letzteMails(5).catch(() => []),
    alleKunden().catch(() => []),
  ]);

  const namen = new Map(kunden.map((k) => [k.id, k.anzeigename]));

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

        {mails.length === 0 ? (
          <p className="text-m text-text-leise">
            Noch nichts geschrieben. Fang oben an.
          </p>
        ) : (
          <ul className="flex flex-col">
            {mails.map((mail) => (
              <li
                key={mail.id}
                className="flex items-baseline justify-between gap-4 py-3 border-b border-linie"
              >
                <span className="text-m">
                  {mail.kunde_id ? (namen.get(mail.kunde_id) ?? "Ohne Kunde") : "Ohne Kunde"}
                  <span className="text-text-leise">
                    {" · "}
                    {mail.ihre_stichworte ?? mail.betreff ?? "Ohne Betreff"}
                  </span>
                </span>
                <span className="text-xs text-text-leise">
                  {wann(mail.erstellt_am)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
