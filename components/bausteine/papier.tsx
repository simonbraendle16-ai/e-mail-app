import type { ReactNode } from "react";

/**
 * Papierfläche — DESIGN.md §4.
 *
 * Das Werkstück. Hintergrund --papier, --radius-karte, --schatten-papier,
 * Innenabstand 32/40 px, Text in --schrift-mail, Größe l.
 * Der einzige Ort im System mit Schatten — nichts sonst schwebt.
 *
 * Die Mail blendet über 200 ms ein und steigt dabei 8 px auf (DESIGN.md §6).
 * Kein Schreibmaschineneffekt: das sähe nach Vorführung aus und hielte sie
 * beim Lesen auf.
 */
export function Papier({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-papier rounded-karte shadow-papier px-[40px] py-5 font-mail text-l whitespace-pre-wrap animate-auftauchen ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Lückenmarkierung — DESIGN.md §4.
 * `[Preis eintragen]` auf --hinweis-flae mit Schrift in --hinweis.
 * Soll ins Auge springen, ohne nach Fehler auszusehen: es ist eine Aufgabe,
 * kein Mangel.
 */
export function Luecke({ children }: { children: ReactNode }) {
  /* Kein horizontaler Innenabstand: der würde vor einem folgenden Satzzeichen
     wie ein Leerzeichen aussehen („[Datum eintragen] ."). Die Fläche allein
     hebt genug hervor.
     Kein Zeilenumbruch mitten in der Lücke: sonst zerreißt die Markierung
     über zwei Zeilen und sieht nach Fehler aus statt nach Aufgabe. */
  return (
    <mark className="bg-hinweis-flae text-hinweis rounded-feld whitespace-nowrap">
      {children}
    </mark>
  );
}

/**
 * Ungedeckte Angabe — die Markierung der Zahlenprüfung (`MODELL.md` §4).
 *
 * Bewusst anders als die Lücke: Eine Lücke ist eine Aufgabe, eine ungedeckte
 * Zahl ist ein Verdacht. Deshalb keine Fläche, sondern eine Unterstreichung
 * in `--fehler` — sie zieht den Blick auf das Wort selbst, statt es zu
 * überdecken, und sie ist die einzige Stelle in der fertigen Mail, an der
 * überhaupt Rot vorkommt (`DESIGN.md` §1).
 */
export function Ungedeckt({ children }: { children: ReactNode }) {
  return (
    <span
      className="text-fehler underline decoration-2 underline-offset-4"
      title="Diese Angabe stand in keiner Quelle."
    >
      {children}
    </span>
  );
}

/** Für den regulären Ausdruck entschärfen. */
function entschaerft(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Setzt einen Mailtext, hebt alles in eckigen Klammern als Lücke hervor und
 * markiert zusätzlich die Stellen, die die Prüfung beanstandet hat.
 */
export function Mailtext({
  text,
  ungedeckt = [],
}: {
  text: string;
  /**
   * Wörtliche Stellen aus den Befunden (`lib/pruefungen/typen.ts`) — Zahlen
   * und Daten, die in keiner Quelle standen.
   */
  ungedeckt?: string[];
}) {
  /* Lange Stellen zuerst, damit „13.03.2026" nicht von „13" zerlegt wird. */
  const stellen = [...new Set(ungedeckt)]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const muster = stellen.length
    ? new RegExp(`(\\[[^\\]]+\\]|${stellen.map(entschaerft).join("|")})`, "g")
    : /(\[[^\]]+\])/g;

  return (
    <>
      {text.split(muster).map((teil, i) => {
        if (!teil) return null;
        if (teil.startsWith("[") && teil.endsWith("]"))
          return <Luecke key={i}>{teil}</Luecke>;
        if (stellen.includes(teil)) return <Ungedeckt key={i}>{teil}</Ungedeckt>;
        return teil;
      })}
    </>
  );
}
