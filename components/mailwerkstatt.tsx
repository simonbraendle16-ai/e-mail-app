"use client";

import { useRef, useState } from "react";
import { Knopf } from "@/components/bausteine/knopf";
import { Textbereich } from "@/components/bausteine/feld";
import { Hinweisstreifen } from "@/components/bausteine/hinweisstreifen";
import { Papier, Mailtext } from "@/components/bausteine/papier";
import { Befundstreifen, ungedeckteStellen } from "@/components/befundstreifen";
import type { Befund } from "@/lib/pruefungen/typen";
import type { Regelvorschlag } from "@/lib/lernen/ableitung";

/**
 * Die Arbeitsfläche unter der gewählten Fassung — die Korrekturschleife
 * (`PLAN.md` §4).
 *
 * **Beide Wege sind gebaut, sie kann wählen:**
 *
 *  - **Weg 1 — sagen, was stört.** „zu förmlich", und es kommt eine neue
 *    Fassung. Daneben zwei Haken: für diesen Kunden merken oder immer.
 *    Was sie so setzt, gilt sofort.
 *  - **Weg 2 — den Text überschreiben.** Sie bearbeitet die Mail wie in Word.
 *    Beim Übernehmen wird verglichen und **gefragt**, ob dahinter eine Regel
 *    steckt — nie stillschweigend gelernt.
 *
 * Warum beides und nicht nur eins: Weg 2 rät zwangsläufig. Erweist er sich
 * als zu fehleranfällig, lässt er sich abschalten, und Weg 1 trägt die
 * Korrekturschleife allein.
 */

type Lage =
  | { art: "ruhe" }
  | { art: "laeuft"; schritt: string; text: string }
  | { art: "fehler"; text: string };

export function Mailwerkstatt({
  text,
  befunde,
  kundeId,
  kundenname,
  mailId,
  stichworte,
  eingehenderText,
  beiNeuerFassung,
  beiFassungZurueck,
  fassungZurueckMoeglich,
}: {
  text: string;
  befunde: Befund[];
  kundeId: string | null;
  kundenname: string | null;
  mailId: string | null;
  stichworte?: string;
  eingehenderText?: string;
  /** Eine überarbeitete oder von ihr bearbeitete Fassung. */
  beiNeuerFassung: (text: string, befunde: Befund[]) => void;
  beiFassungZurueck: () => void;
  fassungZurueckMoeglich: boolean;
}) {
  const [lage, setLage] = useState<Lage>({ art: "ruhe" });
  const [korrekturOffen, setKorrekturOffen] = useState(false);
  const [bearbeitet, setBearbeitet] = useState(false);
  const [kopiert, setKopiert] = useState(false);
  const [bewertung, setBewertung] = useState<"offen" | "gut" | "schlecht">(
    "offen",
  );
  const [vorschlag, setVorschlag] = useState<Regelvorschlag | null>(null);

  const korrektur = useRef<HTMLTextAreaElement>(null);
  const eigener = useRef<HTMLTextAreaElement>(null);
  const fuerKunden = useRef<HTMLInputElement>(null);
  const immer = useRef<HTMLInputElement>(null);
  const abbruch = useRef<AbortController | null>(null);

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(text);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2000);
    } catch {
      /* Ohne Zwischenablage markiert sie den Text und kopiert selbst. */
    }
  }

  /* --- Weg 1 ----------------------------------------------------------- */
  async function ueberarbeiten() {
    const anweisung = korrektur.current?.value.trim() ?? "";
    if (!anweisung) return;

    /* „Immer so machen" schlägt „für diesen Kunden": Wer beides ankreuzt,
       will die Regel überall — die engere Variante wäre eine Einschränkung,
       die sie nicht gemeint hat. */
    const merken = immer.current?.checked
      ? "immer"
      : fuerKunden.current?.checked
        ? "kunde"
        : null;

    abbruch.current?.abort();
    abbruch.current = new AbortController();

    setLage({ art: "laeuft", schritt: "Einen Moment.", text: "" });

    try {
      const antwort = await fetch("/api/ueberarbeiten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abbruch.current.signal,
        body: JSON.stringify({
          bisher: text,
          anweisung,
          kundeId,
          mailId,
          stichworte,
          eingehenderText,
          merken,
        }),
      });

      if (!antwort.ok || !antwort.body) {
        setLage({
          art: "fehler",
          text: "Das hat gerade nicht geklappt. Deine Mail ist noch da.",
        });
        return;
      }

      const leser = antwort.body.getReader();
      const wandler = new TextDecoder();
      let rest = "";
      let gesammelt = "";
      let schritt = "Einen Moment.";

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
                schritt = nachricht.text;
                setLage({ art: "laeuft", schritt, text: gesammelt });
                break;
              case "text":
                gesammelt += nachricht.text;
                setLage({ art: "laeuft", schritt, text: gesammelt });
                break;
              case "fertig":
                setLage({ art: "ruhe" });
                setKorrekturOffen(false);
                if (korrektur.current) korrektur.current.value = "";
                beiNeuerFassung(nachricht.text, nachricht.befunde ?? []);
                break;
              case "fehler":
                setLage({ art: "fehler", text: nachricht.text });
                break;
            }
          } catch {
            /* Ein unvollständiges Stück. */
          }
        }
      }
    } catch (fehler) {
      if (fehler instanceof DOMException && fehler.name === "AbortError") return;
      setLage({
        art: "fehler",
        text: "Das hat gerade nicht geklappt. Deine Mail ist noch da.",
      });
    }
  }

  /* --- Weg 2 ----------------------------------------------------------- */
  async function uebernehmen() {
    const neuerText = eigener.current?.value ?? "";
    if (!neuerText.trim() || neuerText === text) {
      setBearbeitet(false);
      return;
    }

    /* Ihre Fassung gilt sofort — sie hat sie geschrieben. Auf die Antwort
       des Servers wird nicht gewartet: Der Regelvorschlag ist ein Zusatz,
       nicht die Voraussetzung dafür, dass ihr eigener Text gilt. */
    beiNeuerFassung(neuerText, []);
    setBearbeitet(false);

    try {
      const antwort = await fetch("/api/bearbeitung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vorher: text,
          nachher: neuerText,
          kundeId,
          mailId,
        }),
      });

      const ergebnis = await antwort.json();
      if (ergebnis.vorschlag) setVorschlag(ergebnis.vorschlag);
    } catch {
      /* Ohne Vorschlag ist ihre Bearbeitung trotzdem übernommen. */
    }
  }

  async function bewerten(wert: 1 | -1) {
    setBewertung(wert === 1 ? "gut" : "schlecht");
    if (wert === -1) setKorrekturOffen(true);

    if (!mailId) return;

    try {
      await fetch("/api/bewertung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mailId, bewertung: wert }),
      });
    } catch {
      /* Eine verlorene Bewertung ist kein Grund für eine Fehlermeldung. */
    }
  }

  /* --- Darstellung ----------------------------------------------------- */
  if (lage.art === "laeuft") {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-m text-text-leise" role="status">
          {lage.schritt}
        </p>
        {lage.text ? (
          <Papier>
            <Mailtext text={lage.text} />
          </Papier>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Befundstreifen befunde={befunde} />

      {bearbeitet ? (
        /* Wie in Word: Sie schreibt direkt hinein. Kein eigener Bildschirm,
           kein Bearbeitungsmodus mit eigenen Regeln. */
        <div className="flex flex-col gap-3">
          <Textbereich
            beschriftung="Deine Fassung"
            name="eigene-fassung"
            ref={eigener}
            rows={14}
            defaultValue={text}
            autoFocus
          />
          <div className="flex gap-3">
            <Knopf onClick={() => void uebernehmen()}>Übernehmen</Knopf>
            <Knopf art="text" onClick={() => setBearbeitet(false)}>
              Abbrechen
            </Knopf>
          </div>
        </div>
      ) : (
        <Papier>
          <Mailtext text={text} ungedeckt={ungedeckteStellen(befunde)} />
        </Papier>
      )}

      {lage.art === "fehler" ? (
        <Hinweisstreifen art="fehler">{lage.text}</Hinweisstreifen>
      ) : null}

      {bearbeitet ? null : (
        <div className="flex flex-wrap items-center gap-5">
          <Knopf onClick={kopieren}>{kopiert ? "Kopiert" : "Kopieren"}</Knopf>

          <button
            type="button"
            onClick={() => setKorrekturOffen(!korrekturOffen)}
            aria-expanded={korrekturOffen}
            className="font-ui text-m font-semibold text-gruen hover:underline"
          >
            Passt nicht?
          </button>

          <button
            type="button"
            onClick={() => setBearbeitet(true)}
            className="text-m text-gruen hover:underline"
          >
            Selbst ändern
          </button>

          {fassungZurueckMoeglich ? (
            <button
              type="button"
              onClick={beiFassungZurueck}
              className="text-m text-gruen hover:underline"
            >
              Fassung zurück
            </button>
          ) : null}

          {/* Daumen — Stufe 1 der Qualitätsmessung (`MODELL.md` §6). Aus
              diesen Bewertungen wächst der Prüfsatz; vorab beschaffen lässt
              er sich nicht. */}
          <div className="ml-auto flex items-center gap-3">
            {bewertung === "gut" ? (
              <span className="text-m text-text-leise">Gemerkt.</span>
            ) : bewertung === "schlecht" ? (
              <span className="text-m text-text-leise">
                Sag unten, was nicht gepasst hat.
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void bewerten(1)}
                  aria-label="Diese Mail war gut"
                  title="War gut"
                  className="text-m px-2 py-1 rounded-feld hover:bg-grund-tief"
                >
                  <span aria-hidden="true">👍</span>
                </button>
                <button
                  type="button"
                  onClick={() => void bewerten(-1)}
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
      )}

      {korrekturOffen && !bearbeitet ? (
        <div className="flex flex-col gap-3">
          <Textbereich
            beschriftung="Passt nicht?"
            name="korrektur"
            ref={korrektur}
            rows={2}
            placeholder="Sag einfach, was stört."
            autoFocus
          />

          <div className="flex flex-wrap gap-5">
            {kundenname ? (
              <label className="flex items-center gap-2 text-m">
                <input
                  type="checkbox"
                  ref={fuerKunden}
                  className="w-4 h-4 accent-gruen"
                />
                Für {kundenname} merken
              </label>
            ) : null}
            <label className="flex items-center gap-2 text-m">
              <input
                type="checkbox"
                ref={immer}
                className="w-4 h-4 accent-gruen"
              />
              Immer so machen
            </label>
          </div>

          <div className="flex gap-3">
            <Knopf art="neben" onClick={() => void ueberarbeiten()}>
              Nochmal schreiben
            </Knopf>
            <Knopf art="text" onClick={() => setKorrekturOffen(false)}>
              Abbrechen
            </Knopf>
          </div>
        </div>
      ) : null}

      {vorschlag ? (
        <Regelfrage
          vorschlag={vorschlag}
          kundeId={kundeId}
          kundenname={kundenname}
          beiAntwort={() => setVorschlag(null)}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * *„Du hast ‚mit freundlichen Grüßen' durch ‚Viele Grüße' ersetzt. Soll ich
 * mir das merken?"*
 *
 * Eine Frage, drei Antworten, kein Formular. Bis sie antwortet, steht die
 * Regel auf `vorgeschlagen` und wirkt nicht — abgeleitet wird, übernommen
 * wird nie stillschweigend.
 */
function Regelfrage({
  vorschlag,
  kundeId,
  kundenname,
  beiAntwort,
}: {
  vorschlag: Regelvorschlag;
  kundeId: string | null;
  kundenname: string | null;
  beiAntwort: () => void;
}) {
  async function antworten(
    entscheidung: "aktiv" | "abgelehnt",
    nurBeiKunde?: string | null,
  ) {
    beiAntwort();

    try {
      /* Der Vorschlag liegt schon in der Datenbank. Gesucht wird er über
         seinen Wortlaut — eine Kennung mitzuschleifen hieße, sie durch den
         ganzen Strom zu reichen, nur damit die Oberfläche sie nie ansieht. */
      const alle = await fetch("/api/regeln").then((a) => a.json());
      const treffer = (alle.regeln ?? []).find(
        (r: { text: string; status: string }) =>
          r.text === vorschlag.regel && r.status === "vorgeschlagen",
      );
      if (!treffer) return;

      await fetch("/api/regeln", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          was: "entscheiden",
          id: treffer.id,
          entscheidung,
          nurBeiKunde,
        }),
      });
    } catch {
      /* Beim nächsten Mal fällt dasselbe Muster wieder auf. */
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Hinweisstreifen>
        {vorschlag.beobachtung} {vorschlag.frage}
      </Hinweisstreifen>
      <div className="flex flex-wrap gap-3">
        <Knopf art="neben" onClick={() => void antworten("aktiv", null)}>
          Ja, merken
        </Knopf>
        {kundeId && kundenname ? (
          <Knopf art="neben" onClick={() => void antworten("aktiv", kundeId)}>
            Nur bei {kundenname}
          </Knopf>
        ) : null}
        <Knopf art="text" onClick={() => void antworten("abgelehnt")}>
          Nein
        </Knopf>
      </div>
    </div>
  );
}
