"use client";

import Link from "next/link";
import { useState } from "react";
import { Knopf } from "@/components/bausteine/knopf";
import { Textbereich } from "@/components/bausteine/feld";

/**
 * Die Leiste unter der fertigen Mail und das, was sich darunter aufklappt.
 *
 * Beides gehört in eine Komponente, weil „Passt nicht?" in der Leiste steht,
 * das Feld dazu aber darunter erscheint — läge das Feld in derselben Zeile,
 * schöbe es beim Aufklappen die Knöpfe auseinander.
 *
 * Phase 1: Kulisse. Verdrahtet wird das in Phase 8.
 */
export function Werkzeugleiste({ kundenname }: { kundenname: string }) {
  const [korrekturOffen, setKorrekturOffen] = useState(false);
  const [bewertung, setBewertung] = useState<"offen" | "gut" | "schlecht">(
    "offen",
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-5">
        <Knopf>Kopieren</Knopf>

        <button
          type="button"
          onClick={() => setKorrekturOffen(!korrekturOffen)}
          aria-expanded={korrekturOffen}
          className="font-ui text-m font-semibold text-gruen hover:underline"
        >
          Passt nicht?
        </button>

        <Link
          href="/antworten/ergebnis"
          className="text-m text-gruen hover:underline"
        >
          Fassung zurück
        </Link>

        {/* Daumen hoch und runter — Stufe 1 der Qualitätsmessung (MODELL.md §6).
            Ein Daumen runter erzeugt keine Regel, sondern die Rückfrage
            „Was hat nicht gepasst?". Ein Klick, kein Formular. */}
        <div className="ml-auto flex items-center gap-3">
          {bewertung === "gut" ? (
            <span className="text-m text-text-leise">
              Gemerkt.
            </span>
          ) : bewertung === "schlecht" ? (
            <span className="text-m text-text-leise">
              Sag unten, was nicht gepasst hat.
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setBewertung("gut")}
                aria-label="Diese Mail war gut"
                title="War gut"
                className="text-m px-2 py-1 rounded-feld hover:bg-grund-tief"
              >
                <span aria-hidden="true">👍</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBewertung("schlecht");
                  setKorrekturOffen(true);
                }}
                aria-label="Diese Mail war nicht gut"
                title="War nicht gut"
                className="text-m px-2 py-1 rounded-feld hover:bg-grund-tief"
              >
                <span aria-hidden="true">👎</span>
              </button>
            </>
          )}
        </div>
      </div>

      {korrekturOffen ? (
        <div className="flex flex-col gap-3">
          <Textbereich
            beschriftung="Passt nicht?"
            name="korrektur"
            rows={2}
            placeholder="Sag einfach, was stören soll."
            autoFocus
          />

          {/* Was sie ausdrücklich sagt, gilt — kein Rateschritt dazwischen
              (PLAN.md §4). */}
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-m">
              <input
                type="checkbox"
                name="fuer-kunden-merken"
                className="w-4 h-4 accent-gruen"
              />
              Für {kundenname} merken
            </label>
            <label className="flex items-center gap-2 text-m">
              <input
                type="checkbox"
                name="immer-so"
                className="w-4 h-4 accent-gruen"
              />
              Immer so machen
            </label>
          </div>

          <div className="flex gap-3">
            <Knopf art="neben">Nochmal schreiben</Knopf>
            <Knopf
              art="text"
              type="button"
              onClick={() => setKorrekturOffen(false)}
            >
              Abbrechen
            </Knopf>
          </div>
        </div>
      ) : null}
    </div>
  );
}
