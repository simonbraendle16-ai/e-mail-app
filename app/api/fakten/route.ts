import { NextResponse, type NextRequest } from "next/server";
import { angemeldeteNutzerin } from "@/lib/supabase/server";
import { faktBestaetigen, faktLoeschen } from "@/lib/db/fakten";

/**
 * Bestätigen oder Entfernen eines gelernten Punktes (`DESIGN.md` §5).
 *
 * Die Fakten entstehen ohne ihr Zutun. Genau deshalb muss sie jeden einzelnen
 * wieder loswerden können — ein falsch abgeleiteter steckte sonst für immer
 * in jeder Mail an diesen Kunden.
 */
export async function POST(anfrage: NextRequest) {
  const nutzerin = await angemeldeteNutzerin();
  if (!nutzerin) {
    return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
  }

  let angaben: { was?: "bestaetigen" | "loeschen"; id?: string };

  try {
    angaben = await anfrage.json();
  } catch {
    return NextResponse.json(
      { fehler: "Die Anfrage war nicht lesbar." },
      { status: 400 },
    );
  }

  if (!angaben.id || !angaben.was) {
    return NextResponse.json({ fehler: "Es fehlt der Punkt." }, { status: 400 });
  }

  try {
    if (angaben.was === "bestaetigen") {
      await faktBestaetigen(angaben.id);
    } else {
      await faktLoeschen(angaben.id);
    }

    return NextResponse.json({ gespeichert: true });
  } catch {
    return NextResponse.json({ gespeichert: false }, { status: 200 });
  }
}
