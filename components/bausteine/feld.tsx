"use client";

import type { InputHTMLAttributes, Ref, TextareaHTMLAttributes } from "react";
import { useId } from "react";

/**
 * Eingabefeld — DESIGN.md §4.
 * Fläche --grund-tief, 1 px --linie, --radius-feld, Innenabstand 14/16 px, Größe m.
 * Beschriftung darüber in s, Farbe --text-leise, Abstand 8 px.
 * Der Fokusrahmen kommt aus globals.css und wird nie entfernt.
 */
const feldStil =
  "w-full bg-grund-tief border border-linie rounded-feld px-[16px] py-[14px] font-ui text-m text-text placeholder:text-text-leise";

const beschriftungStil = "block text-s text-text-leise mb-2 font-semibold";

type FeldEigenschaften = InputHTMLAttributes<HTMLInputElement> & {
  beschriftung: string;
  hilfe?: string;
};

export function Feld({
  beschriftung,
  hilfe,
  className = "",
  id,
  ...rest
}: FeldEigenschaften) {
  const erzeugteId = useId();
  const feldId = id ?? erzeugteId;
  const hilfeId = hilfe ? `${feldId}-hilfe` : undefined;

  return (
    <div>
      <label htmlFor={feldId} className={beschriftungStil}>
        {beschriftung}
      </label>
      <input
        {...rest}
        id={feldId}
        aria-describedby={hilfeId}
        className={`${feldStil} ${className}`}
      />
      {hilfe ? (
        <p id={hilfeId} className="text-s text-text-leise mt-2">
          {hilfe}
        </p>
      ) : null}
    </div>
  );
}

type BereichEigenschaften = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  beschriftung: string;
  hilfe?: string;
  /* Ab React 19 ist ref eine normale Eigenschaft -- kein forwardRef noetig.
     Gebraucht wird sie, um den getippten Text auszulesen, ohne bei jedem
     Tastendruck neu zu zeichnen. */
  ref?: Ref<HTMLTextAreaElement>;
};

export function Textbereich({
  beschriftung,
  hilfe,
  className = "",
  id,
  ref,
  ...rest
}: BereichEigenschaften) {
  const erzeugteId = useId();
  const feldId = id ?? erzeugteId;
  const hilfeId = hilfe ? `${feldId}-hilfe` : undefined;

  return (
    <div>
      <label htmlFor={feldId} className={beschriftungStil}>
        {beschriftung}
      </label>
      <textarea
        {...rest}
        ref={ref}
        id={feldId}
        aria-describedby={hilfeId}
        className={`${feldStil} resize-y ${className}`}
      />
      {hilfe ? (
        <p id={hilfeId} className="text-s text-text-leise mt-2">
          {hilfe}
        </p>
      ) : null}
    </div>
  );
}
