import "server-only";
import { serverZugang } from "@/lib/supabase/server";
import {
  entschluesselnWennMoeglich,
  suchwert,
  verschluesseln,
} from "@/lib/verschluesselung";
import type { Database, Kunde, KundeLesbar, Sprache } from "./typen";

type KundeAenderung = Database["public"]["Tables"]["customers"]["Update"];

/**
 * Zugriff auf die Kundenakte.
 *
 * Diese Datei ist die einzige Stelle, an der die verschlüsselten Spalten
 * vorkommen. Alles darüber arbeitet mit `KundeLesbar` und sieht nie einen
 * Geheimtext — damit kann auch niemand versehentlich einen Geheimtext in die
 * Oberfläche oder in einen Modellaufruf reichen.
 */

/** Macht aus einer Datenbankzeile das, was die Oberfläche sehen darf. */
export function lesbar(zeile: Kunde): KundeLesbar {
  const {
    anzeigename_geheim,
    anzeigename_such: _such1,
    firma_geheim,
    firma_such: _such2,
    ansprechpartner_geheim,
    ansprechpartner_such: _such3,
    ...rest
  } = zeile;

  return {
    ...rest,
    /* Schlägt das Entschlüsseln fehl, steht dort ein ehrlicher Platzhalter
       statt eines Absturzes. Das passiert nur, wenn der Schlüssel gewechselt
       oder verloren wurde — und dann soll sie die App trotzdem öffnen können. */
    anzeigename:
      entschluesselnWennMoeglich(anzeigename_geheim) ?? "(nicht lesbar)",
    firma: entschluesselnWennMoeglich(firma_geheim),
    ansprechpartner: entschluesselnWennMoeglich(ansprechpartner_geheim),
  };
}

export type KundeAngaben = {
  anzeigename: string;
  firma?: string | null;
  ansprechpartner?: string | null;
  sprache?: Sprache;
  land?: string | null;
  branche?: string | null;
  tonalitaet?: string | null;
  notizen?: string | null;
};

/**
 * Legt einen Kunden an. Verschlüsselt die drei personenbezogenen Felder und
 * legt daneben je einen Suchwert ab — ohne den wären sie nicht auffindbar.
 */
export async function kundeAnlegen(
  nutzerId: string,
  angaben: KundeAngaben,
): Promise<KundeLesbar> {
  const zugang = await serverZugang();

  const { data, error } = await zugang
    .from("customers")
    .insert({
      nutzer_id: nutzerId,
      anzeigename_geheim: verschluesseln(angaben.anzeigename),
      anzeigename_such: suchwert(angaben.anzeigename),
      firma_geheim: angaben.firma ? verschluesseln(angaben.firma) : null,
      firma_such: angaben.firma ? suchwert(angaben.firma) : null,
      ansprechpartner_geheim: angaben.ansprechpartner
        ? verschluesseln(angaben.ansprechpartner)
        : null,
      ansprechpartner_such: angaben.ansprechpartner
        ? suchwert(angaben.ansprechpartner)
        : null,
      sprache: angaben.sprache ?? "de",
      land: angaben.land ?? null,
      branche: angaben.branche ?? null,
      tonalitaet: angaben.tonalitaet ?? null,
      notizen: angaben.notizen ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return lesbar(data);
}

/**
 * Sucht einen Kunden über den exakten Namen.
 *
 * Der Haken, den das Kreuzverhör aufdeckte: Verschlüsselte Spalten sind nicht
 * durchsuchbar. Deshalb wird hier nicht der Name verglichen, sondern sein
 * Suchwert — die Datenbank sieht dabei weder Klartext noch Schlüssel.
 *
 * Was das nicht kann: Teiltreffer. „Meier" findet nicht „Meier & Co.".
 * Dafür ist `alleKunden` da, die im Server entschlüsselt und dann filtert.
 */
export async function kundeSuchen(name: string): Promise<KundeLesbar[]> {
  const zugang = await serverZugang();

  const { data, error } = await zugang.rpc("kunde_finden", {
    such_wert: suchwert(name),
  });

  if (error) throw error;
  return (data ?? []).map(lesbar);
}

/**
 * Alle Kunden, entschlüsselt und nach Namen sortiert.
 *
 * Sortiert wird nach dem Entschlüsseln im Server, nicht in der Datenbank —
 * über Geheimtext lässt sich nicht sinnvoll sortieren. Bei einer Nutzerin mit
 * einigen hundert Kunden ist das unproblematisch; sollte die Zahl je in die
 * Zehntausende gehen, braucht es hier Seitenweise-Abruf.
 */
export async function alleKunden(suchbegriff?: string): Promise<KundeLesbar[]> {
  const zugang = await serverZugang();

  const { data, error } = await zugang
    .from("customers")
    .select()
    .order("letzter_kontakt_am", { ascending: false, nullsFirst: false });

  if (error) throw error;

  let kunden = (data ?? []).map(lesbar);

  if (suchbegriff) {
    const suche = suchbegriff.trim().toLowerCase();
    kunden = kunden.filter(
      (k) =>
        k.anzeigename.toLowerCase().includes(suche) ||
        (k.firma?.toLowerCase().includes(suche) ?? false) ||
        (k.ansprechpartner?.toLowerCase().includes(suche) ?? false),
    );
  }

  return kunden.sort((a, b) =>
    a.anzeigename.localeCompare(b.anzeigename, "de"),
  );
}

/** Ein Kunde über seine Kennung. Null, wenn es ihn nicht gibt. */
export async function kundeLaden(id: string): Promise<KundeLesbar | null> {
  const zugang = await serverZugang();

  const { data, error } = await zugang
    .from("customers")
    .select()
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? lesbar(data) : null;
}

/**
 * Ändert einen Kunden. Wird eines der verschlüsselten Felder angefasst,
 * muss der zugehörige Suchwert mitwandern — sonst findet die Suche danach
 * noch den alten Namen.
 */
export async function kundeAendern(
  id: string,
  angaben: Partial<KundeAngaben>,
): Promise<KundeLesbar> {
  const zugang = await serverZugang();

  const aenderung: KundeAenderung = {};

  if (angaben.anzeigename !== undefined) {
    aenderung.anzeigename_geheim = verschluesseln(angaben.anzeigename);
    aenderung.anzeigename_such = suchwert(angaben.anzeigename);
  }
  if (angaben.firma !== undefined) {
    aenderung.firma_geheim = angaben.firma
      ? verschluesseln(angaben.firma)
      : null;
    aenderung.firma_such = angaben.firma ? suchwert(angaben.firma) : null;
  }
  if (angaben.ansprechpartner !== undefined) {
    aenderung.ansprechpartner_geheim = angaben.ansprechpartner
      ? verschluesseln(angaben.ansprechpartner)
      : null;
    aenderung.ansprechpartner_such = angaben.ansprechpartner
      ? suchwert(angaben.ansprechpartner)
      : null;
  }

  /* Sprache steht getrennt, weil sie als einziges dieser Felder in der
     Datenbank nicht leer sein darf. */
  if (angaben.sprache !== undefined) aenderung.sprache = angaben.sprache;

  for (const feld of ["land", "branche", "tonalitaet", "notizen"] as const) {
    const wert = angaben[feld];
    if (wert !== undefined) aenderung[feld] = wert;
  }

  const { data, error } = await zugang
    .from("customers")
    .update(aenderung)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return lesbar(data);
}

/**
 * Löscht einen Kunden mit allem, was daran hängt.
 * Die Fremdschlüssel räumen Fakten, Regeln und Abschnitte mit ab; Mails
 * bleiben stehen, verlieren aber ihren Kundenbezug.
 */
export async function kundeLoeschen(id: string): Promise<void> {
  const zugang = await serverZugang();
  const { error } = await zugang.from("customers").delete().eq("id", id);
  if (error) throw error;
}
