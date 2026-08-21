import { NextResponse, type NextRequest } from "next/server";
import { angemeldeteNutzerin } from "@/lib/supabase/server";
import { bausteinAnlegen, bausteinLoeschen } from "@/lib/db/bausteine";
import { dokumentAblegen, dokumentLoeschen } from "@/lib/wissen/dokumente";
import type { Dokumentart } from "@/lib/wissen/dokumente";

/**
 * Der Wissen-Bildschirm: Textbausteine anlegen und löschen, Unterlagen
 * hochladen und löschen (`DESIGN.md` §5, `PLAN.md` §6 Phase 10).
 *
 * Der Upload kommt als `multipart/form-data`, alles andere als JSON — eine
 * Datei durch JSON zu schicken hieße, sie als Base64 zu verpacken und damit
 * um ein Drittel aufzublähen.
 */
export async function POST(anfrage: NextRequest) {
  const nutzerin = await angemeldeteNutzerin();
  if (!nutzerin) {
    return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
  }

  const art = anfrage.headers.get("content-type") ?? "";

  /* --- Datei hochladen ------------------------------------------------- */
  if (art.includes("multipart/form-data")) {
    try {
      const formular = await anfrage.formData();
      const datei = formular.get("datei");

      if (!(datei instanceof File)) {
        return NextResponse.json(
          { fehler: "Es fehlt die Datei." },
          { status: 400 },
        );
      }

      const ergebnis = await dokumentAblegen({
        nutzerId: nutzerin.id,
        datei,
        titel: String(formular.get("titel") ?? "") || datei.name,
        art: (formular.get("art") as Dokumentart | null) ?? "sonstiges",
        kundeId: (formular.get("kundeId") as string | null) || null,
        abbruch: anfrage.signal,
      });

      return NextResponse.json(ergebnis);
    } catch (fehler) {
      console.error("[wissen] Upload:", fehler);
      return NextResponse.json({
        dokumentId: null,
        hinweis: "Die Datei konnte ich gerade nicht ablegen. Probier es nochmal.",
      });
    }
  }

  /* --- Alles andere ---------------------------------------------------- */
  let angaben: {
    was?: "baustein-anlegen" | "baustein-loeschen" | "dokument-loeschen";
    id?: string;
    name?: string;
    textDe?: string;
    textEn?: string | null;
    kategorie?: string;
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
      case "baustein-anlegen": {
        if (!angaben.name?.trim() || !angaben.textDe?.trim()) {
          return NextResponse.json(
            { fehler: "Name und Text fehlen." },
            { status: 400 },
          );
        }

        const baustein = await bausteinAnlegen({
          nutzerId: nutzerin.id,
          name: angaben.name.trim(),
          textDe: angaben.textDe.trim(),
          textEn: angaben.textEn?.trim() || null,
          kategorie: angaben.kategorie ?? "standard",
        });

        return NextResponse.json({ baustein });
      }

      case "baustein-loeschen": {
        if (!angaben.id) {
          return NextResponse.json(
            { fehler: "Es fehlt der Baustein." },
            { status: 400 },
          );
        }
        await bausteinLoeschen(angaben.id);
        return NextResponse.json({ gespeichert: true });
      }

      case "dokument-loeschen": {
        if (!angaben.id) {
          return NextResponse.json(
            { fehler: "Es fehlt die Unterlage." },
            { status: 400 },
          );
        }
        await dokumentLoeschen(angaben.id);
        return NextResponse.json({ gespeichert: true });
      }

      default:
        return NextResponse.json(
          { fehler: "Unbekannter Vorgang." },
          { status: 400 },
        );
    }
  } catch (fehler) {
    console.error("[wissen] unerwartet:", fehler);
    return NextResponse.json(
      { fehler: "Das konnte ich gerade nicht speichern. Probier es nochmal." },
      { status: 200 },
    );
  }
}
