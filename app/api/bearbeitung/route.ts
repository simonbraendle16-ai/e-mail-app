import { NextResponse, type NextRequest } from "next/server";
import { angemeldeteNutzerin } from "@/lib/supabase/server";
import { bearbeitungUebernehmen } from "@/lib/verfassen/ueberarbeiten";

/**
 * Weg 2 der Korrekturschleife: Sie hat den Text selbst überschrieben
 * (`PLAN.md` §4).
 *
 * Ihre Fassung wird **immer und sofort** übernommen — das ist ihr Text, da
 * gibt es nichts zu prüfen. Die Regelableitung läuft daneben und liefert
 * höchstens eine Frage zurück. Scheitert sie, ist die Bearbeitung trotzdem
 * gesichert: Der Vorschlag ist der Zusatz, nicht der Zweck.
 */
export async function POST(anfrage: NextRequest) {
  const nutzerin = await angemeldeteNutzerin();
  if (!nutzerin) {
    return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
  }

  let angaben: {
    vorher?: string;
    nachher?: string;
    kundeId?: string | null;
    mailId?: string | null;
  };

  try {
    angaben = await anfrage.json();
  } catch {
    return NextResponse.json(
      { fehler: "Die Anfrage war nicht lesbar." },
      { status: 400 },
    );
  }

  if (!angaben.nachher?.trim()) {
    return NextResponse.json({ fehler: "Der Text ist leer." }, { status: 400 });
  }

  try {
    const { vorschlag } = await bearbeitungUebernehmen({
      nutzerId: nutzerin.id,
      vorher: angaben.vorher ?? "",
      nachher: angaben.nachher,
      kundeId: angaben.kundeId,
      mailId: angaben.mailId,
      abbruch: anfrage.signal,
    });

    return NextResponse.json({ gespeichert: true, vorschlag });
  } catch (fehler) {
    console.error("[bearbeitung] unerwartet:", fehler);
    /* Kein Fehlerton: Ihr Text steht auf dem Bildschirm, sie kann ihn
       kopieren. Eine Meldung, die nach Datenverlust klingt, wäre falsch. */
    return NextResponse.json({ gespeichert: false, vorschlag: null });
  }
}
