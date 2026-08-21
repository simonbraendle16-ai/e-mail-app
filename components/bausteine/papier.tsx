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
 * Setzt einen Mailtext und hebt dabei alles in eckigen Klammern hervor.
 * Reine Darstellung — die Lücken entstehen beim Formulieren (Phase 6).
 */
export function Mailtext({ text }: { text: string }) {
  const teile = text.split(/(\[[^\]]+\])/g);
  return (
    <>
      {teile.map((teil, i) =>
        teil.startsWith("[") && teil.endsWith("]") ? (
          <Luecke key={i}>{teil}</Luecke>
        ) : (
          teil
        ),
      )}
    </>
  );
}
