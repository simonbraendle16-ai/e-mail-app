"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Knopf } from "@/components/bausteine/knopf";
import { Hinweisstreifen } from "@/components/bausteine/hinweisstreifen";
import type { Regel } from "@/lib/db/regeln";
import type { Konflikt } from "@/lib/lernen/konflikt";

/**
 * Was die App sich gemerkt hat (`PLAN.md` §4, Phase 8).
 *
 * **Warum es diesen Abschnitt gibt:** „Abgelehntes kommt nicht wieder" ist
 * die zentrale Zusage der App. Eine Zusage, die man nicht nachprüfen kann,
 * ist keine. Wenn eine Mail plötzlich anders klingt und sie nirgends
 * nachsehen kann, welche Regeln gerade gelten, bleibt ihr nur zu raten — und
 * Raten ist genau das, was ihr die App abnehmen soll.
 *
 * Wie der ganze Wissen-Bildschirm: **Angebot, nicht Aufgabe.** Sie muss hier
 * nie etwas tun. Es reicht, dass sie nachsehen *kann*.
 *
 * Die Regeln kommen fertig von der Seite, nicht aus einem Ladeeffekt: Sie
 * stehen damit sofort da, statt nach einem kurzen Leerlauf einzublenden.
 */
export function Regelverwaltung({
  anfangsregeln,
  konflikte,
}: {
  anfangsregeln: Regel[];
  konflikte: Konflikt[];
}) {
  const [regeln, setRegeln] = useState<Regel[]>(anfangsregeln);
  const router = useRouter();

  async function entscheiden(id: string, entscheidung: "aktiv" | "abgelehnt") {
    /* Sofort anpassen. Ein Klick, der erst nach einem Serverweg sichtbar
       wird, fühlt sich an, als hätte er nicht gezählt. */
    setRegeln((bisher) =>
      bisher.map((r) => (r.id === id ? { ...r, status: entscheidung } : r)),
    );

    try {
      await fetch("/api/regeln", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ was: "entscheiden", id, entscheidung }),
      });
      /* Erst danach die Seite auffrischen — dann stimmen auch die
         Widersprüche wieder, die serverseitig berechnet werden. */
      router.refresh();
    } catch {
      /* Der Zustand oben stimmt; beim nächsten Öffnen wird neu geladen. */
    }
  }

  async function loeschen(id: string) {
    setRegeln((bisher) => bisher.filter((r) => r.id !== id));

    try {
      await fetch("/api/regeln", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ was: "loeschen", id }),
      });
      router.refresh();
    } catch {
      /* siehe oben */
    }
  }

  const vorgeschlagen = regeln.filter((r) => r.status === "vorgeschlagen");
  const aktiv = regeln.filter((r) => r.status === "aktiv");

  if (regeln.length === 0) {
    return (
      <p className="text-m text-text-leise">
        Noch nichts gemerkt. Das kommt von allein, wenn du unter einer Mail
        sagst, was nicht passt.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Widersprüche zuerst — sie sind der einzige Grund, aus dem dieser
          Abschnitt wirklich Aufmerksamkeit braucht. */}
      {konflikte.map((konflikt) => (
        <Hinweisstreifen key={`${konflikt.a.id}-${konflikt.b.id}`}>
          {konflikt.text}
        </Hinweisstreifen>
      ))}

      {vorgeschlagen.length > 0 ? (
        <section>
          <h3 className="text-s font-semibold text-text-leise mb-3">
            Soll ich mir das merken?
          </h3>
          <ul className="flex flex-col gap-3">
            {vorgeschlagen.map((regel) => (
              <li
                key={regel.id}
                className="flex flex-wrap items-center gap-4"
              >
                <span className="text-m">{regel.text}</span>
                <Knopf
                  art="neben"
                  onClick={() => void entscheiden(regel.id, "aktiv")}
                >
                  Ja
                </Knopf>
                <button
                  type="button"
                  onClick={() => void entscheiden(regel.id, "abgelehnt")}
                  className="text-s text-text-leise hover:underline"
                >
                  nein
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {aktiv.length > 0 ? (
        <section>
          <h3 className="text-s font-semibold text-text-leise mb-3">
            Daran halte ich mich
          </h3>
          <ul className="flex flex-col gap-3">
            {aktiv.map((regel) => (
              <li key={regel.id} className="flex flex-wrap items-baseline gap-3">
                <span className="text-m">{regel.text}</span>
                {regel.kundeId ? (
                  <span className="text-s text-text-leise">
                    nur bei einem Kunden
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => void loeschen(regel.id)}
                  className="text-s text-text-leise hover:underline"
                >
                  weg damit
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
