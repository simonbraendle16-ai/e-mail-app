"use client";

import { useEffect } from "react";
import { Knopf } from "@/components/bausteine/knopf";

/**
 * Ein Fehler **innerhalb** der App — mit Seitenleiste drumherum.
 *
 * Die Fehlerseite an der Wurzel (`app/error.tsx`) fängt alles ab, aber sie
 * ersetzt dabei die ganze Seite samt Navigation. Für einen Fehler beim Laden
 * der Kundenliste ist das zu viel: Sie steht dann vor einer nackten Seite und
 * kommt nirgends hin, obwohl der Rest der App funktioniert.
 *
 * Hier bleibt die Leiste stehen. Sie kann weiterarbeiten — und das Wichtigste,
 * das Schreiben, ist einen Klick entfernt.
 */
export default function AppFehler({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    /* Der technische Fehler gehört ins Protokoll, nicht auf ihren Bildschirm
       (`DESIGN.md` §7). Ohne diese Zeile wäre er ganz verloren, und der User
       stünde bei einer Meldung von ihr ohne jeden Anhaltspunkt da. */
    console.error("[app]", error);
  }, [error]);

  return (
    <main className="max-w-inhalt px-5 py-6">
      <h1 className="text-xl font-semibold mb-3">
        Das konnte ich gerade nicht laden.
      </h1>
      <p className="text-m text-text-leise mb-6">
        Nichts ist verloren. Probier es gleich nochmal — wenn es wieder klemmt,
        warte eine Minute. Schreiben geht in der Zwischenzeit weiter.
      </p>
      <Knopf onClick={reset}>Nochmal versuchen</Knopf>
    </main>
  );
}
