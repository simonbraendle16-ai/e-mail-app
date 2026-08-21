import Link from "next/link";
import { Kundenmarke } from "@/components/bausteine/kundenmarke";
import { alleKunden } from "@/lib/db/kunden";

export const metadata = { title: "Kunden" };

/**
 * Bildschirm 4 — Kunden (DESIGN.md §5).
 *
 * Liste in einer Spalte: Name, Sprache, letzter Kontakt.
 * Nichts hier ist Pflichtfeld, nichts muss ausgefüllt werden, damit die App
 * funktioniert. Dieser Bildschirm ist Angebot, nicht Aufgabe.
 *
 * Seit Phase 9 stehen hier ihre echten Kunden. Sie entstehen von allein: Der
 * erste kommt, sobald sie eine Mail schreibt — angelegt hat sie ihn nie.
 */
function alsDatum(wert: string | null): string {
  if (!wert) return "noch kein Kontakt";

  try {
    return new Date(wert).toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
    });
  } catch {
    return "";
  }
}

export default async function KundenSeite() {
  /* Ein Ausfall der Datenbank darf den Bildschirm nicht sprengen — sie soll
     dann eine leere Liste sehen und weiterarbeiten können. */
  const liste = await alleKunden().catch(() => []);

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
                  <Kundenmarke
                    name={kunde.anzeigename}
                    sprache={kunde.sprache === "en" ? "en" : "de"}
                  />
                  <span className="text-xs text-text-leise">
                    {alsDatum(kunde.letzter_kontakt_am)}
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
