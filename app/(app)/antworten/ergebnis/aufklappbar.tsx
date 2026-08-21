"use client";

import { useState } from "react";

/**
 * Eingeklappter Bereich zum Gegenlesen — für die deutsche Fassung unter
 * einer englischen Mail und für die Rückübersetzung (SKILLS.md §8).
 * Eingeklappt, damit es nicht im Weg ist.
 */
export function Aufklappbar({
  zeile,
  children,
}: {
  zeile: string;
  children: React.ReactNode;
}) {
  const [offen, setOffen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOffen(!offen)}
        aria-expanded={offen}
        className="font-ui text-m font-semibold text-gruen hover:underline"
      >
        {zeile}
      </button>
      {offen ? <div className="mt-3 animate-auftauchen">{children}</div> : null}
    </div>
  );
}
