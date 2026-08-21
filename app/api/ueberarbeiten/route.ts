import { NextResponse, type NextRequest } from "next/server";
import { angemeldeteNutzerin } from "@/lib/supabase/server";
import { ueberarbeiten } from "@/lib/verfassen/ueberarbeiten";

/**
 * Weg 1 der Korrekturschleife: Sie sagt, was stört — neue Fassung in wenigen
 * Sekunden (`PLAN.md` §4).
 *
 * Gestreamt wie das Verfassen, aus demselben Grund: Der Text soll ankommen,
 * während er entsteht.
 */
export async function POST(anfrage: NextRequest) {
  const nutzerin = await angemeldeteNutzerin();
  if (!nutzerin) {
    return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
  }

  let angaben: {
    bisher?: string;
    anweisung?: string;
    kundeId?: string | null;
    mailId?: string | null;
    stichworte?: string;
    eingehenderText?: string;
    merken?: "kunde" | "immer" | null;
  };

  try {
    angaben = await anfrage.json();
  } catch {
    return NextResponse.json(
      { fehler: "Die Anfrage war nicht lesbar." },
      { status: 400 },
    );
  }

  if (!angaben.bisher?.trim()) {
    return NextResponse.json(
      { fehler: "Es gibt noch keine Mail zum Überarbeiten." },
      { status: 400 },
    );
  }

  if (!angaben.anweisung?.trim()) {
    return NextResponse.json(
      { fehler: "Sag mir kurz, was nicht passt." },
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
        for await (const schritt of ueberarbeiten({
          nutzerId: nutzerin.id,
          bisher: angaben.bisher!,
          anweisung: angaben.anweisung!,
          kundeId: angaben.kundeId,
          mailId: angaben.mailId,
          stichworte: angaben.stichworte,
          eingehenderText: angaben.eingehenderText,
          merken: angaben.merken ?? null,
          abbruch: anfrage.signal,
        })) {
          senden(schritt);
        }
      } catch (fehler) {
        console.error("[ueberarbeiten] unerwartet:", fehler);
        senden({
          art: "fehler",
          text: "Die Verbindung klemmt gerade. Deine Mail ist noch da, probier es in einer Minute nochmal.",
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
