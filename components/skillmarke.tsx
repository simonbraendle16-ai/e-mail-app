"use client";

import { useState } from "react";

/**
 * „Als Liefertermin-Mail behandelt. anders?" (`DESIGN.md` §5, `SKILLS.md`).
 *
 * **Sie sieht immer, welcher Skill greift, und kann mit einem Klick
 * umschalten.** Kein verstecktes Verhalten — ordnet die App etwas falsch ein,
 * muss sie es sofort sehen und korrigieren können.
 *
 * Deshalb steht hier ein Satz und keine Auswahlliste: Eine Liste wäre etwas,
 * das sie bedienen *muss*. Ein Satz ist eine Feststellung, der man
 * widersprechen kann — und meistens muss man das nicht.
 */

export type SkillAnzeige = {
  name: string;
  /** Wie er in der Oberfläche heißt: „Liefertermin-Mail". */
  bezeichnung: string;
};

export function Skillmarke({
  aktiv,
  auswahl,
  beiWechsel,
}: {
  aktiv: SkillAnzeige;
  auswahl: SkillAnzeige[];
  beiWechsel?: (name: string) => void;
}) {
  const [offen, setOffen] = useState(false);

  const andere = auswahl.filter((s) => s.name !== aktiv.name);

  if (!offen) {
    return (
      <p className="text-m text-text-leise">
        Als {aktiv.bezeichnung} behandelt.{" "}
        {andere.length > 0 ? (
          <button
            type="button"
            onClick={() => setOffen(true)}
            className="text-gruen hover:underline"
          >
            anders?
          </button>
        ) : null}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-baseline gap-3">
      <span className="text-m text-text-leise">Behandeln als</span>
      {auswahl.map((skill) => (
        <button
          key={skill.name}
          type="button"
          onClick={() => {
            beiWechsel?.(skill.name);
            setOffen(false);
          }}
          className={
            skill.name === aktiv.name
              ? "text-m font-semibold text-gruen"
              : "text-m text-gruen hover:underline"
          }
        >
          {skill.bezeichnung}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setOffen(false)}
        className="text-s text-text-leise hover:underline"
      >
        abbrechen
      </button>
    </div>
  );
}
