"use server";

import { serverZugang } from "@/lib/supabase/server";
import { anmeldungEingerichtet } from "@/lib/umgebung";
import { headers } from "next/headers";

export type AnmeldeErgebnis =
  | { stand: "leer" }
  | { stand: "geschickt"; adresse: string }
  /* `adresse` wird auch im Fehlerfall zurückgegeben: Ihre Eingabe bleibt im
     Feld stehen, damit sie korrigieren statt neu tippen kann. Kein Ausfall
     darf sie Tipparbeit kosten (MODELL.md §5). */
  | { stand: "fehler"; text: string; adresse: string };

/**
 * Schickt ihr einen Anmeldelink per Mail. Kein Passwort, das sie sich merken
 * oder zurücksetzen muss — sie klickt einmal im Monat einen Link (PLAN.md §1).
 *
 * Fehlermeldungen sind deutsch und sagen, was zu tun ist. Keine Codes,
 * kein Englisch, keine Stacktraces (DESIGN.md §7).
 */
export async function linkAnfordern(
  _bisher: AnmeldeErgebnis,
  formular: FormData,
): Promise<AnmeldeErgebnis> {
  const adresse = String(formular.get("adresse") ?? "").trim();

  const fehler = (text: string): AnmeldeErgebnis => ({
    stand: "fehler",
    text,
    adresse,
  });

  if (!adresse) {
    return fehler("Trag bitte deine E-Mail-Adresse ein.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse)) {
    return fehler(
      "Das sieht noch nicht nach einer E-Mail-Adresse aus. Schau bitte nochmal drüber.",
    );
  }
  if (!anmeldungEingerichtet()) {
    return fehler(
      "Die App ist noch nicht mit der Datenbank verbunden. Das muss einmalig eingerichtet werden.",
    );
  }

  try {
    const zugang = await serverZugang();
    const kopf = await headers();
    const protokoll = kopf.get("x-forwarded-proto") ?? "https";
    const host = kopf.get("x-forwarded-host") ?? kopf.get("host");
    const anwendungsAdresse = host ? `${protokoll}://${host}` : undefined;
    const { error } = await zugang.auth.signInWithOtp({
      email: adresse,
      options: {
        emailRedirectTo: anwendungsAdresse
          ? `${anwendungsAdresse}/auth/bestaetigen`
          : undefined,
      },
    });

    if (error) {
      return fehler(
        "Der Link ließ sich gerade nicht verschicken. Probier es in einer Minute nochmal.",
      );
    }

    return { stand: "geschickt", adresse };
  } catch {
    return fehler(
      "Die Verbindung klemmt gerade. Probier es in einer Minute nochmal.",
    );
  }
}
