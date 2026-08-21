"use client";

import { useSyncExternalStore } from "react";

/**
 * Die Begrüßung wechselt mit der Tageszeit — mit *ihrer* Tageszeit.
 *
 * Warum das im Browser bestimmt wird und nicht im Server: Der Server steht
 * bei Cloudflare irgendwo im Netz und rechnet in UTC. Serverseitig bestimmt,
 * stünde morgens um neun „Guten Abend." auf ihrem Bildschirm. Und würde die
 * Seite beim Bauen vorberechnet, stünde dort für immer die Tageszeit des
 * Bauzeitpunkts.
 *
 * Der Server liefert „Guten Tag." — neutral und nie grob falsch — und der
 * Browser stellt beim Öffnen auf die richtige Tageszeit um.
 */
function nachTageszeit(): string {
  const stunde = new Date().getHours();
  if (stunde < 11) return "Guten Morgen.";
  if (stunde < 18) return "Guten Tag.";
  return "Guten Abend.";
}

/* Die Tageszeit ändert sich nicht durch ein Ereignis, auf das man horchen
   könnte — es gibt nichts zu abonnieren. */
const nichtsZuAbonnieren = () => () => {};

export function Begruessung() {
  const gruss = useSyncExternalStore(
    nichtsZuAbonnieren,
    nachTageszeit,
    () => "Guten Tag.",
  );

  return <h1 className="text-2xl font-semibold mb-6">{gruss}</h1>;
}
