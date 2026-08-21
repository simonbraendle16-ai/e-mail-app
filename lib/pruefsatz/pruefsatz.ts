import "server-only";
import { serverZugang } from "@/lib/supabase/server";

/**
 * Der Prüfsatz (`MODELL.md` §6, Stufe 2).
 *
 * **Er muss nicht beschafft werden — er wächst von selbst.** Jede mit Daumen
 * hoch bewertete Mail wird zum Referenzbeispiel: Ausgangslage, Stichworte,
 * akzeptiertes Ergebnis. Nach ein paar Wochen liegen zwanzig bis dreißig
 * echte Fälle vor, ohne dass irgendjemand Material zusammensuchen musste.
 *
 * Das ist die einzige Datenquelle für Qualitätsmessung, die dieses Projekt je
 * bekommen wird — es gibt keinen Mailexport und keine Altdaten.
 */

export type Pruefall = {
  mailId: string;
  kundeId: string | null;
  eingehenderText: string | null;
  stichworte: string;
  /** Was sie damals akzeptiert hat. Der Maßstab, nicht die Vorgabe. */
  akzeptiert: string;
  skill: string | null;
};

/**
 * Die gesammelten Fälle.
 *
 * **Nur Daumen hoch.** Eine schlecht bewertete Mail taugt nicht als Maßstab —
 * sie sagt, was nicht gepasst hat, aber nicht, was gepasst hätte.
 */
export async function pruefaelleLaden(hoechstens = 40): Promise<Pruefall[]> {
  try {
    const zugang = await serverZugang();
    const { data } = await zugang
      .from("emails")
      .select(
        "id, kunde_id, eingehender_text, ihre_stichworte, text_de, skill",
      )
      .eq("bewertung", 1)
      .not("text_de", "is", null)
      .order("erstellt_am", { ascending: false })
      .limit(hoechstens);

    return (data ?? [])
      .filter((z) => z.text_de && z.ihre_stichworte)
      .map((z) => ({
        mailId: z.id,
        kundeId: z.kunde_id,
        eingehenderText: z.eingehender_text,
        stichworte: z.ihre_stichworte!,
        akzeptiert: z.text_de!,
        skill: z.skill,
      }));
  } catch {
    return [];
  }
}
