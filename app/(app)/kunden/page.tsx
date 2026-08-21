import Link from "next/link";
import { Kundenmarke } from "@/components/bausteine/kundenmarke";
import { kunden } from "@/lib/beispieldaten";

export const metadata = { title: "Kunden" };

/**
 * Bildschirm 4 — Kunden (DESIGN.md §5).
 *
 * Liste in einer Spalte: Name, Sprache, letzter Kontakt.
 * Nichts hier ist Pflichtfeld, nichts muss ausgefüllt werden, damit die App
 * funktioniert. Dieser Bildschirm ist Angebot, nicht Aufgabe.
 */
export default async function KundenSeite({
  searchParams,
}: {
  searchParams: Promise<{ zustand?: string }>;
}) {
  const { zustand } = await searchParams;
  const liste = zustand === "leer" ? [] : kunden;

  return (
    <>
      <main className="max-w-inhalt px-5 py-6">
        <h1 className="text-xl font-semibold mb-5">Kunden</h1>

        {liste.length === 0 ? (
          /* Leere Zustände laden ein (DESIGN.md §7). */
          <p className="text-m text-text-leise">
            Noch keine Kunden. Der erste entsteht, sobald du eine Mail
            schreibst.
          </p>
        ) : (
          <ul className="flex flex-col">
            {liste.map((kunde) => (
              <li key={kunde.id}>
                <Link
                  href={`/kunden/${kunde.id}`}
                  className="flex items-center justify-between gap-4 py-3 border-b border-linie hover:bg-grund-tief transition-colors"
                >
                  <Kundenmarke name={kunde.name} sprache={kunde.sprache} />
                  <span className="text-xs text-text-leise">
                    {kunde.letzterKontakt}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
