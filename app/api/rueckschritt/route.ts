import { NextResponse, type NextRequest } from "next/server";
import { angemeldeteNutzerin } from "@/lib/supabase/server";

/**
 * Die Rückschrittsprüfung (`MODELL.md` §6, Stufe 3).
 *
 * **Läuft nur lokal.** Zwei Gründe, und beide sind hart:
 *
 * 1. Der Durchlauf schreibt den letzten Bezugspunkt ins Dateisystem, damit er
 *    im Repo liegt und in einem Diff auftaucht. Cloudflare Workers haben kein
 *    Dateisystem — dort ginge das gar nicht.
 * 2. Er kostet einen Modellaufruf **pro Fall**. Ein Endpunkt, der in der
 *    ausgelieferten App dreißig Aufrufe auf einen Klick auslöst, ist eine
 *    Kostenfalle. Seine Mutter hat damit ohnehin nichts zu tun; es ist das
 *    Werkzeug des Users, bevor er eine Änderung übernimmt.
 *
 * Aufruf lokal: `npm run dev`, dann POST auf `/api/rueckschritt`.
 */
export async function POST(anfrage: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { fehler: "Die Rückschrittsprüfung läuft nur lokal." },
      { status: 404 },
    );
  }

  const nutzerin = await angemeldeteNutzerin();
  if (!nutzerin) {
    return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
  }

  let festschreiben = false;
  try {
    ({ festschreiben = false } = await anfrage.json());
  } catch {
    /* Ohne Rumpf wird nur geprüft, nicht festgeschrieben — die
       vorsichtigere Vorgabe. */
  }

  /* Erst hier laden: Das Modul zieht `node:fs` nach, und das soll nicht in
     jedem Bau der App landen, nur weil die Route existiert. */
  const { pruefsatzDurchlaufen } = await import("@/lib/pruefsatz/durchlauf");

  try {
    const bericht = await pruefsatzDurchlaufen({
      nutzerId: nutzerin.id,
      festschreiben,
    });

    return NextResponse.json({
      urteil: bericht.urteilstext,
      rueckschritte: bericht.rueckschritte,
      faelle: bericht.durchlauf.ergebnisse.length,
      modell: bericht.durchlauf.modell,
    });
  } catch (fehler) {
    console.error("[rueckschritt] unerwartet:", fehler);
    return NextResponse.json(
      { fehler: "Der Durchlauf ist gescheitert. Siehe Serverprotokoll." },
      { status: 500 },
    );
  }
}
