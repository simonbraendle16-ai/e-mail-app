"use server";
import { serverZugang } from "@/lib/supabase/server";
import { anmeldungEingerichtet } from "@/lib/umgebung";

export type AnmeldeErgebnis = { stand: "leer" } | { stand: "angemeldet" } | { stand: "fehler"; text: string; name: string };

function technischeAdresse(name: string) {
  const schluessel = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${schluessel}@login.invalid`;
}

export async function anmelden(_bisher: AnmeldeErgebnis, formular: FormData): Promise<AnmeldeErgebnis> {
  const name = String(formular.get("name") ?? "").trim();
  const passwort = String(formular.get("passwort") ?? "");
  const fehler = (text: string): AnmeldeErgebnis => ({ stand: "fehler", text, name });
  if (!name) return fehler("Trag bitte deinen Namen ein.");
  if (name.length < 2) return fehler("Der Name muss mindestens zwei Zeichen haben.");
  if (passwort.length < 8) return fehler("Das Passwort muss mindestens 8 Zeichen haben.");
  if (!anmeldungEingerichtet()) return fehler("Die App ist noch nicht mit der Datenbank verbunden. Das muss einmalig eingerichtet werden.");
  const modus = String(formular.get("modus") ?? "anmelden");
  try {
    const zugang = await serverZugang();
    const email = technischeAdresse(name);
    if (modus === "neu") {
      const neu = await zugang.auth.signUp({ email, password: passwort, options: { data: { name } } });
      if (neu.error) {
        if (neu.error.message.toLowerCase().includes("already registered")) return fehler("Für diesen Namen gibt es schon ein Konto. Wähle bitte ‚Anmelden‘.");
        return fehler("Das neue Konto konnte nicht angelegt werden. Prüfe bitte deine Eingaben.");
      }
      if (!neu.data.session) return fehler("Das Konto wurde angelegt, aber die Anmeldung ist noch nicht freigeschaltet. Bitte prüfe die Supabase-Einstellung ‚Confirm email‘.");
    } else {
      const login = await zugang.auth.signInWithPassword({ email, password: passwort });
      if (login.error) return fehler("Name oder Passwort stimmt nicht.");
    }
    return { stand: "angemeldet" };
  } catch { return fehler("Die Verbindung klemmt gerade. Probier es in einer Minute nochmal."); }
}
