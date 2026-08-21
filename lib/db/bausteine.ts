import "server-only";
import { serverZugang } from "@/lib/supabase/server";

/**
 * Firmen-Standardformulierungen (`CLAUDE.md` §5.5): Signatur, feste
 * Einstiegssätze, rechtliche Hinweise.
 *
 * **Der einzige Teil der Wissensbasis, den jemand von Hand füllt.** Alles
 * andere wächst aus ihren Mails; Textbausteine können das nicht, weil sich
 * aus einer Mail nicht ablesen lässt, welcher Satz ein verbindlicher
 * Firmenstandard ist und welcher zufällig so dastand. Deshalb liefert der
 * User sie nach — es sind eine Handvoll, einmalig.
 */

export type Baustein = {
  id: string;
  name: string;
  textDe: string;
  textEn: string | null;
  kategorie: string;
};

type Zeile = {
  id: string;
  name: string;
  text_de: string;
  text_en: string | null;
  kategorie: string;
};

function lesbar(zeile: Zeile): Baustein {
  return {
    id: zeile.id,
    name: zeile.name,
    textDe: zeile.text_de,
    textEn: zeile.text_en,
    kategorie: zeile.kategorie,
  };
}

const SPALTEN = "id, name, text_de, text_en, kategorie";

export async function bausteineAlle(): Promise<Baustein[]> {
  try {
    const zugang = await serverZugang();
    const { data } = await zugang
      .from("boilerplates")
      .select(SPALTEN)
      .order("kategorie")
      .order("name");

    return (data ?? []).map((z) => lesbar(z as Zeile));
  } catch {
    return [];
  }
}

export async function bausteinAnlegen(angaben: {
  nutzerId: string;
  name: string;
  textDe: string;
  textEn?: string | null;
  kategorie?: string;
}): Promise<Baustein | null> {
  const zugang = await serverZugang();

  const { data } = await zugang
    .from("boilerplates")
    .insert({
      nutzer_id: angaben.nutzerId,
      name: angaben.name,
      text_de: angaben.textDe,
      text_en: angaben.textEn ?? null,
      kategorie: angaben.kategorie ?? "standard",
    })
    .select(SPALTEN)
    .single();

  return data ? lesbar(data as Zeile) : null;
}

export async function bausteinLoeschen(id: string): Promise<void> {
  const zugang = await serverZugang();
  await zugang.from("boilerplates").delete().eq("id", id);
}
