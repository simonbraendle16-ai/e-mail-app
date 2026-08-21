import "server-only";
import { serverZugang } from "@/lib/supabase/server";
import type { Verbrauch, Zweck } from "./schnittstelle";

/**
 * Kostenprotokoll (`MODELL.md` §7).
 *
 * Jeder Aufruf wird mit Modell, Zweck, Token und geschätzten Kosten
 * festgehalten. Daraus speist sich die Monatsanzeige und die Warnschwelle.
 *
 * **Ein Fehler beim Protokollieren darf nie den Aufruf scheitern lassen.**
 * Wenn sie eine Mail geschrieben hat und die Datenbank hakt, ist die Mail das
 * Wichtige — nicht die Buchungszeile. Deshalb schluckt `protokollieren`
 * Fehler und meldet sie nur ins Serverprotokoll.
 */

export async function protokollieren(
  nutzerId: string,
  zweck: Zweck,
  verbrauch: Verbrauch,
): Promise<void> {
  try {
    const zugang = await serverZugang();
    await zugang.from("usage_log").insert({
      nutzer_id: nutzerId,
      modell: verbrauch.modell,
      zweck,
      token_ein: verbrauch.tokenEin,
      token_aus: verbrauch.tokenAus,
      kosten_eur: verbrauch.kostenEur,
    });
  } catch (fehler) {
    console.error("[kosten] konnte nicht protokolliert werden:", fehler);
  }
}

export type Monatsuebersicht = {
  kostenEur: number;
  aufrufe: number;
  tokenEin: number;
  tokenAus: number;
  /** Wie viel Prozent der Warnschwelle verbraucht sind. */
  anteilSchwelle: number;
  schwelleEur: number;
  ueberSchwelle: boolean;
};

/** Vorgabe 25 € (`MODELL.md` §7), über die Umgebung anpassbar. */
export function warnschwelle(): number {
  const wert = Number(process.env.KOSTEN_WARNSCHWELLE_EUR);
  return Number.isFinite(wert) && wert > 0 ? wert : 25;
}

/**
 * Was der laufende Monat bisher gekostet hat.
 *
 * Gerechnet wird ab dem Ersten des Monats in ihrer Zeitzone, nicht über die
 * letzten 30 Tage — eine Rechnung läuft nach Kalendermonat, und eine Anzeige,
 * die anders zählt als die Rechnung, verwirrt mehr als sie hilft.
 */
export async function monatsuebersicht(): Promise<Monatsuebersicht> {
  const zugang = await serverZugang();

  const jetzt = new Date();
  const monatsbeginn = new Date(
    Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth(), 1),
  );

  const { data, error } = await zugang
    .from("usage_log")
    .select("kosten_eur, token_ein, token_aus")
    .gte("erstellt_am", monatsbeginn.toISOString());

  if (error) throw error;

  const zeilen = data ?? [];
  const kostenEur = zeilen.reduce((summe, z) => summe + Number(z.kosten_eur), 0);
  const schwelleEur = warnschwelle();

  return {
    kostenEur,
    aufrufe: zeilen.length,
    tokenEin: zeilen.reduce((s, z) => s + z.token_ein, 0),
    tokenAus: zeilen.reduce((s, z) => s + z.token_aus, 0),
    anteilSchwelle: schwelleEur > 0 ? kostenEur / schwelleEur : 0,
    schwelleEur,
    ueberSchwelle: kostenEur > schwelleEur,
  };
}
