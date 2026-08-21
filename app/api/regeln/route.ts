import { NextResponse, type NextRequest } from "next/server";
import { angemeldeteNutzerin } from "@/lib/supabase/server";
import {
  regelAnlegen,
  regelEntscheiden,
  regelLoeschen,
  regelnAlle,
} from "@/lib/db/regeln";
import { konflikteFinden } from "@/lib/lernen/konflikt";

/**
 * Die Regelverwaltung (`PLAN.md` §4).
 *
 * Ein einziger Endpunkt für alle vier Handgriffe — anlegen, entscheiden,
 * löschen, ansehen. Mehr Wege bräuchte es nicht, und jeder weitere wäre eine
 * Stelle mehr, an der die Anmeldeprüfung fehlen könnte.
 */

/** Alle Regeln samt erkannten Widersprüchen. */
export async function GET() {
  const nutzerin = await angemeldeteNutzerin();
  if (!nutzerin) {
    return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
  }

  const regeln = await regelnAlle();
  return NextResponse.json({ regeln, konflikte: konflikteFinden(regeln) });
}

export async function POST(anfrage: NextRequest) {
  const nutzerin = await angemeldeteNutzerin();
  if (!nutzerin) {
    return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
  }

  let angaben: {
    was?: "anlegen" | "entscheiden" | "loeschen";
    text?: string;
    kundeId?: string | null;
    id?: string;
    entscheidung?: "aktiv" | "abgelehnt";
    /** Bei „Nur bei diesem Kunden": schränkt den Geltungsbereich ein. */
    nurBeiKunde?: string | null;
  };

  try {
    angaben = await anfrage.json();
  } catch {
    return NextResponse.json(
      { fehler: "Die Anfrage war nicht lesbar." },
      { status: 400 },
    );
  }

  try {
    switch (angaben.was) {
      case "anlegen": {
        if (!angaben.text?.trim()) {
          return NextResponse.json(
            { fehler: "Die Regel ist leer." },
            { status: 400 },
          );
        }

        /* Ausdrücklich gesetzt heißt sofort aktiv — kein Rateschritt
           dazwischen (`PLAN.md` §4). */
        const regel = await regelAnlegen({
          nutzerId: nutzerin.id,
          text: angaben.text.trim(),
          kundeId: angaben.kundeId ?? null,
          art: "ton",
        });

        return NextResponse.json({ regel });
      }

      case "entscheiden": {
        if (!angaben.id || !angaben.entscheidung) {
          return NextResponse.json(
            { fehler: "Es fehlt die Entscheidung." },
            { status: 400 },
          );
        }

        await regelEntscheiden(
          angaben.id,
          angaben.entscheidung,
          angaben.nurBeiKunde,
        );
        return NextResponse.json({ gespeichert: true });
      }

      case "loeschen": {
        if (!angaben.id) {
          return NextResponse.json(
            { fehler: "Es fehlt die Regel." },
            { status: 400 },
          );
        }

        await regelLoeschen(angaben.id);
        return NextResponse.json({ gespeichert: true });
      }

      default:
        return NextResponse.json(
          { fehler: "Unbekannter Vorgang." },
          { status: 400 },
        );
    }
  } catch (fehler) {
    console.error("[regeln] unerwartet:", fehler);
    return NextResponse.json(
      { fehler: "Das konnte ich gerade nicht speichern. Probier es nochmal." },
      { status: 200 },
    );
  }
}
