"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Knopf } from "@/components/bausteine/knopf";
import { Hinweisstreifen } from "@/components/bausteine/hinweisstreifen";
import type { Unterlage } from "@/lib/wissen/dokumente";

/**
 * Unterlagen: Angebote, Preislisten, Lieferscheine (`CLAUDE.md` §5.5).
 *
 * Hochgeladen, gelesen, durchsuchbar. Der Text wird mit Mistral OCR erkannt
 * und indexiert — danach kann das Modell beim Formulieren daraus schöpfen,
 * ohne dass sie etwas nachschlagen muss.
 *
 * **Eine Unterlage ohne erkannten Text bleibt liegen und wird als solche
 * gezeigt.** Sie taucht dann nur nicht in der Suche auf. Das ist ein
 * Qualitätsverlust, kein Datenverlust — und der Unterschied gehört sichtbar
 * gemacht, statt die Datei stillschweigend als nutzlos zu behandeln.
 */
export function Unterlagenliste({ unterlagen }: { unterlagen: Unterlage[] }) {
  const [liste, setListe] = useState(unterlagen);
  const [laeuft, setLaeuft] = useState(false);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const datei = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function hochladen(gewaehlt: File) {
    setLaeuft(true);
    setHinweis(null);

    try {
      const formular = new FormData();
      formular.append("datei", gewaehlt);
      formular.append("titel", gewaehlt.name);

      const antwort = await fetch("/api/wissen", {
        method: "POST",
        body: formular,
      });

      const ergebnis = await antwort.json();
      if (ergebnis.hinweis) setHinweis(ergebnis.hinweis);
      router.refresh();
    } catch {
      setHinweis("Die Datei konnte ich gerade nicht ablegen. Probier es nochmal.");
    } finally {
      setLaeuft(false);
      if (datei.current) datei.current.value = "";
    }
  }

  async function loeschen(id: string) {
    setListe((bisher) => bisher.filter((u) => u.id !== id));

    try {
      await fetch("/api/wissen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ was: "dokument-loeschen", id }),
      });
      router.refresh();
    } catch {
      /* Die Anzeige oben stimmt; beim nächsten Öffnen wird neu geladen. */
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {hinweis ? <Hinweisstreifen>{hinweis}</Hinweisstreifen> : null}

      {liste.length === 0 ? (
        <p className="text-m text-text-leise">
          Noch keine Unterlagen. Preislisten und Angebote kannst du hier
          ablegen — ich lese sie und nutze sie beim Schreiben.
        </p>
      ) : (
        <ul>
          {liste.map((unterlage) => (
            <li
              key={unterlage.id}
              className="flex items-baseline justify-between gap-4 py-3 border-b border-linie"
            >
              <span className="text-m">{unterlage.titel}</span>
              <span className="flex items-baseline gap-3 shrink-0">
                <span className="text-xs text-text-leise">
                  {unterlage.lesbar ? unterlage.art : "Text nicht gelesen"}
                </span>
                <button
                  type="button"
                  onClick={() => void loeschen(unterlage.id)}
                  aria-label={`„${unterlage.titel}" entfernen`}
                  className="text-m text-text-leise hover:text-fehler px-2 rounded-feld"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Das echte Dateifeld bleibt verborgen: Browser setzen es in ihrem
          eigenen Stil, der mit nichts hier zusammenpasst. Der Knopf davor
          löst es aus. */}
      <div>
        <input
          type="file"
          ref={datei}
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const gewaehlt = e.target.files?.[0];
            if (gewaehlt) void hochladen(gewaehlt);
          }}
        />
        <Knopf
          art="neben"
          onClick={() => datei.current?.click()}
          disabled={laeuft}
        >
          {laeuft ? "Ich lese sie …" : "Unterlage hinzufügen"}
        </Knopf>
      </div>
    </div>
  );
}
