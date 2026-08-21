import { NextResponse, type NextRequest } from "next/server";
import { angemeldeteNutzerin } from "@/lib/supabase/server";
import { uebersetzen } from "@/lib/uebersetzen/uebersetzen";

/**
 * Überträgt die freigegebene deutsche Mail ins Englische und wieder zurück.
 *
 * Wie beim Verfassen ein Strom statt einer Server Action — nicht wegen des
 * Textes, der kommt am Stück, sondern wegen der Schritte: Übersetzen,
 * Nachbessern und Rückübersetzen sind drei Modellaufrufe hintereinander. Ohne
 * Zwischenmeldung stünde sie eine halbe Minute vor einer Fläche, auf der
 * nichts passiert.
 */
export async function POST(anfrage: NextRequest) {
  const nutzerin = await angemeldeteNutzerin();
  if (!nutzerin) {
    return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
  }

  let angaben: {
    deutsch?: string;
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

  if (!angaben.deutsch?.trim()) {
    return NextResponse.json(
      { fehler: "Es gibt noch keinen Text zum Übersetzen." },
      { status: 400 },
    );
  }

  const geber = new TextEncoder();

  const strom = new ReadableStream({
    async start(steuerung) {
      const senden = (nachricht: unknown) => {
        steuerung.enqueue(
          geber.encode(`data: ${JSON.stringify(nachricht)}\n\n`),
        );
      };

      try {
        for await (const schritt of uebersetzen({
          nutzerId: nutzerin.id,
          deutsch: angaben.deutsch!,
          kundeId: angaben.kundeId,
          mailId: angaben.mailId,
          abbruch: anfrage.signal,
        })) {
          senden(schritt);
        }
      } catch (fehler) {
        console.error("[uebersetzen] unerwartet:", fehler);
        senden({
          art: "fehler",
          text: "Die Verbindung klemmt gerade. Deine deutsche Mail ist da, probier die Übersetzung in einer Minute nochmal.",
        });
      } finally {
        steuerung.close();
      }
    },
  });

  return new Response(strom, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
