"use client";

import { useEffect, useRef, useState } from "react";
import { Knopf } from "@/components/bausteine/knopf";
import { Aufklappbar } from "@/components/bausteine/aufklappbar";
import { Hinweisstreifen } from "@/components/bausteine/hinweisstreifen";
import { Papier, Mailtext } from "@/components/bausteine/papier";
import type { Abweichung } from "@/lib/uebersetzen/abweichung";
import type { Glossarvorschlag } from "@/lib/uebersetzen/uebersetzen";

/**
 * Die englische Fassung mit ihrem Sicherheitsnetz (`CLAUDE.md` §5.2,
 * `SKILLS.md` §8).
 *
 * **Die Rückübersetzung ist der Grund, warum dieser Bereich so aussieht.**
 * Sie braucht die App, *weil* sie das Fach-Englisch nicht sicher beurteilen
 * kann — also nützt ihr eine englische Mail allein wenig. Was hilft, ist der
 * deutsche Text daneben, der zeigt, was dort tatsächlich steht.
 *
 * Eingeklappt, damit er nicht im Weg ist. Aufgeklappt, sobald die maschinelle
 * Prüfung eine Abweichung bei einer Zusage, einer Verneinung oder einer Zahl
 * gefunden hat — das ist der einzige Fall, in dem die App ihr von sich aus
 * etwas zeigt, das sie nicht angefragt hat.
 */

type Lage =
  | { art: "bereit" }
  | { art: "laeuft"; schritt: string }
  | {
      art: "fertig";
      englisch: string;
      rueckuebersetzung: string;
      abweichungen: Abweichung[];
      glossarLuecken: { de: string; en: string }[];
      nachfragen: Glossarvorschlag[];
    }
  | { art: "fehler"; text: string };

export function EnglischeFassung({
  deutsch,
  kundeId,
  mailId,
}: {
  /** Die freigegebene deutsche Fassung. Nie eine, die noch nicht steht. */
  deutsch: string;
  kundeId: string | null;
  mailId: string | null;
}) {
  const [lage, setLage] = useState<Lage>({ art: "bereit" });
  const abbruch = useRef<AbortController | null>(null);
  const gestartetFuer = useRef<string | null>(null);

  /* Die Sprache hängt am Kunden, nicht an einem Schalter — sie muss nichts
     umschalten (`CLAUDE.md` §5.2). Also läuft die Übersetzung von selbst,
     sobald eine deutsche Fassung freigegeben ist. */
  useEffect(() => {
    if (!deutsch.trim()) return;
    /* Nur einmal je Fassung. Ohne diese Sperre startet jeder erneute
       Durchlauf der Komponente einen weiteren Modellaufruf — und der kostet
       richtig Geld. */
    if (gestartetFuer.current === deutsch) return;
    gestartetFuer.current = deutsch;

    void uebersetzen(deutsch);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [deutsch]);

  useEffect(() => () => abbruch.current?.abort(), []);

  async function uebersetzen(text: string) {
    abbruch.current?.abort();
    abbruch.current = new AbortController();

    setLage({ art: "laeuft", schritt: "Einen Moment." });

    try {
      const antwort = await fetch("/api/uebersetzen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deutsch: text, kundeId, mailId }),
        signal: abbruch.current.signal,
      });

      if (!antwort.ok || !antwort.body) {
        setLage({
          art: "fehler",
          text: "Die Übersetzung klemmt gerade. Deine deutsche Mail ist da.",
        });
        return;
      }

      const leser = antwort.body.getReader();
      const wandler = new TextDecoder();
      let rest = "";

      for (;;) {
        const { done, value } = await leser.read();
        if (done) break;

        rest += wandler.decode(value, { stream: true });
        const zeilen = rest.split("\n\n");
        rest = zeilen.pop() ?? "";

        for (const zeile of zeilen) {
          const sauber = zeile.trim();
          if (!sauber.startsWith("data:")) continue;

          try {
            const nachricht = JSON.parse(sauber.slice(5).trim());

            switch (nachricht.art) {
              case "schritt":
                setLage({ art: "laeuft", schritt: nachricht.text });
                break;
              case "fertig":
                setLage({
                  art: "fertig",
                  englisch: nachricht.englisch,
                  rueckuebersetzung: nachricht.rueckuebersetzung,
                  abweichungen: nachricht.abweichungen ?? [],
                  glossarLuecken: nachricht.glossarLuecken ?? [],
                  nachfragen: nachricht.nachfragen ?? [],
                });
                break;
              case "fehler":
                setLage({ art: "fehler", text: nachricht.text });
                break;
            }
          } catch {
            /* Ein unvollständiges Stück — beim nächsten Durchlauf ist es ganz. */
          }
        }
      }
    } catch (fehler) {
      if (fehler instanceof DOMException && fehler.name === "AbortError") return;
      setLage({
        art: "fehler",
        text: "Die Übersetzung klemmt gerade. Deine deutsche Mail ist da.",
      });
    }
  }

  if (lage.art === "bereit") return null;

  if (lage.art === "laeuft") {
    return (
      <p className="text-m text-text-leise" role="status">
        {lage.schritt}
      </p>
    );
  }

  if (lage.art === "fehler") {
    return (
      <div className="flex flex-col gap-3">
        <Hinweisstreifen art="fehler">{lage.text}</Hinweisstreifen>
        <div>
          <Knopf art="neben" onClick={() => void uebersetzen(deutsch)}>
            Nochmal versuchen
          </Knopf>
        </div>
      </div>
    );
  }

  return <Fertig lage={lage} deutsch={deutsch} />;
}

/* ------------------------------------------------------------------------ */

function Fertig({
  lage,
  deutsch,
}: {
  lage: Extract<Lage, { art: "fertig" }>;
  deutsch: string;
}) {
  const [kopiert, setKopiert] = useState(false);

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(lage.englisch);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2000);
    } catch {
      /* Ohne Zwischenablage markiert sie den Text und kopiert selbst. */
    }
  }

  const stellen = lage.abweichungen.flatMap((a) => a.stellen);

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-s font-semibold text-text-leise">Englisch</h2>

      {lage.glossarLuecken.length > 0 ? (
        <Hinweisstreifen>
          {`Diese Begriffe wollte ich verwenden, habe es aber nicht hinbekommen: ${lage.glossarLuecken
            .map((l) => `${l.de} (${l.en})`)
            .join(", ")}. Bitte schau die Stellen an.`}
        </Hinweisstreifen>
      ) : null}

      {lage.abweichungen.map((abweichung) => (
        <Hinweisstreifen key={`${abweichung.art}-${abweichung.text}`}>
          {abweichung.text}
        </Hinweisstreifen>
      ))}

      <Papier>
        <Mailtext text={lage.englisch} />
      </Papier>

      <div className="flex items-center gap-5">
        <Knopf onClick={kopieren}>{kopiert ? "Kopiert" : "Kopieren"}</Knopf>
      </div>

      {/* Ihr Sicherheitsnetz. Von selbst offen, wenn die Prüfung etwas
          gefunden hat — dann ist genau das der Grund hinzusehen. */}
      <Aufklappbar
        zeile="Steht da, was du meinst?"
        offenZuBeginn={lage.abweichungen.length > 0}
      >
        <p className="text-s text-text-leise mb-3">
          Das Englische, zurück ins Deutsche übertragen — wörtlich, nicht
          schön. Steht hier, was du sagen wolltest, stimmt es.
        </p>
        <Papier>
          <Mailtext text={lage.rueckuebersetzung} ungedeckt={stellen} />
        </Papier>
        <p className="text-s text-text-leise mt-3">
          Zum Vergleich, dein Text: {kurz(deutsch)}
        </p>
      </Aufklappbar>

      {lage.nachfragen.length > 0 ? (
        <Nachfragen vorschlaege={lage.nachfragen} />
      ) : null}
    </div>
  );
}

function kurz(text: string): string {
  const eine = text.replace(/\s+/g, " ").trim();
  return eine.length > 160 ? `${eine.slice(0, 160)} …` : eine;
}

/**
 * „Heißt das bei euch so?" — der einzige Weg, auf dem das Glossar wächst.
 *
 * Höchstens drei pro Mail, sonst wird es zur Last. Was sie nicht bestätigt,
 * bleibt Vorschlag und wird nie erzwungen — deshalb gibt es kein „Nein", das
 * etwas löschen müsste, sondern nur ein Wegklicken.
 */
function Nachfragen({ vorschlaege }: { vorschlaege: Glossarvorschlag[] }) {
  const [offen, setOffen] = useState(vorschlaege);

  async function bestaetigen(vorschlag: Glossarvorschlag) {
    setOffen((bisher) => bisher.filter((v) => v.de !== vorschlag.de));
    try {
      await fetch("/api/glossar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vorschlag),
      });
    } catch {
      /* Beim nächsten Mal fragt die App erneut. */
    }
  }

  if (offen.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-s font-semibold text-text-leise">
        Heißt das bei euch so?
      </p>
      {offen.map((vorschlag) => (
        <div key={vorschlag.de} className="flex flex-wrap items-center gap-4">
          <span className="text-m">
            {vorschlag.de} → {vorschlag.en}
          </span>
          <button
            type="button"
            onClick={() => void bestaetigen(vorschlag)}
            className="text-m text-gruen hover:underline"
          >
            Ja, so
          </button>
          <button
            type="button"
            onClick={() =>
              setOffen((bisher) => bisher.filter((v) => v.de !== vorschlag.de))
            }
            className="text-s text-text-leise hover:underline"
          >
            nein
          </button>
        </div>
      ))}
    </div>
  );
}
