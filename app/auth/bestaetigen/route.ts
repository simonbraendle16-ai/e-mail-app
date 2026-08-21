import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { serverZugang } from "@/lib/supabase/server";

/**
 * Hier landet sie, nachdem sie den Link in ihrer Mail angeklickt hat.
 * Der Link wird gegen eine Sitzung eingetauscht, dann geht es zur Startseite.
 *
 * Klappt es nicht (Link abgelaufen, schon benutzt), geht es zurück zur
 * Anmeldung mit einem Satz, der sagt, was zu tun ist — nie mit einem Fehlercode.
 */
export async function GET(anfrage: NextRequest) {
  const parameter = anfrage.nextUrl.searchParams;
  const tokenHash = parameter.get("token_hash");
  const typ = parameter.get("type") as EmailOtpType | null;

  const zurueckZurAnmeldung = (grund: string) => {
    const ziel = anfrage.nextUrl.clone();
    ziel.pathname = "/anmelden";
    ziel.search = `?hinweis=${encodeURIComponent(grund)}`;
    return NextResponse.redirect(ziel);
  };

  if (!tokenHash || !typ) {
    return zurueckZurAnmeldung("link-unvollstaendig");
  }

  const zugang = await serverZugang();
  const { error } = await zugang.auth.verifyOtp({
    type: typ,
    token_hash: tokenHash,
  });

  if (error) {
    return zurueckZurAnmeldung("link-abgelaufen");
  }

  const ziel = anfrage.nextUrl.clone();
  ziel.pathname = "/";
  ziel.search = "";
  return NextResponse.redirect(ziel);
}
