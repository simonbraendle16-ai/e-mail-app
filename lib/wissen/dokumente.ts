import "server-only";
import { serverZugang } from "@/lib/supabase/server";
import { indexieren } from "./abschnitte";
import { textErkennen } from "./ocr";

/**
 * Unterlagen: Angebote, Preislisten, Lieferscheine, Sortimentsdaten
 * (`CLAUDE.md` §5.5).
 *
 * Der Weg einer Datei: hochladen → ablegen → Text erkennen → indexieren.
 * Jeder Schritt kann für sich scheitern, ohne die vorigen mitzureißen — eine
 * abgelegte Unterlage ohne erkannten Text ist immer noch abgelegt.
 */

/** Supabase-Storage-Eimer. Privat; gelesen wird nur über signierte Adressen. */
const EIMER = "unterlagen";

/** Was OCR sinnvoll verarbeiten kann. */
const ERLAUBT = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

/** Über 20 MB wird es teuer und langsam, ohne dass es besser wird. */
const HOECHSTGROESSE = 20 * 1024 * 1024;

export type Dokumentart =
  | "angebot"
  | "preisliste"
  | "lieferschein"
  | "sortiment"
  | "sonstiges";

export type AblageErgebnis = {
  dokumentId: string | null;
  /** Was sie liest. Leer, wenn alles glattging. */
  hinweis: string | null;
};

export async function dokumentAblegen(angaben: {
  nutzerId: string;
  datei: File;
  titel: string;
  art?: Dokumentart;
  kundeId?: string | null;
  abbruch?: AbortSignal;
}): Promise<AblageErgebnis> {
  const { datei } = angaben;

  if (!ERLAUBT.includes(datei.type)) {
    return {
      dokumentId: null,
      hinweis: "Ich kann PDFs und Bilder lesen. Anderes leider nicht.",
    };
  }

  if (datei.size > HOECHSTGROESSE) {
    return {
      dokumentId: null,
      hinweis: "Die Datei ist zu groß. Bis 20 MB geht es.",
    };
  }

  const zugang = await serverZugang();

  /* Der Pfad beginnt mit der Nutzerkennung — die Storage-Regel hängt daran.
     Ohne diesen Präfix läge die Datei zwar in einem privaten Eimer, aber
     die Trennung zwischen Nutzern wäre nicht durchgesetzt. */
  const endung = datei.name.split(".").pop() ?? "bin";
  const pfad = `${angaben.nutzerId}/${crypto.randomUUID()}.${endung}`;

  const { error: ablageFehler } = await zugang.storage
    .from(EIMER)
    .upload(pfad, datei, { contentType: datei.type, upsert: false });

  if (ablageFehler) {
    return {
      dokumentId: null,
      hinweis: "Die Datei konnte ich gerade nicht ablegen. Probier es nochmal.",
    };
  }

  const { data: zeile } = await zugang
    .from("documents")
    .insert({
      nutzer_id: angaben.nutzerId,
      kunde_id: angaben.kundeId ?? null,
      titel: angaben.titel || datei.name,
      art: angaben.art ?? "sonstiges",
      ablage_pfad: pfad,
    })
    .select("id")
    .single();

  const dokumentId = zeile?.id ?? null;
  if (!dokumentId) {
    return {
      dokumentId: null,
      hinweis: "Die Datei liegt jetzt da, ich konnte sie aber nicht eintragen.",
    };
  }

  /* --- Text erkennen ------------------------------------------------- */
  /* Eine kurzlebige signierte Adresse: Mistral muss die Datei abrufen
     können, aber niemand sonst und nicht dauerhaft. Der Eimer bleibt
     privat. */
  const { data: adresse } = await zugang.storage
    .from(EIMER)
    .createSignedUrl(pfad, 600);

  if (!adresse?.signedUrl) {
    return {
      dokumentId,
      hinweis:
        "Die Unterlage ist abgelegt. Den Text daraus konnte ich nicht lesen.",
    };
  }

  const erkennung = await textErkennen({
    dateiAdresse: adresse.signedUrl,
    abbruch: angaben.abbruch,
  });

  if (!erkennung.erkannt) {
    return { dokumentId, hinweis: erkennung.grund };
  }

  await zugang
    .from("documents")
    .update({
      erkannter_text: erkennung.text,
      verarbeitet_am: new Date().toISOString(),
    })
    .eq("id", dokumentId);

  await indexieren({
    nutzerId: angaben.nutzerId,
    quelleArt: "dokument",
    quelleId: dokumentId,
    text: erkennung.text,
    kundeId: angaben.kundeId,
    abbruch: angaben.abbruch,
  });

  return { dokumentId, hinweis: null };
}

export type Unterlage = {
  id: string;
  titel: string;
  art: string;
  /** Ob der Text gelesen werden konnte — sonst taucht sie nicht in der Suche auf. */
  lesbar: boolean;
};

export async function unterlagenAlle(): Promise<Unterlage[]> {
  try {
    const zugang = await serverZugang();
    const { data } = await zugang
      .from("documents")
      .select("id, titel, art, verarbeitet_am")
      .order("erstellt_am", { ascending: false });

    return (data ?? []).map((z) => ({
      id: z.id,
      titel: z.titel,
      art: z.art,
      lesbar: Boolean(z.verarbeitet_am),
    }));
  } catch {
    return [];
  }
}

/** Löscht Eintrag, Datei und die Abschnitte im Index. */
export async function dokumentLoeschen(id: string): Promise<void> {
  const zugang = await serverZugang();

  const { data: zeile } = await zugang
    .from("documents")
    .select("ablage_pfad")
    .eq("id", id)
    .maybeSingle();

  await zugang.from("chunks").delete().eq("quelle_art", "dokument").eq("quelle_id", id);
  await zugang.from("documents").delete().eq("id", id);

  if (zeile?.ablage_pfad) {
    /* Zuletzt: Bleibt eine Datei liegen, ist das ein Schönheitsfehler.
       Bliebe umgekehrt ein Eintrag ohne Datei stehen, zeigte die Liste
       eine Unterlage, die es nicht mehr gibt. */
    await zugang.storage.from(EIMER).remove([zeile.ablage_pfad]);
  }
}
