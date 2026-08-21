import Link from "next/link";

/**
 * „← Zurück" über Unterseiten.
 *
 * Steht nur dort, wo es einen echten Schritt zurück gibt: von der Kundenakte
 * zur Liste, vom Ergebnis zum Entwurf. Auf den Hauptbereichen selbst wäre er
 * überflüssig — dorthin führt die Seitenleiste.
 */
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
