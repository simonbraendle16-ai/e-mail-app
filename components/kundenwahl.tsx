"use client";

import { useState } from "react";
import { Kundenmarke } from "@/components/bausteine/kundenmarke";

/**
 * Wer ist der Kunde? (`DESIGN.md` §5, `MODELL.md` §5)
 *
 * **Feststellung, nicht Auswahlliste.** Der Kunde wird beim Einfügen erkannt
 * und angezeigt — nicht als Liste, die sie bedienen *muss*, sondern als Satz,
 * dem sie widersprechen kann. Meistens muss sie das nicht.
 *
 * Der Fehlschlag ist der Normalfall, nicht die Ausnahme (`CLAUDE.md` §9):
 * Kopiert sie nur den Mailtext ohne Kopfzeilen, steht der Absender bestenfalls
 * in der Signatur; bei Erstkontakt gibt es gar keinen Kunden. Deshalb ist
 * „unbekannt" hier ein gleichwertiger Zustand mit eigener, ruhiger Behandlung —
 * und nicht eine Fehlermeldung.
 */

export type KundeKurz = {
  id: string;
  name: string;
  sprache: "de" | "en";
};

export type Erkennungslage =
  | { stand: "still" }
  | { stand: "sucht" }
  | { stand: "erkannt"; kunde: KundeKurz }
  | { stand: "mehrdeutig"; kandidaten: KundeKurz[] }
  | { stand: "unbekannt" };

export function Kundenwahl({
  lage,
  gewaehlt,
  alleKunden,
  beiWahl,
}: {
  lage: Erkennungslage;
  /** Was sie selbst gewählt hat — schlägt die Erkennung. */
  gewaehlt: KundeKurz | null;
  alleKunden: KundeKurz[];
  beiWahl: (kunde: KundeKurz | null) => void;
}) {
  const [waehlt, setWaehlt] = useState(false);

  if (lage.stand === "still" && !gewaehlt) return null;

  /* --- Auswahl offen ---------------------------------------------------- */
  if (waehlt) {
    return (
      <div className="flex flex-col gap-3">
        <span className="text-s text-text-leise font-semibold">
          Zu wem gehört diese Mail?
        </span>

        {alleKunden.length === 0 ? (
          <p className="text-m text-text-leise">
            Noch keine Kunden. Der erste entsteht, sobald du eine Mail
            schreibst — schreib einfach weiter.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {alleKunden.map((kunde) => (
              <button
                key={kunde.id}
                type="button"
                onClick={() => {
                  beiWahl(kunde);
                  setWaehlt(false);
                }}
                className="text-m text-gruen hover:underline"
              >
                {kunde.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => {
              beiWahl(null);
              setWaehlt(false);
            }}
            className="text-s text-text-leise hover:underline"
          >
            Niemand von denen — ohne Kunden weiter
          </button>
          <button
            type="button"
            onClick={() => setWaehlt(false)}
            className="text-s text-text-leise hover:underline"
          >
            abbrechen
          </button>
        </div>
      </div>
    );
  }

  /* --- Sie hat selbst gewählt ------------------------------------------- */
  if (gewaehlt) {
    return (
      <Zeile>
        <Kundenmarke name={gewaehlt.name} sprache={gewaehlt.sprache} />
        <Aendern beiKlick={() => setWaehlt(true)} />
      </Zeile>
    );
  }

  /* --- Erkennung -------------------------------------------------------- */
  switch (lage.stand) {
    case "sucht":
      return (
        <Zeile>
          <span className="text-m text-text-leise">Ich schaue nach …</span>
        </Zeile>
      );

    case "erkannt":
      return (
        <Zeile>
          <Kundenmarke name={lage.kunde.name} sprache={lage.kunde.sprache} />
          <Aendern beiKlick={() => setWaehlt(true)} />
        </Zeile>
      );

    case "mehrdeutig":
      /* Zwei Kunden treffen ähnlich stark. Fragen statt raten — eine Mail an
         den falschen Kunden ist schlimmer als eine Rückfrage. */
      return (
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-s text-text-leise font-semibold">Kunde</span>
          <span className="text-m">Ist das …</span>
          {lage.kandidaten.map((kunde) => (
            <button
              key={kunde.id}
              type="button"
              onClick={() => beiWahl(kunde)}
              className="text-m text-gruen hover:underline"
            >
              {kunde.name}?
            </button>
          ))}
          <Aendern beiKlick={() => setWaehlt(true)} text="jemand anders" />
        </div>
      );

    case "unbekannt":
      return (
        <Zeile>
          <span className="text-m text-text-leise">
            Ich weiß nicht, von wem die Mail ist.
          </span>
          <button
            type="button"
            onClick={() => setWaehlt(true)}
            className="text-m text-gruen hover:underline"
          >
            sagen
          </button>
          <span className="text-s text-text-leise">
            oder einfach weiterschreiben
          </span>
        </Zeile>
      );

    default:
      return null;
  }
}

function Zeile({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-s text-text-leise font-semibold">Kunde</span>
      {children}
    </div>
  );
}

function Aendern({
  beiKlick,
  text = "ändern",
}: {
  beiKlick: () => void;
  text?: string;
}) {
  return (
    <button
      type="button"
      onClick={beiKlick}
      className="text-m text-gruen hover:underline"
    >
      {text}
    </button>
  );
}
