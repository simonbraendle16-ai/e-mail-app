/**
 * Zugriff auf die Umgebungsvariablen — an einer Stelle, mit ehrlichen Meldungen.
 *
 * Zwei Regeln, die hier durchgesetzt werden:
 *  - Der geheime Schlüssel (`SUPABASE_SECRET_KEY`) darf den Server nie verlassen.
 *    Er wird ausschließlich über `nurServer()` gelesen, und das wirft im Browser.
 *  - Fehlt etwas, gibt es keinen Stacktrace, sondern einen Satz, der sagt,
 *    was zu tun ist (MODELL.md §5, DESIGN.md §7).
 */

export type FehlendeAngabe = {
  name: string;
  zweck: string;
};

/** Werte, die der Browser sehen darf — geschützt durch Row-Level-Security. */
export const oeffentlich = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
} as const;

/** Was noch fehlt, damit die Anmeldung funktioniert. Leeres Array = alles da. */
export function fehltFuerAnmeldung(): FehlendeAngabe[] {
  const fehlt: FehlendeAngabe[] = [];
  if (!oeffentlich.supabaseUrl) {
    fehlt.push({
      name: "NEXT_PUBLIC_SUPABASE_URL",
      zweck: "Adresse der Datenbank in Frankfurt",
    });
  }
  if (!oeffentlich.supabasePublishableKey) {
    fehlt.push({
      name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      zweck: "Schlüssel für den Browser (durch RLS geschützt)",
    });
  }
  return fehlt;
}

export function anmeldungEingerichtet(): boolean {
  return fehltFuerAnmeldung().length === 0;
}

/**
 * Liest eine Variable, die ausschließlich serverseitig existieren darf.
 * Der Aufruf im Browser ist ein Programmierfehler und wird laut.
 */
export function nurServer(name: string): string {
  if (typeof window !== "undefined") {
    throw new Error(
      `${name} ist ein Servergeheimnis und darf im Browser nicht gelesen werden.`,
    );
  }
  const wert = process.env[name];
  if (!wert) {
    throw new Error(
      `${name} fehlt. Trage den Wert in .env.local ein — siehe SUPABASE-SETUP.md.`,
    );
  }
  return wert;
}

/**
 * Die Adresse, unter der die App gerade läuft. Wird für den Magic-Link
 * gebraucht: Supabase schickt die Nutzerin nach dem Klick genau hierher zurück.
 */
export function eigeneAdresse(): string {
  const explizit = process.env.NEXT_PUBLIC_APP_URL;
  if (explizit) return explizit.replace(/\/$/, "");
  return "http://localhost:3000";
}
