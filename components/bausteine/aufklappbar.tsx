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
  offenZuBeginn = false,
}: {
  zeile: string;
  children: React.ReactNode;
  /**
   * Steht schon offen da. Nur für den Fall, dass es einen Grund gibt
   * hinzusehen — die Rückübersetzung klappt sich auf, wenn die Prüfung eine
   * Abweichung gefunden hat (`SKILLS.md`, Skill `rueckuebersetzung`).
   */
  offenZuBeginn?: boolean;
}) {
  const [offen, setOffen] = useState(offenZuBeginn);

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
      {offen ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
