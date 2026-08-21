import Link from "next/link";

/**
 * Kopfzeile — DESIGN.md §5, Bildschirm „Start".
 * Links der Name, rechts die beiden Bildschirme, die sie öffnen *kann*,
 * aber nie öffnen *muss*: Kunden und Wissen.
 */
export function Kopfzeile() {
  return (
    <header className="border-b border-linie">
      <div className="mx-auto max-w-seite px-4 py-3 flex items-baseline justify-between">
        <Link href="/" className="text-m font-semibold text-text">
          E-Mail
        </Link>
        <nav className="flex gap-5">
          <Link href="/kunden" className="text-m text-gruen hover:underline">
            Kunden
          </Link>
          <Link href="/wissen" className="text-m text-gruen hover:underline">
            Wissen
          </Link>
        </nav>
      </div>
    </header>
  );
}

/** „← Zurück" über den Unterseiten. */
export function Zurueck({ nach = "/" }: { nach?: string }) {
  return (
    <Link
      href={nach}
      className="text-m text-gruen hover:underline inline-block mb-5"
    >
      ← Zurück
    </Link>
  );
}
