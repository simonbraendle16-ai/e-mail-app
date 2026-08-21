import "server-only";
import { serverZugang } from "@/lib/supabase/server";
import type { RegelArt, RegelHerkunft, RegelStatus } from "@/lib/db/typen";

/**
 * Die Stilregeln — das Herz der Korrekturschleife (`PLAN.md` §4).
 *
 * **„Abgelehntes kommt nicht wieder" ist die Kernzusage der App.** Daraus
 * folgen zwei Dinge, die hier festgeschrieben sind und nicht verhandelbar
 * sind:
 *
 * 1. Eine **ausdrücklich** gesetzte Regel ist sofort aktiv. Sie hat gesagt,
 *    was sie will — da gehört kein Rateschritt dazwischen.
 * 2. Eine **abgeleitete** Regel steht auf `vorgeschlagen` und wirkt nicht,
 *    bis sie bestätigt ist. Ableitung aus Textänderungen rät zwangsläufig;
 *    lernt die App still das Falsche, verschlechtert sie sich mit jedem Tag,
 *    und die Nutzerin versteht nicht, warum.
 */

export type Regel = {
  id: string;
  text: string;
  art: RegelArt;
  status: RegelStatus;
  herkunft: RegelHerkunft;
  /** `null` = gilt global. */
  kundeId: string | null;
  muster: string | null;
  /** Wie oft dasselbe Muster beobachtet wurde. */
  belege: number;
};

type Zeile = {
  id: string;
  regel: string;
  art: string;
  status: string;
  herkunft: string;
  kunde_id: string | null;
  muster: string | null;
  belege: number;
};

function lesbar(zeile: Zeile): Regel {
  return {
    id: zeile.id,
    text: zeile.regel,
    art: zeile.art as RegelArt,
    status: zeile.status as RegelStatus,
    herkunft: zeile.herkunft as RegelHerkunft,
    kundeId: zeile.kunde_id,
    muster: zeile.muster,
    belege: zeile.belege,
  };
}

const SPALTEN = "id, regel, art, status, herkunft, kunde_id, muster, belege";

/** Alle Regeln, für die Verwaltung. Ohne Filter, damit sie alles sieht. */
export async function regelnAlle(): Promise<Regel[]> {
  try {
    const zugang = await serverZugang();
    const { data } = await zugang
      .from("style_rules")
      .select(SPALTEN)
      .order("erstellt_am", { ascending: false });

    return (data ?? []).map((z) => lesbar(z as Zeile));
  } catch {
    return [];
  }
}

export type NeueRegel = {
  nutzerId: string;
  text: string;
  art?: RegelArt;
  /** `null` = gilt global, sonst nur für diesen Kunden. */
  kundeId?: string | null;
  muster?: string | null;
  herkunft?: RegelHerkunft;
};

/**
 * Legt eine Regel an, die sie ausdrücklich gesetzt hat — also **sofort
 * aktiv**.
 */
export async function regelAnlegen(angaben: NeueRegel): Promise<Regel | null> {
  const zugang = await serverZugang();

  const { data } = await zugang
    .from("style_rules")
    .insert({
      nutzer_id: angaben.nutzerId,
      kunde_id: angaben.kundeId ?? null,
      regel: angaben.text,
      art: angaben.art ?? "vermeiden",
      herkunft: angaben.herkunft ?? "ausdruecklich",
      status: "aktiv",
      muster: angaben.muster ?? null,
    })
    .select(SPALTEN)
    .single();

  return data ? lesbar(data as Zeile) : null;
}

/**
 * Legt eine abgeleitete Regel als **Vorschlag** ab — sie wirkt nicht.
 *
 * Wurde dasselbe schon einmal vorgeschlagen, wird nur der Beleg
 * hochgezählt. Ein Vorschlag erscheint erst ab zwei Beobachtungen; das ist
 * der Unterschied zwischen „sie hat es zufällig anders geschrieben" und
 * „sie schreibt es immer anders".
 */
export async function regelVorschlagen(angaben: NeueRegel): Promise<void> {
  try {
    const zugang = await serverZugang();

    const { data: vorhanden } = await zugang
      .from("style_rules")
      .select("id, belege")
      .eq("regel", angaben.text)
      .eq("status", "vorgeschlagen")
      .maybeSingle();

    if (vorhanden) {
      await zugang
        .from("style_rules")
        .update({ belege: (vorhanden.belege ?? 1) + 1 })
        .eq("id", vorhanden.id);
      return;
    }

    await zugang.from("style_rules").insert({
      nutzer_id: angaben.nutzerId,
      kunde_id: angaben.kundeId ?? null,
      regel: angaben.text,
      art: angaben.art ?? "vermeiden",
      herkunft: "abgeleitet",
      status: "vorgeschlagen",
      muster: angaben.muster ?? null,
    });
  } catch {
    /* Ein verlorener Vorschlag kostet nichts — beim nächsten Mal fällt
       dasselbe Muster wieder auf. */
  }
}

/**
 * Ihre Antwort auf einen Vorschlag.
 *
 * `abgelehnt` löscht die Regel **nicht**: Bliebe sie nur weg, würde dasselbe
 * Muster beim nächsten Mal erneut vorgeschlagen, und sie müsste dieselbe
 * Frage wieder beantworten. Ein Nein muss ein Nein bleiben.
 */
export async function regelEntscheiden(
  id: string,
  entscheidung: "aktiv" | "abgelehnt",
  kundeId?: string | null,
): Promise<void> {
  const zugang = await serverZugang();

  /* „Nur bei diesem Kunden" schränkt die Regel beim Bestätigen ein. */
  const grenzeAendern = entscheidung === "aktiv" && kundeId !== undefined;

  await zugang
    .from("style_rules")
    .update(
      grenzeAendern
        ? { status: entscheidung, kunde_id: kundeId ?? null }
        : { status: entscheidung },
    )
    .eq("id", id);
}

export async function regelLoeschen(id: string): Promise<void> {
  const zugang = await serverZugang();
  await zugang.from("style_rules").delete().eq("id", id);
}
