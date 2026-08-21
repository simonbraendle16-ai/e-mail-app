"use client";

import { useRef, useState } from "react";
import { Knopf } from "@/components/bausteine/knopf";
import { Textbereich } from "@/components/bausteine/feld";
import { Hinweisstreifen } from "@/components/bausteine/hinweisstreifen";
import { Kundenmarke } from "@/components/bausteine/kundenmarke";
import { Papier, Mailtext } from "@/components/bausteine/papier";
import { Skillmarke } from "@/components/skillmarke";
import type { SkillAnzeige } from "@/components/skillmarke";

/**
 * Der Bildschirm, auf dem sie den Tag verbringt (`DESIGN.md` §5).
 *
 * Drei Bereiche untereinander: Kundenmail einfügen · was sie sagen will ·
 * fertige Antwort. Während gearbeitet wird, steht **eine Zeile Text**, die
 * sagt, was gerade passiert — kein Ladekreis, keine Prozentzahl.
 *
 * Der Text läuft ein, während er entsteht. Das ist der Kern gegen die
 * Grübelschleife (`CLAUDE.md` §1).
 */

type Lage =
  | { art: "bereit" }
  | { art: "laeuft"; schritt: string; text: string }
  | {
      art: "fertig";
      mailId: string;
      knapp: string;
      ausfuehrlich: string;
      warnungen: string[];
    }
  | { art: "fehler"; text: string };

export function Antwortformular({
  waehlbareSkills,
  neueMail,
}: {
  waehlbareSkills: SkillAnzeige[];
  neueMail: boolean;
}) {
  const [lage, setLage] = useState<Lage>({ art: "bereit" });
  const [kunde, setKunde] = useState<{
    name: string | null;
    sprache: "de" | "en";
  } | null>(null);
  const [skill, setSkill] = useState<SkillAnzeige | null>(null);

  const eingehend = useRef<HTMLTextAreaElement>(null);
  const stichworte = useRef<HTMLTextAreaElement>(null);
  const abbruch = useRef<AbortController | null>(null);

  async function schreiben() {
    const stichwortText = stichworte.current?.value.trim() ?? "";
    if (!stichwortText) {
      setLage({
        art: "fehler",
        text: "Schreib bitte kurz, was du sagen willst — zwei Sätze reichen.",
      });
      stichworte.current?.focus();
      return;
    }

    abbruch.current?.abort();
    abbruch.current = new AbortController();

    setLage({ art: "laeuft", schritt: "Einen Moment.", text: "" });
    setKunde(null);
    setSkill(null);

    try {
      const antwort = await fetch("/api/verfassen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abbruch.current.signal,
        body: JSON.stringify({
          eingehenderText: neueMail ? undefined : eingehend.current?.value,
          stichworte: stichwortText,
          skillName: skill?.name,
        }),
      });

      if (!antwort.ok || !antwort.body) {
        const fehler = await antwort.json().catch(() => null);
        setLage({
          art: "fehler",
          text:
            fehler?.fehler ??
            "Die Verbindung klemmt gerade. Dein Text ist gespeichert, probier es in einer Minute nochmal.",
        });
        return;
      }

      const leser = antwort.body.getReader();
      const decoder = new TextDecoder();
      let rest = "";
      let gesammelt = "";
      let schritt = "Einen Moment.";

      while (true) {
        const { done, value } = await leser.read();
        if (done) break;

        rest += decoder.decode(value, { stream: true });
        const zeilen = rest.split("\n");
        rest = zeilen.pop() ?? "";

        for (const zeile of zeilen) {
          const sauber = zeile.trim();
          if (!sauber.startsWith("data:")) continue;

          try {
            const nachricht = JSON.parse(sauber.slice(5).trim());

            switch (nachricht.art) {
              case "schritt":
                schritt = nachricht.text;
                setLage({ art: "laeuft", schritt, text: gesammelt });
                break;
              case "kunde":
                setKunde({ name: nachricht.name, sprache: nachricht.sprache });
                break;
              case "skill":
                setSkill({
                  name: nachricht.name,
                  bezeichnung: nachricht.bezeichnung,
                });
                break;
              case "text":
                gesammelt += nachricht.text;
                setLage({ art: "laeuft", schritt, text: gesammelt });
                break;
              case "fertig":
                setLage({
                  art: "fertig",
                  mailId: nachricht.mailId,
                  knapp: nachricht.knapp,
                  ausfuehrlich: nachricht.ausfuehrlich,
                  warnungen: nachricht.warnungen ?? [],
                });
                break;
              case "fehler":
                setLage({ art: "fehler", text: nachricht.text });
                break;
            }
          } catch {
            /* Ein unlesbares Ereignis ist kein Grund, den Text wegzuwerfen. */
          }
        }
      }
    } catch (fehler) {
      if (fehler instanceof Error && fehler.name === "AbortError") return;
      setLage({
        art: "fehler",
        text: "Die Verbindung klemmt gerade. Dein Text ist gespeichert, probier es in einer Minute nochmal.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Der Kunde: Feststellung, nicht Auswahlliste. */}
      {kunde ? (
        <div className="flex items-center gap-3">
          <span className="text-s text-text-leise font-semibold">Kunde</span>
          {kunde.name ? (
            <Kundenmarke name={kunde.name} sprache={kunde.sprache} />
          ) : (
            <span className="text-m text-text-leise">
              noch offen — ich schreibe ohne Vorwissen
            </span>
          )}
        </div>
      ) : null}

      {skill ? (
        <Skillmarke aktiv={skill} auswahl={waehlbareSkills} beiWechsel={(name) => {
          const gewaehlt = waehlbareSkills.find((s) => s.name === name);
          if (gewaehlt) {
            setSkill(gewaehlt);
            void schreiben();
          }
        }} />
      ) : null}

      {neueMail ? null : (
        <Textbereich
          beschriftung="Mail vom Kunden"
          hilfe="Einfach aus Outlook hier einfügen."
          ref={eingehend}
          rows={8}
          placeholder="Die Mail hier einfügen."
        />
      )}

      <Textbereich
        beschriftung="Was möchtest du sagen?"
        hilfe="Zwei Sätze reichen. Stichworte genügen."
        ref={stichworte}
        rows={3}
        placeholder="Lieferung geht Freitag raus"
      />

      {lage.art === "laeuft" ? (
        <>
          {/* Kein Ladekreis, kein Fortschrittsbalken. Eine Zeile Text,
              die sagt, was gerade passiert (DESIGN.md §5). */}
          <p aria-live="polite" className="text-m text-text-leise">
            {lage.schritt}
          </p>

          {lage.text ? (
            <Papier>
              <Mailtext text={lage.text} />
            </Papier>
          ) : null}
        </>
      ) : null}

      {lage.art === "fehler" ? (
        <Hinweisstreifen art="fehler">{lage.text}</Hinweisstreifen>
      ) : null}

      {lage.art === "fertig" ? (
        <Ergebnis lage={lage} />
      ) : (
        <div className="flex justify-end">
          <Knopf onClick={schreiben} disabled={lage.art === "laeuft"}>
            {lage.art === "laeuft" ? "Ich schreibe …" : "Antwort schreiben"}
          </Knopf>
        </div>
      )}
    </div>
  );
}

/**
 * Zwei Fassungen zur Auswahl.
 *
 * Auswählen ist leichter als bewerten — ein einzelner Vorschlag wird zerdacht,
 * zwei nebeneinander erzwingen eine Entscheidung (`MODELL.md` §2b).
 */
function Ergebnis({
  lage,
}: {
  lage: Extract<Lage, { art: "fertig" }>;
}) {
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);

  const fassungen = [
    { marke: "knapp", titel: "Knapp", text: lage.knapp },
    { marke: "ausfuehrlich", titel: "Ausführlicher", text: lage.ausfuehrlich },
  ].filter((f) => f.text.trim());

  if (gewaehlt) {
    const text = fassungen.find((f) => f.marke === gewaehlt)?.text ?? lage.knapp;
    return (
      <div className="flex flex-col gap-5">
        {lage.warnungen.map((w) => (
          <Hinweisstreifen key={w}>{w}</Hinweisstreifen>
        ))}
        <Papier>
          <Mailtext text={text} />
        </Papier>
        <div className="flex gap-3">
          <Knopf onClick={() => navigator.clipboard?.writeText(text)}>
            Kopieren
          </Knopf>
          <Knopf art="text" onClick={() => setGewaehlt(null)}>
            Andere Fassung
          </Knopf>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {lage.warnungen.map((w) => (
        <Hinweisstreifen key={w}>{w}</Hinweisstreifen>
      ))}

      <p className="text-m text-text-leise">
        {fassungen.length > 1
          ? "Zwei Fassungen. Nimm die, die passt — du kannst sie danach noch ändern."
          : "Hier ist die Antwort."}
      </p>

      <div
        className={
          fassungen.length > 1 ? "grid grid-cols-2 gap-5" : "max-w-inhalt"
        }
      >
        {fassungen.map((fassung) => (
          <div key={fassung.marke} className="flex flex-col gap-3">
            {fassungen.length > 1 ? (
              <h2 className="text-s font-semibold text-text-leise">
                {fassung.titel}
              </h2>
            ) : null}
            <Papier className="flex-1">
              <Mailtext text={fassung.text} />
            </Papier>
            <div>
              <Knopf art="neben" onClick={() => setGewaehlt(fassung.marke)}>
                Diese nehmen
              </Knopf>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
