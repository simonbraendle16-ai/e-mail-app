"use client";

import { Knopf } from "@/components/bausteine/knopf";

/**
 * Was sie sieht, wenn etwas unerwartet schiefgeht.
 * Keine Fehlercodes, kein Englisch, keine Stacktraces (DESIGN.md §7).
 * Der technische Fehler geht ins Serverprotokoll, nicht auf ihren Bildschirm.
 */
export default function Fehlerseite({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-inhalt px-4 py-8">
      <h1 className="text-xl font-semibold mb-3">Da ist etwas hängengeblieben.</h1>
      <p className="text-m text-text-leise mb-6">
        Dein Text ist nicht verloren. Probier es gleich nochmal — wenn es wieder
        klemmt, warte eine Minute.
      </p>
      <Knopf onClick={reset}>Nochmal versuchen</Knopf>
    </main>
  );
}
