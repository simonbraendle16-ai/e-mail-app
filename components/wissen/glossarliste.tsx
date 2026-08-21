"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Knopf } from "@/components/bausteine/knopf";
import type { Glossareintrag } from "@/lib/db/glossar";

/**
 * Die Fachbegriffe (`DESIGN.md` §5).
 *
 * Oben stehen die **Vorschläge** — Begriffe, die beim Übersetzen aufgefallen
 * sind und auf ihr Ja warten. Sie wirken nicht, bis sie bestätigt sind: Ein
 * geratener Fachbegriff, der sich still als verbindlich einträgt, wäre in
 * jeder folgenden Mail falsch.
 *
 * Das Glossar startet leer, und das ist kein Versäumnis. Ein Eintrag ist ein
 * *Paar*, und aus einer einsprachigen Mail lässt sich keins gewinnen — es
 * gibt weder Mailexport noch Terminologieliste der Firma. Der Text im leeren
 * Zustand sagt genau das, ohne es zu einer Aufgabe zu machen.
 */
export function Glossarliste({ eintraege }: { eintraege: Glossareintrag[] }) {
  const [liste, setListe] = useState(eintraege);
  const router = useRouter();

  const vorschlaege = liste.filter((e) => !e.verbindlich);
  const verbindlich = liste.filter((e) => e.verbindlich);

  async function bestaetigen(eintrag: Glossareintrag) {
    setListe((bisher) =>
      bisher.map((e) => (e.id === eintrag.id ? { ...e, verbindlich: true } : e)),
    );

    try {
      await fetch("/api/glossar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ de: eintrag.de, en: eintrag.en }),
      });
      router.refresh();
    } catch {
      /* Beim nächsten Übersetzen fragt die App erneut. */
    }
  }

  function verwerfen(id: string) {
    /* Nur aus der Anzeige nehmen. Der Vorschlag bleibt unverbindlich in der
       Datenbank stehen und stört dort niemanden — löschen hieße, ihn beim
       nächsten Übersetzen erneut vorzuschlagen. */
    setListe((bisher) => bisher.filter((e) => e.id !== id));
  }

  if (liste.length === 0) {
    return (
      <p className="text-m text-text-leise">
        Noch keine Begriffe. Sie sammeln sich, während du schreibst — ich frage
        beim Übersetzen einmal nach, und dann steht es fest.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {vorschlaege.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {vorschlaege.map((eintrag) => (
            <li
              key={eintrag.id}
              className="bg-hinweis-flae border-l-[3px] border-hinweis px-4 py-3"
            >
              <p className="text-m mb-3">
                Heißt <strong>{eintrag.de}</strong> bei euch{" "}
                <strong>{eintrag.en}</strong>?
              </p>
              <div className="flex gap-3">
                <Knopf art="neben" onClick={() => void bestaetigen(eintrag)}>
                  Ja, so heißt das
                </Knopf>
                <Knopf art="text" onClick={() => verwerfen(eintrag.id)}>
                  Verwerfen
                </Knopf>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {verbindlich.length > 0 ? (
        <ul>
          {verbindlich.map((eintrag) => (
            <li
              key={eintrag.id}
              className="flex items-baseline justify-between gap-4 py-3 border-b border-linie"
            >
              <span className="text-m">
                {eintrag.de}
                <span className="text-text-leise"> → </span>
                {eintrag.en}
              </span>
              <span className="text-xs text-text-leise">{eintrag.bereich}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
