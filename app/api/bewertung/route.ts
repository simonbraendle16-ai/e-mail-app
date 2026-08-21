import { NextResponse, type NextRequest } from "next/server";
import { angemeldeteNutzerin, serverZugang } from "@/lib/supabase/server";

/**
 * Daumen hoch oder runter unter einer Mail (`MODELL.md` §6).
 *
 * **Das ist der Prüfsatz.** Er muss nicht vorab beschafft werden — er wächst
 * aus ihrer alltäglichen Bewertung. Jede bewertete Mail ist später ein Fall,
 * gegen den sich prüfen lässt, ob eine Änderung an Anweisungen oder Modell
 * etwas verschlechtert hat (Phase 11).
 *
 * Deshalb ist der Daumen kein Beiwerk, sondern die einzige Datenquelle für
 * Qualitätsmessung, die dieses Projekt je bekommen wird.
 */
export async function POST(anfrage: NextRequest) {
  const nutzerin = await angemeldeteNutzerin();
  if (!nutzerin) {
    return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
  }

  let angaben: { mailId?: string; bewertung?: number };

  try {
    angaben = await anfrage.json();
  } catch {
    return NextResponse.json(
      { fehler: "Die Anfrage war nicht lesbar." },
      { status: 400 },
    );
  }

  const bewertung = angaben.bewertung;

  if (!angaben.mailId || (bewertung !== 1 && bewertung !== -1)) {
    return NextResponse.json(
      { fehler: "Es fehlt die Bewertung." },
      { status: 400 },
    );
  }

  try {
    const zugang = await serverZugang();
    await zugang
      .from("emails")
      .update({ bewertung })
      .eq("id", angaben.mailId);

    return NextResponse.json({ gespeichert: true });
  } catch {
    /* Eine verlorene Bewertung ist ärgerlich, aber kein Grund für eine
       Fehlermeldung — sie hat nichts falsch gemacht. */
    return NextResponse.json({ gespeichert: false }, { status: 200 });
  }
}
