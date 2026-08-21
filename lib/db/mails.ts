import "server-only";
import { serverZugang } from "@/lib/supabase/server";
import type { Mail } from "./typen";

/**
 * Zugriff auf Mails.
 *
 * Mails tragen keine verschlüsselten Felder — der Mailtext selbst liegt im
 * Klartext, weil er sonst weder durchsuchbar noch für das Modell brauchbar
 * wäre. Der Schutz sitzt hier woanders: Row-Level-Security, Pseudonymisierung
 * vor dem Modellaufruf, und die 100-Tage-Verdichtung.
 */

/**
 * Löscht eine Mail samt allem, was daran hängt.
 *
 * In der Validierung als Lücke aufgefallen: `PLAN.md` §2 verlangt Löschen
 * „kaskadierend inklusive Chunks", die Kaskade fehlte aber. Ohne sie wäre die
 * Mail aus der Liste verschwunden und ihr Text weiter im Gedächtnis der App —
 * sie wäre also weiter an Mistral gegangen. Die Abschnitte räumt jetzt ein
 * Trigger ab (Migration 0008); er greift auch dann, wenn jemand direkt in der
 * Datenbank löscht.
 *
 * Gibt `false` zurück, wenn es die Mail nicht gibt — das ist kein Fehler,
 * sondern der Normalfall bei einem doppelten Klick.
 */
export async function mailLoeschen(id: string): Promise<boolean> {
  const zugang = await serverZugang();

  /* Schlichtes DELETE statt der Datenbankfunktion `mail_loeschen`: Das
     Aufräumen hängt an Triggern, nicht am Aufrufweg — es greift also genauso.
     Und dieser Weg ist typisiert, während ein RPC-Aufruf erst nach dem
     nächsten Erzeugen der Typen bekannt wäre. */
  const { count, error } = await zugang
    .from("emails")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Die letzten Mails, neueste zuerst. */
export async function letzteMails(anzahl = 5): Promise<Mail[]> {
  const zugang = await serverZugang();
  const { data, error } = await zugang
    .from("emails")
    .select()
    .order("erstellt_am", { ascending: false })
    .limit(anzahl);

  if (error) throw error;
  return data ?? [];
}

/**
 * Die letzten Mails an einen bestimmten Kunden — für die Kundenakte.
 *
 * Ein Ausfall gibt eine leere Liste zurück statt zu werfen: Die Akte ist
 * Angebot, nicht Aufgabe, und soll sich auch dann öffnen lassen, wenn ein
 * Teil davon gerade nicht erreichbar ist.
 */
export async function mailsZumKunden(
  kundeId: string,
  anzahl = 5,
): Promise<Mail[]> {
  try {
    const zugang = await serverZugang();
    const { data } = await zugang
      .from("emails")
      .select()
      .eq("kunde_id", kundeId)
      .order("erstellt_am", { ascending: false })
      .limit(anzahl);

    return data ?? [];
  } catch {
    return [];
  }
}

/** Eine Mail über ihre Kennung. Null, wenn es sie nicht gibt. */
export async function mailLaden(id: string): Promise<Mail | null> {
  const zugang = await serverZugang();
  const { data, error } = await zugang
    .from("emails")
    .select()
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}
