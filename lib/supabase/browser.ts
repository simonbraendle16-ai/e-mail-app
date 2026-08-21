import { createBrowserClient } from "@supabase/ssr";
import { oeffentlich } from "@/lib/umgebung";

/**
 * Supabase-Zugang für den Browser.
 * Verwendet ausschließlich den öffentlichen Schlüssel — jeder Zugriff läuft
 * durch Row-Level-Security. Der geheime Schlüssel kommt hier nie vor.
 */
export function browserZugang() {
  return createBrowserClient(
    oeffentlich.supabaseUrl,
    oeffentlich.supabasePublishableKey,
  );
}
