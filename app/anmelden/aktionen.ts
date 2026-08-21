"use server";

import { serverZugang } from "@/lib/supabase/server";
import { anmeldungEingerichtet, eigeneAdresse } from "@/lib/umgebung";

export type AnmeldeErgebnis =
  | { stand: "leer" }
  | { stand: "geschickt"; adresse: string }
  | { stand: "fehler"; text: string };

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

  if (!adresse) {
    return { stand: "fehler", text: "Trag bitte deine E-Mail-Adresse ein." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse)) {
    return {
      stand: "fehler",
      text: "Das sieht noch nicht nach einer E-Mail-Adresse aus. Schau bitte nochmal drüber.",
    };
  }
  if (!anmeldungEingerichtet()) {
    return {
      stand: "fehler",
      text: "Die App ist noch nicht mit der Datenbank verbunden. Das muss einmalig eingerichtet werden.",
    };
  }

  try {
    const zugang = await serverZugang();
    const { error } = await zugang.auth.signInWithOtp({
      email: adresse,
      options: {
        emailRedirectTo: `${eigeneAdresse()}/auth/bestaetigen`,
      },
    });

    if (error) {
      return {
        stand: "fehler",
        text: "Der Link ließ sich gerade nicht verschicken. Probier es in einer Minute nochmal.",
      };
    }

    return { stand: "geschickt", adresse };
  } catch {
    return {
      stand: "fehler",
      text: "Die Verbindung klemmt gerade. Probier es in einer Minute nochmal.",
    };
  }
}
