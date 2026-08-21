import type { Sprache } from "@/lib/beispieldaten";

/**
 * Kundenmarke — DESIGN.md §4.
 *
 * Name, dahinter die Sprache als Kürzel („DE" / „EN") in xs auf --grund-tief.
 * Bewusst keine Flaggen: Sprache ist nicht dasselbe wie Nationalität, und ein
 * Kunde in der Schweiz, dem man auf Englisch schreibt, macht die Flagge zur
 * Falschaussage.
 */
export function Kundenmarke({
  name,
  sprache,
}: {
  name: string;
  sprache: Sprache;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-m">{name}</span>
      <span
        className="bg-grund-tief text-text-leise text-xs rounded-feld px-2 py-1 font-semibold"
        title={sprache === "de" ? "Schreibt Deutsch" : "Schreibt Englisch"}
      >
        {sprache.toUpperCase()}
      </span>
    </span>
  );
}
