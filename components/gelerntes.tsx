"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Was die App über einen Kunden gelernt hat — mit dem Kreuz zum Entfernen
 * (`DESIGN.md` §5).
 *
 * **Das Kreuz ist nicht Zierde.** Die Fakten entstehen ohne ihr Zutun aus
 * ihren eigenen Mails; ein falsch abgeleiteter steckte sonst für immer in
 * jeder Mail an diesen Kunden, ohne dass sie ihn je losbekäme. Was die App
 * über einen Kunden weiß, muss sie jederzeit widerrufen können — sonst ist
 * das Gedächtnis keine Hilfe, sondern ein Risiko.
 *
 * Unbestätigte Punkte sind als solche zu erkennen. Sie wirken mit geringerem
 * Gewicht, und sie soll sehen, was davon geraten ist.
 */

export type GelernterPunkt = {
  id: string;
  text: string;
  bestaetigt: boolean;
};

export function Gelerntes({ punkte }: { punkte: GelernterPunkt[] }) {
  const [liste, setListe] = useState(punkte);
  const router = useRouter();

  async function handeln(id: string, was: "bestaetigen" | "loeschen") {
    /* Sofort aus der Liste bzw. als bestätigt zeigen — ein Klick, der erst
       nach dem Serverweg wirkt, fühlt sich an, als hätte er nicht gezählt. */
    setListe((bisher) =>
      was === "loeschen"
        ? bisher.filter((p) => p.id !== id)
        : bisher.map((p) => (p.id === id ? { ...p, bestaetigt: true } : p)),
    );

    try {
      await fetch("/api/fakten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ was, id }),
      });
      router.refresh();
    } catch {
      /* Die Anzeige oben stimmt; beim nächsten Öffnen wird neu geladen. */
    }
  }

  if (liste.length === 0) {
    return (
      <p className="text-m text-text-leise">
        Zu diesem Kunden weiß ich noch nichts. Das kommt mit der Zeit von
        allein.
      </p>
    );
  }

  return (
    <ul>
      {liste.map((punkt) => (
        <li
          key={punkt.id}
          className="flex items-start justify-between gap-3 py-3 border-b border-linie"
        >
          <span className="text-m">
            {punkt.text}
            {punkt.bestaetigt ? null : (
              <span className="text-xs text-text-leise"> · noch ungeprüft</span>
            )}
          </span>

          <span className="flex items-center gap-3 shrink-0">
            {punkt.bestaetigt ? null : (
              <button
                type="button"
                onClick={() => void handeln(punkt.id, "bestaetigen")}
                className="text-s text-gruen hover:underline"
              >
                stimmt
              </button>
            )}
            <button
              type="button"
              onClick={() => void handeln(punkt.id, "loeschen")}
              aria-label={`„${punkt.text}" entfernen`}
              className="text-m text-text-leise hover:text-fehler px-2 rounded-feld"
            >
              ✕
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}
