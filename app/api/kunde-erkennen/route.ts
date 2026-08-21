import { NextResponse, type NextRequest } from "next/server";
import { angemeldeteNutzerin } from "@/lib/supabase/server";
import { kundeErkennen } from "@/lib/verfassen/kundenerkennung";

/**
 * Erkennt beim Einfügen, von wem die Mail stammt (`DESIGN.md` §5).
 *
 * Läuft, sobald sie die Kundenmail eingefügt hat — nicht erst beim
 * Formulieren. Der Grund steht in `MODELL.md` §5: „Kunde nicht erkannt →
 * Nachfrage statt Rateversuch". Nachfragen kann man nur *vorher*; mitten im
 * Formulieren wäre es eine Unterbrechung.
 *
 * Kein Modellaufruf, also kostenlos und schnell genug, um beim Verlassen des
 * Feldes zu laufen.
 */
export async function POST(anfrage: NextRequest) {
  const nutzerin = await angemeldeteNutzerin();
  if (!nutzerin) {
    return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
  }

  let text: string;
  try {
    ({ text } = await anfrage.json());
  } catch {
    return NextResponse.json({ stand: "unbekannt" });
  }

  if (!text?.trim()) return NextResponse.json({ stand: "unbekannt" });

  try {
    const erkennung = await kundeErkennen(text);

    /* Nur das Nötige zurückgeben — die Kundenakte gehört nicht in eine
       Antwort, die bloß sagen soll, wer der Absender ist. */
    if (erkennung.stand === "erkannt") {
      return NextResponse.json({
        stand: "erkannt",
        kunde: {
          id: erkennung.kunde.id,
          name: erkennung.kunde.anzeigename,
          sprache: erkennung.kunde.sprache,
        },
        grund: erkennung.grund,
      });
    }

    if (erkennung.stand === "mehrdeutig") {
      return NextResponse.json({
        stand: "mehrdeutig",
        kandidaten: erkennung.kandidaten.map((k) => ({
          id: k.id,
          name: k.anzeigename,
          sprache: k.sprache,
        })),
      });
    }

    return NextResponse.json({ stand: "unbekannt" });
  } catch {
    /* Ein Fehler hier darf sie nicht aufhalten — sie schreibt dann ohne
       Kundenwissen weiter. */
    return NextResponse.json({ stand: "unbekannt" });
  }
}
