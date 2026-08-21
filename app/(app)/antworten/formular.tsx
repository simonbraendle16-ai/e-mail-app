"use client";

import { useEffect, useRef, useState } from "react";
import { Knopf } from "@/components/bausteine/knopf";
import { Textbereich } from "@/components/bausteine/feld";
import { Hinweisstreifen } from "@/components/bausteine/hinweisstreifen";
import { Papier, Mailtext } from "@/components/bausteine/papier";
import { Skillmarke } from "@/components/skillmarke";
import type { SkillAnzeige } from "@/components/skillmarke";
import {
  Kundenwahl,
  type Erkennungslage,
  type KundeKurz,
} from "@/components/kundenwahl";
import {
  Befundstreifen,
  ungedeckteStellen,
} from "@/components/befundstreifen";
import { EnglischeFassung } from "@/components/englische-fassung";
import { Mailwerkstatt } from "@/components/mailwerkstatt";
import type { Befund } from "@/lib/pruefungen/typen";
import {
  entwurfLesen,
  entwurfSichern,
  entwurfVergessen,
} from "@/lib/entwurf-sichern";

/**
 * Der Bildschirm, auf dem sie den Tag verbringt (`DESIGN.md` §5).
 *
 * Drei Bereiche untereinander: Kundenmail einfügen · was sie sagen will ·
 * fertige Antwort. Während gearbeitet wird, steht **eine Zeile Text**, die
 * sagt, was gerade passiert — kein Ladekreis, keine Prozentzahl.
 */

type Lage =
  | { art: "bereit" }
  | { art: "laeuft"; schritt: string; text: string }
  | {
      art: "fertig";
      mailId: string;
      knapp: string;
      ausfuehrlich: string;
      /** Was die maschinellen Prüfungen gefunden haben (`MODELL.md` §4). */
      befunde: Befund[];
    }
  | { art: "fehler"; text: string };

export function Antwortformular({
  waehlbareSkills,
  alleKunden,
  neueMail,
}: {
  waehlbareSkills: SkillAnzeige[];
  alleKunden: KundeKurz[];
  neueMail: boolean;
}) {
  const [lage, setLage] = useState<Lage>({ art: "bereit" });
  const [erkennung, setErkennung] = useState<Erkennungslage>({ stand: "still" });
  const [kunde, setKunde] = useState<KundeKurz | null>(null);
  const [skill, setSkill] = useState<SkillAnzeige | null>(null);
  const [wiederhergestellt, setWiederhergestellt] = useState(false);

  const eingehend = useRef<HTMLTextAreaElement>(null);
  const stichworte = useRef<HTMLTextAreaElement>(null);
  const abbruch = useRef<AbortController | null>(null);

  /* Was sie zuletzt getippt hat, zurückholen. Läuft genau einmal beim Öffnen.
   *
   * Der Effekt setzt Zustand, und die Regel `set-state-in-effect` mahnt das
   * zu Recht an — sie schützt vor Schleifen, in denen ein Effekt sich selbst
   * neu auslöst. Hier greift das nicht: `localStorage` steht im Server nicht
   * zur Verfügung, der Wert kann also erst nach dem Einhängen gelesen werden,
   * und die leere Abhängigkeitsliste lässt den Effekt genau einmal laufen.
   * Die Alternative wäre, ihr das Zurückholen als Knopf anzubieten — und
   * `MODELL.md` §5 sagt ausdrücklich, dass kein Ausfall sie Tipparbeit kosten
   * darf. Ein Knopf, den sie erst finden muss, erfüllt das nicht.
   */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const entwurf = entwurfLesen();
    if (!entwurf) return;

    if (eingehend.current) eingehend.current.value = entwurf.eingehenderText;
    if (stichworte.current) stichworte.current.value = entwurf.stichworte;

    if (entwurf.kundeId) {
      const gefunden = alleKunden.find((k) => k.id === entwurf.kundeId);
      if (gefunden) setKunde(gefunden);
    }

    setWiederhergestellt(true);
    /* Absichtlich ohne Abhängigkeiten: einmal beim Öffnen, nie wieder. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function sichern() {
    entwurfSichern({
      eingehenderText: eingehend.current?.value ?? "",
      stichworte: stichworte.current?.value ?? "",
      kundeId: kunde?.id ?? null,
    });
  }

  /** Erkennt beim Verlassen des Feldes, von wem die Mail ist. */
  async function erkennen() {
    const text = eingehend.current?.value.trim() ?? "";
    sichern();

    if (kunde) return;

    /* Leert sie das Feld wieder, gehört die Kundenzeile auch wieder weg —
       sonst bliebe eine Aussage stehen, zu der es keinen Text mehr gibt. */
    if (!text) {
      setErkennung({ stand: "still" });
      return;
    }

    setErkennung({ stand: "sucht" });
    try {
      const antwort = await fetch("/api/kunde-erkennen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      /* Bei einer Fehlerantwort (abgelaufene Anmeldung, Serverfehler) steht im
         Rumpf keine Erkennungslage, sondern eine Fehlermeldung. Die ungeprüft
         zu übernehmen ergäbe einen Zustand, den `Kundenwahl` nicht kennt — die
         Zeile verschwände wortlos. Sie soll aber sehen, dass die Frage offen
         ist, statt dass die App stumm wird. */
      const gelesen = antwort.ok ? await antwort.json() : null;
      const gueltig =
        gelesen &&
        ["erkannt", "mehrdeutig", "unbekannt"].includes(gelesen.stand);

      setErkennung(gueltig ? gelesen : { stand: "unbekannt" });
    } catch {
      setErkennung({ stand: "unbekannt" });
    }
  }

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

    /* Sichern, BEVOR der Aufruf startet (MODELL.md §5). Fällt jetzt etwas
       aus, ist ihre Tipparbeit trotzdem noch da. */
    sichern();
    setWiederhergestellt(false);

    abbruch.current?.abort();
    abbruch.current = new AbortController();

    setLage({ art: "laeuft", schritt: "Einen Moment.", text: "" });
    setSkill(null);

    try {
      const antwort = await fetch("/api/verfassen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abbruch.current.signal,
        body: JSON.stringify({
          eingehenderText: neueMail ? undefined : eingehend.current?.value,
          stichworte: stichwortText,
          kundeId: kunde?.id ?? null,
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
                if (nachricht.name && !kunde) {
                  setErkennung({
                    stand: "erkannt",
                    kunde: {
                      id: nachricht.id ?? "",
                      name: nachricht.name,
                      sprache: nachricht.sprache,
                    },
                  });
                }
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
              case "neuversuch":
                /* Der erste Entwurf wird verworfen. Ohne dieses Leeren
                   hinge der zweite Text unten am ersten, und sie läse eine
                   Mail, die es so nie gab. */
                gesammelt = "";
                setLage({ art: "laeuft", schritt, text: "" });
                break;
              case "fertig":
                setLage({
                  art: "fertig",
                  mailId: nachricht.mailId,
                  knapp: nachricht.knapp,
                  ausfuehrlich: nachricht.ausfuehrlich,
                  befunde: nachricht.befunde ?? [],
                });
                /* Erst wenn die Mail steht, ist der Entwurf entbehrlich. */
                entwurfVergessen();
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
      {wiederhergestellt ? (
        <Hinweisstreifen>
          Dein letzter Text war noch da — ich habe ihn zurückgeholt.
        </Hinweisstreifen>
      ) : null}

      {neueMail ? null : (
        <Kundenwahl
          lage={erkennung}
          gewaehlt={kunde}
          alleKunden={alleKunden}
          beiWahl={(gewaehlt) => {
            setKunde(gewaehlt);
            setErkennung({ stand: "still" });
            sichern();
          }}
        />
      )}

      {skill ? (
        <Skillmarke
          aktiv={skill}
          auswahl={waehlbareSkills}
          beiWechsel={(name) => {
            const gewaehlt = waehlbareSkills.find((s) => s.name === name);
            if (gewaehlt) {
              setSkill(gewaehlt);
              void schreiben();
            }
          }}
        />
      ) : null}

      {neueMail ? null : (
        <Textbereich
          beschriftung="Mail vom Kunden"
          hilfe="Einfach aus Outlook hier einfügen."
          ref={eingehend}
          rows={8}
          placeholder="Die Mail hier einfügen."
          onBlur={erkennen}
        />
      )}

      <Textbereich
        beschriftung="Was möchtest du sagen?"
        hilfe="Zwei Sätze reichen. Stichworte genügen."
        ref={stichworte}
        rows={3}
        placeholder="Lieferung geht Freitag raus"
        onBlur={sichern}
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
        <Ergebnis
          lage={lage}
          kunde={kunde ?? (erkennung.stand === "erkannt" ? erkennung.kunde : null)}
        />
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
  kunde,
}: {
  lage: Extract<Lage, { art: "fertig" }>;
  /** Für die Sprache — sie hängt am Kunden, nicht an einem Schalter. */
  kunde: KundeKurz | null;
}) {
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);

  /* Was gerade auf dem Papier steht. Startet als die gewaehlte Fassung und
     wandert mit jeder Korrektur weiter — die Werkstatt arbeitet an diesem
     Text, nicht mehr an dem, was das Modell zuerst geliefert hat. */
  const [fassung, setFassung] = useState<{ text: string; befunde: Befund[] } | null>(
    null,
  );

  /* Frühere Fassungen, für „Fassung zurück". Sie liegen auch in der
     Datenbank — hier stehen sie, damit ein Zurück sofort greift und keinen
     Serverweg braucht. */
  const [verlauf, setVerlauf] = useState<{ text: string; befunde: Befund[] }[]>(
    [],
  );

  const fassungen = [
    { marke: "knapp", titel: "Knapp", text: lage.knapp },
    { marke: "ausfuehrlich", titel: "Ausführlicher", text: lage.ausfuehrlich },
  ].filter((f) => f.text.trim());

  function waehlen(marke: string) {
    const text = fassungen.find((f) => f.marke === marke)?.text ?? lage.knapp;
    setGewaehlt(marke);
    setFassung({ text, befunde: lage.befunde });
    setVerlauf([]);
  }

  function neueFassung(text: string, befunde: Befund[]) {
    setVerlauf((bisher) => (fassung ? [...bisher, fassung] : bisher));
    setFassung({ text, befunde });
  }

  function fassungZurueck() {
    setVerlauf((bisher) => {
      const vorige = bisher[bisher.length - 1];
      if (vorige) setFassung(vorige);
      return bisher.slice(0, -1);
    });
  }

  if (gewaehlt && fassung) {
    return (
      <div className="flex flex-col gap-5">
        <Mailwerkstatt
          text={fassung.text}
          befunde={fassung.befunde}
          kundeId={kunde?.id || null}
          kundenname={kunde?.name ?? null}
          mailId={lage.mailId || null}
          beiNeuerFassung={neueFassung}
          beiFassungZurueck={fassungZurueck}
          fassungZurueckMoeglich={verlauf.length > 0}
        />

        <div>
          <button
            type="button"
            onClick={() => {
              setGewaehlt(null);
              setFassung(null);
              setVerlauf([]);
            }}
            className="text-m text-gruen hover:underline"
          >
            Andere Fassung
          </button>
        </div>

        {/* Erst Deutsch fertig, dann Englisch (`SKILLS.md`, Skill
            `uebersetzer`): Die Übersetzung startet erst, wenn sie eine
            Fassung freigegeben hat — nie für eine Mail, die noch wackelt.
            Und nur, wenn der Kunde Englisch spricht; das steht in der Akte,
            sie muss nichts umschalten. */}
        {kunde?.sprache === "en" ? (
          <EnglischeFassung
            deutsch={fassung.text}
            kundeId={kunde.id || null}
            mailId={lage.mailId || null}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Befundstreifen befunde={lage.befunde} />

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
              <Mailtext
                text={fassung.text}
                ungedeckt={ungedeckteStellen(lage.befunde)}
              />
            </Papier>
            <div>
              <Knopf art="neben" onClick={() => waehlen(fassung.marke)}>
                Diese nehmen
              </Knopf>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
