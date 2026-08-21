import type { NextRequest } from "next/server";
import { sitzungErneuern } from "@/lib/supabase/sitzung";

export async function middleware(anfrage: NextRequest) {
  return await sitzungErneuern(anfrage);
}

export const config = {
  matcher: [
    /* Alles außer statischen Dateien und Bildern. */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
