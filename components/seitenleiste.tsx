"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Seitenleiste — die Navigation der App.
 *
 * Schmale Spalte ganz links, von oben nach unten, wie in gängigen Programmen.
 * Alles, was die App kann, steht hier untereinander; neue Funktionen kommen
 * als weitere Zeile dazu, ohne dass sich sonst etwas ändert.
 *
 * Warum überhaupt eine Leiste und keine Kopfzeile (so stand es ursprünglich
 * in DESIGN.md §5): Sie soll sich in der App zurechtfinden, ohne sie zu
 * lernen. Eine Leiste links ist das Muster, das sie aus jedem anderen
 * Programm kennt — und sie trägt die Funktionen, die noch kommen.
 *
 * Was sie *tut*, steht oben. Was sie *nachschlagen* kann, darunter.
 * Beides ist Angebot: keiner dieser Punkte muss je geöffnet werden.
 */

type Eintrag = {
  pfad: string;
  name: string;
  /* Auch aktiv, wenn eine Unterseite offen ist. */
  auchBei?: string[];
};

const ARBEIT: Eintrag[] = [
  { pfad: "/antworten", name: "Antworten" },
  { pfad: "/antworten?art=neu", name: "Neue Mail" },
];

const NACHSCHLAGEN: Eintrag[] = [
  { pfad: "/kunden", name: "Kunden" },
  { pfad: "/wissen", name: "Wissen" },
];

function Zeile({ eintrag, aktiv }: { eintrag: Eintrag; aktiv: boolean }) {
  return (
    <Link
      href={eintrag.pfad}
      aria-current={aktiv ? "page" : undefined}
      className={
        aktiv
          ? "block px-4 py-2 text-m font-semibold text-gruen bg-papier border-l-[3px] border-gruen"
          : "block px-4 py-2 text-m text-text border-l-[3px] border-transparent hover:bg-papier"
      }
    >
      {eintrag.name}
    </Link>
  );
}

export function Seitenleiste() {
  const pfad = usePathname();

  const istAktiv = (eintrag: Eintrag) =>
    pfad === eintrag.pfad.split("?")[0] ||
    (eintrag.auchBei?.includes(pfad) ?? false);

  return (
    <nav
      aria-label="Bereiche"
      className="w-leiste shrink-0 bg-grund-tief border-r border-linie min-h-screen sticky top-0 flex flex-col"
    >
      <Link
        href="/"
        className="px-4 py-4 text-m font-semibold text-text border-b border-linie"
      >
        E-Mail
      </Link>

      <div className="py-3 flex flex-col">
        {ARBEIT.map((eintrag) => (
          <Zeile
            key={eintrag.pfad}
            eintrag={eintrag}
            aktiv={istAktiv(eintrag)}
          />
        ))}
      </div>

      <div className="py-3 flex flex-col border-t border-linie">
        {NACHSCHLAGEN.map((eintrag) => (
          <Zeile
            key={eintrag.pfad}
            eintrag={eintrag}
            aktiv={istAktiv(eintrag)}
          />
        ))}
      </div>

      {/* Kosten stehen ganz unten und in kleiner Schrift: Sie sind für den
          User da, nicht für sie. Sich um Kosten kümmern zu müssen wäre genau
          der „Klotz am Bein", gegen den die App gebaut ist (CLAUDE.md §1). */}
      <div className="mt-auto p-4 flex flex-col gap-2 items-start">
        <Link
          href="/kosten"
          className={
            pfad === "/kosten"
              ? "text-s font-semibold text-gruen"
              : "text-s text-text-leise hover:text-gruen hover:underline"
          }
        >
          Kosten
        </Link>
      </div>

      <form action="/abmelden" method="post" className="px-4 pb-4">
        <button
          type="submit"
          className="text-s text-text-leise hover:text-gruen hover:underline"
        >
          Abmelden
        </button>
      </form>
    </nav>
  );
}
