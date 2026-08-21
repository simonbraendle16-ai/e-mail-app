import "server-only";
import { serverZugang } from "@/lib/supabase/server";
import type { FaktKategorie } from "@/lib/db/typen";

/**
 * Was die App über einen Kunden weiß (`CLAUDE.md` §5.4).
 *
 * > „Über Zeit ist für jeden Kunden so viel Kontext da, dass das Modell weiß,
 * > was der Kunde möchte — und dann viel besser und personalisierter helfen
 * > kann."
 *
 * **Sie pflegt nichts.** Die Fakten entstehen nebenbei aus den Mails, die sie
 * ohnehin schreibt. Das ist der Grund, warum die Kundenakte im Alltag
 * überhaupt Bestand haben kann: Alles, was Pflegearbeit wäre, bliebe liegen —
 * „kein zusätzlicher Klotz an ihrem Bein" ist der Leitsatz des Projekts.
 */

export type Fakt = {
  id: string;
  text: string;
  kategorie: FaktKategorie;
  /**
   * Von ihr bestätigt. Unbestätigte Fakten wirken mit geringerem Gewicht —
   * sie stammen aus einer Ableitung und können danebenliegen.
   */
  bestaetigt: boolean;
  quelleMailId: string | null;
};

type Zeile = {
  id: string;
  fakt: string;
  kategorie: string;
  bestaetigt: boolean;
  quelle_mail_id: string | null;
};

function lesbar(zeile: Zeile): Fakt {
  return {
    id: zeile.id,
    text: zeile.fakt,
    kategorie: zeile.kategorie as FaktKategorie,
    bestaetigt: zeile.bestaetigt,
    quelleMailId: zeile.quelle_mail_id,
  };
}

const SPALTEN = "id, fakt, kategorie, bestaetigt, quelle_mail_id";

export async function faktenZumKunden(kundeId: string): Promise<Fakt[]> {
  try {
    const zugang = await serverZugang();
    const { data } = await zugang
      .from("customer_facts")
      .select(SPALTEN)
      .eq("kunde_id", kundeId)
      .order("erstellt_am", { ascending: false });

    return (data ?? []).map((z) => lesbar(z as Zeile));
  } catch {
    return [];
  }
}

/**
 * Legt einen abgeleiteten Fakt ab — **unbestätigt**.
 *
 * Ein still übernommener falscher Fakt („der Kunde will keine Musterlieferung")
 * steckt danach in jeder Mail an diesen Kunden, und sie hätte keine
 * Möglichkeit zu verstehen, woher das kommt. Deshalb dieselbe Regel wie bei
 * den Stilregeln: ableiten ja, stillschweigend für wahr halten nie.
 */
export async function faktAblegen(angaben: {
  nutzerId: string;
  kundeId: string;
  text: string;
  kategorie?: FaktKategorie;
  quelleMailId?: string | null;
}): Promise<void> {
  try {
    const zugang = await serverZugang();

    /* Denselben Fakt nicht zweimal. Eine Akte, in der dreimal dasselbe
       steht, kostet Kontextplatz und liest sich wie ein Fehler. */
    const { data: vorhanden } = await zugang
      .from("customer_facts")
      .select("id")
      .eq("kunde_id", angaben.kundeId)
      .eq("fakt", angaben.text)
      .maybeSingle();

    if (vorhanden) return;

    await zugang.from("customer_facts").insert({
      nutzer_id: angaben.nutzerId,
      kunde_id: angaben.kundeId,
      fakt: angaben.text,
      kategorie: angaben.kategorie ?? "history",
      quelle_mail_id: angaben.quelleMailId ?? null,
      bestaetigt: false,
    });
  } catch {
    /* Ein verlorener Fakt kostet nichts — er fällt beim nächsten Mal
       wieder auf. */
  }
}

export async function faktBestaetigen(id: string): Promise<void> {
  const zugang = await serverZugang();
  await zugang
    .from("customer_facts")
    .update({ bestaetigt: true, sicherheit: 1 })
    .eq("id", id);
}

export async function faktLoeschen(id: string): Promise<void> {
  const zugang = await serverZugang();
  await zugang.from("customer_facts").delete().eq("id", id);
}
