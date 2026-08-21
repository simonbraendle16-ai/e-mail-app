import { NextResponse, type NextRequest } from "next/server";
import { angemeldeteNutzerin } from "@/lib/supabase/server";
import { verfassen } from "@/lib/verfassen/verfassen";

/**
 * Streamt die entstehende Mail an den Browser.
 *
 * Eine Route und keine Server Action, weil Server Actions nur *einen* Wert
 * zurückgeben. Hier soll der Text ankommen, **während** er entsteht — das ist
 * der ganze Punkt (`MODELL.md` §2b): Ohne Streaming stünde sie 25 Sekunden vor
 * einer leeren Fläche, und genau das Warten füttert die Grübelschleife.
 *
 * Format: Server-Sent Events, ein JSON-Objekt pro Zeile. Kein WebSocket —
 * die Verbindung geht nur in eine Richtung, und SSE übersteht einen
 * Verbindungsabbruch besser.
 */
export async function POST(anfrage: NextRequest) {
  const nutzerin = await angemeldeteNutzerin();
  if (!nutzerin) {
    return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
  }

  let angaben: {
    eingehenderText?: string;
    stichworte?: string;
    kundeId?: string | null;
    skillName?: string;
    archivEinbeziehen?: boolean;
  };

  try {
    angaben = await anfrage.json();
  } catch {
    return NextResponse.json(
      { fehler: "Die Anfrage war nicht lesbar." },
      { status: 400 },
    );
  }

  if (!angaben.stichworte?.trim()) {
    return NextResponse.json(
      { fehler: "Schreib bitte kurz, was du sagen willst." },
      { status: 400 },
    );
  }

  const geber = new TextEncoder();

  const strom = new ReadableStream({
    async start(steuerung) {
      const senden = (nachricht: unknown) => {
        steuerung.enqueue(geber.encode(`data: ${JSON.stringify(nachricht)}\n\n`));
      };

      try {
        for await (const schritt of verfassen({
          nutzerId: nutzerin.id,
          eingehenderText: angaben.eingehenderText,
          stichworte: angaben.stichworte!,
          kundeId: angaben.kundeId,
          skillName: angaben.skillName,
          archivEinbeziehen: angaben.archivEinbeziehen,
          abbruch: anfrage.signal,
        })) {
          senden(schritt);
        }
      } catch (fehler) {
        /* Bis hierher sollte nichts durchkommen — `verfassen` fängt selbst.
           Falls doch, bekommt sie einen Satz statt eines abbrechenden Stroms. */
        console.error("[verfassen] unerwartet:", fehler);
        senden({
          art: "fehler",
          text: "Die Verbindung klemmt gerade. Dein Text ist gespeichert, probier es in einer Minute nochmal.",
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
      /* Verhindert, dass ein Zwischenspeicher den Strom sammelt und erst am
         Ende ausliefert — dann käme der Text auf einmal statt laufend. */
      "X-Accel-Buffering": "no",
    },
  });
}
