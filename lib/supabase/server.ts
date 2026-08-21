import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  anmeldungEingerichtet,
  nurServer,
  oeffentlich,
} from "@/lib/umgebung";

/**
 * Supabase-Zugang im Server (Server Components, Server Actions, Route Handler).
 * Arbeitet im Namen der angemeldeten Nutzerin, also weiterhin unter RLS.
 */
export async function serverZugang() {
  const kekse = await cookies();

  return createServerClient(
    oeffentlich.supabaseUrl,
    oeffentlich.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return kekse.getAll();
        },
        setAll(neue) {
          try {
            for (const { name, value, options } of neue) {
              kekse.set(name, value, options);
            }
          } catch {
            // In einer Server Component sind Cookies schreibgeschützt.
            // Die Middleware erneuert die Sitzung — hier ist das kein Fehler.
          }
        },
      },
    },
  );
}

/**
 * Zugang mit dem geheimen Schlüssel. Umgeht jede Zugriffsregel.
 *
 * Nur für Aufgaben, die es ohne angemeldete Nutzerin geben muss — etwa der
 * wöchentliche Weckruf gegen das Pausieren des Supabase-Projekts (Phase 2).
 * Niemals aus einer Route aufrufen, die auf Nutzereingaben reagiert.
 */
export function dienstZugang() {
  return createClient(oeffentlich.supabaseUrl, nurServer("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Die angemeldete Nutzerin — oder null. Immer serverseitig geprüft.
 * Solange die Zugangsdaten fehlen, gibt es niemanden: die Seite bleibt
 * benutzbar, statt mit einem Fehler abzubrechen.
 */
export async function angemeldeteNutzerin() {
  if (!anmeldungEingerichtet()) return null;
  try {
    const zugang = await serverZugang();
    const { data, error } = await zugang.auth.getUser();
    if (error) return null;
    return data.user;
  } catch {
    return null;
  }
}
