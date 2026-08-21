import type { NextRequest } from "next/server";
import { sitzungErneuern } from "@/lib/supabase/sitzung";

/**
 * Warum hier weiterhin `middleware` steht und nicht `proxy`:
 *
 * Next.js 16 hat die Datei zu `proxy.ts` umbenannt und meldet das beim Bauen
 * als veraltet. `proxy` läuft aber ausschließlich in der Node.js-Laufzeit, und
 * genau die unterstützt Cloudflare Workers für diesen Zweck noch nicht.
 * `middleware` läuft in der Edge-Laufzeit und funktioniert dort.
 *
 * Die Warnung beim Bauen ist also bekannt und gewollt. Sobald Cloudflare
 * Node.js an dieser Stelle unterstützt, wird umbenannt — es ist ein Zweizeiler.
 */

export async function middleware(anfrage: NextRequest) {
  return await sitzungErneuern(anfrage);
}

export const config = {
  matcher: [
    /* Alles außer statischen Dateien und Bildern. */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
