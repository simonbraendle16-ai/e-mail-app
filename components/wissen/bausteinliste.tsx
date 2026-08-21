"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Knopf } from "@/components/bausteine/knopf";
import { Feld, Textbereich } from "@/components/bausteine/feld";
import type { Baustein } from "@/lib/db/bausteine";

/**
 * Textbausteine (`CLAUDE.md` §5.5): Signatur, feste Einstiegssätze,
 * rechtliche Hinweise.
 *
 * **Der einzige Teil der Wissensbasis, den jemand von Hand füllt.** Alles
 * andere wächst aus ihren Mails. Aus einer Mail lässt sich nicht ablesen,
 * welcher Satz verbindlicher Firmenstandard ist und welcher zufällig so
 * dastand — deshalb hier ein Formular, und deshalb bleibt es beim einmaligen
 * Eintragen einer Handvoll Bausteine.
 *
 * Das Formular ist eingeklappt: Der Bildschirm soll beim Öffnen nach einer
 * Übersicht aussehen, nicht nach einer Eingabemaske.
 */
export function Bausteinliste({ bausteine }: { bausteine: Baustein[] }) {
  const [liste, setListe] = useState(bausteine);
  const [offen, setOffen] = useState(false);
  const router = useRouter();

  const name = useRef<HTMLInputElement>(null);
  const textDe = useRef<HTMLTextAreaElement>(null);

  async function anlegen() {
    const nameWert = name.current?.value.trim() ?? "";
    const textWert = textDe.current?.value.trim() ?? "";
    if (!nameWert || !textWert) return;

    setOffen(false);

    try {
      const antwort = await fetch("/api/wissen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          was: "baustein-anlegen",
          name: nameWert,
          textDe: textWert,
        }),
      });

      const ergebnis = await antwort.json();
      if (ergebnis.baustein) {
        setListe((bisher) => [...bisher, ergebnis.baustein]);
        if (name.current) name.current.value = "";
        if (textDe.current) textDe.current.value = "";
      }
      router.refresh();
    } catch {
      /* Nichts angelegt, nichts verloren — sie sieht die Liste unverändert. */
    }
  }

  async function loeschen(id: string) {
    setListe((bisher) => bisher.filter((b) => b.id !== id));

    try {
      await fetch("/api/wissen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ was: "baustein-loeschen", id }),
      });
      router.refresh();
    } catch {
      /* siehe oben */
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {liste.length === 0 ? (
        <p className="text-m text-text-leise">
          Noch keine Bausteine. Deine Signatur und feste Formulierungen kommen
          hierher.
        </p>
      ) : (
        <ul>
          {liste.map((baustein) => (
            <li
              key={baustein.id}
              className="flex items-baseline justify-between gap-4 py-3 border-b border-linie"
            >
              <span className="text-m">{baustein.name}</span>
              <span className="flex items-baseline gap-3 shrink-0">
                <span className="text-xs text-text-leise">
                  {baustein.kategorie}
                </span>
                <button
                  type="button"
                  onClick={() => void loeschen(baustein.id)}
                  aria-label={`„${baustein.name}" entfernen`}
                  className="text-m text-text-leise hover:text-fehler px-2 rounded-feld"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {offen ? (
        <div className="flex flex-col gap-3 mt-3">
          <Feld
            beschriftung="Wofür ist das?"
            name="baustein-name"
            ref={name}
            placeholder="Signatur"
            autoFocus
          />
          <Textbereich
            beschriftung="Der Text"
            name="baustein-text"
            ref={textDe}
            rows={4}
            placeholder="Viele Grüße …"
          />
          <div className="flex gap-3">
            <Knopf art="neben" onClick={() => void anlegen()}>
              Merken
            </Knopf>
            <Knopf art="text" onClick={() => setOffen(false)}>
              Abbrechen
            </Knopf>
          </div>
        </div>
      ) : (
        <div>
          <Knopf art="neben" onClick={() => setOffen(true)}>
            Baustein hinzufügen
          </Knopf>
        </div>
      )}
    </div>
  );
}
