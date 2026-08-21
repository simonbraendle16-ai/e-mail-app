import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { anmeldungEingerichtet, oeffentlich } from "@/lib/umgebung";

/** Seiten, die ohne Anmeldung erreichbar sein müssen. */
const OFFEN = ["/anmelden", "/auth"];

/**
 * Läuft vor jeder Anfrage: erneuert die Sitzung und schickt Unangemeldete
 * zur Anmeldung. Sie klickt dadurch höchstens einmal im Monat einen Link.
 */
export async function sitzungErneuern(anfrage: NextRequest) {
  let antwort = NextResponse.next({ request: anfrage });

  // Ohne Zugangsdaten gibt es nichts zu erneuern. Die Anmeldeseite erklärt dann,
  // was fehlt, statt dass hier ein Fehler durchschlägt.
  if (!anmeldungEingerichtet()) return antwort;

  const zugang = createServerClient(
    oeffentlich.supabaseUrl,
    oeffentlich.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return anfrage.cookies.getAll();
        },
        setAll(neue) {
          for (const { name, value } of neue) {
            anfrage.cookies.set(name, value);
          }
          antwort = NextResponse.next({ request: anfrage });
          for (const { name, value, options } of neue) {
            antwort.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() prüft beim Server nach. getSession() würde dem Cookie glauben.
  const {
    data: { user },
  } = await zugang.auth.getUser();

  const pfad = anfrage.nextUrl.pathname;
  const istOffen = OFFEN.some((p) => pfad === p || pfad.startsWith(`${p}/`));

  if (!user && !istOffen) {
    const ziel = anfrage.nextUrl.clone();
    ziel.pathname = "/anmelden";
    ziel.search = "";
    return NextResponse.redirect(ziel);
  }

  if (user && pfad === "/anmelden") {
    const ziel = anfrage.nextUrl.clone();
    ziel.pathname = "/";
    ziel.search = "";
    return NextResponse.redirect(ziel);
  }

  return antwort;
}
