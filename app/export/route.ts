import { NextResponse } from "next/server";
import { angemeldeteNutzerin } from "@/lib/supabase/server";
import { datenExportieren } from "@/lib/db/export";

/**
 * Lädt alle ihre Daten als JSON-Datei herunter.
 *
 * Absichtlich eine schlichte Adresse ohne Bildschirm drumherum: Der Export ist
 * nichts, was sie im Alltag braucht — er muss existieren und funktionieren,
 * aber er soll keinen Platz in der Oberfläche beanspruchen.
 */
export async function GET() {
  const nutzerin = await angemeldeteNutzerin();
  if (!nutzerin) {
    return NextResponse.json(
      { fehler: "Nicht angemeldet." },
      { status: 401 },
    );
  }

  try {
    const daten = await datenExportieren();
    const datum = new Date().toISOString().slice(0, 10);

    return new NextResponse(JSON.stringify(daten, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="e-mail-app-export-${datum}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        fehler:
          "Der Export hat gerade nicht geklappt. Probier es in einer Minute nochmal.",
      },
      { status: 500 },
    );
  }
}
