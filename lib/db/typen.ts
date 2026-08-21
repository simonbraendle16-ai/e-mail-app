/**
 * Handliche Namen für die erzeugten Datenbanktypen.
 *
 * Die Wahrheit steht in `typen.gen.ts` und spiegelt das tatsächliche Schema.
 * Diese Datei gibt den Tabellen nur deutsche Namen, damit der übrige Code
 * `Kunde` schreiben kann statt
 * `Database["public"]["Tables"]["customers"]["Row"]`.
 *
 * **Neu erzeugen nach jeder Migration.** Zwei Wege:
 *
 *   1. Über die Supabase-Oberfläche: Project Settings → API → „Generate types"
 *   2. Mit der CLI, wenn Docker läuft:
 *      npx supabase gen types typescript --project-id zhsauoafsvhupalhnuau
 *
 * Das Ergebnis ersetzt `typen.gen.ts` vollständig. Nichts von Hand nachtragen —
 * sonst laufen Typen und Datenbank auseinander und der Compiler merkt es nicht.
 */

import type { Database } from "./typen.gen";

export type { Database, Json } from "./typen.gen";

type Tabellen = Database["public"]["Tables"];

/* --- Zeilen, wie sie aus der Datenbank kommen ---------------------------- */

export type Kunde = Tabellen["customers"]["Row"];
export type Kundenfakt = Tabellen["customer_facts"]["Row"];
export type Mail = Tabellen["emails"]["Row"];
export type Mailfassung = Tabellen["email_versions"]["Row"];
export type Stilregel = Tabellen["style_rules"]["Row"];
export type Glossareintrag = Tabellen["glossary"]["Row"];
export type Textbaustein = Tabellen["boilerplates"]["Row"];
export type Dokument = Tabellen["documents"]["Row"];
export type Abschnitt = Tabellen["chunks"]["Row"];
export type Kostenzeile = Tabellen["usage_log"]["Row"];

/* --- Zeilen, wie man sie einfügt ----------------------------------------- */

export type NeuerKunde = Tabellen["customers"]["Insert"];
export type NeuerKundenfakt = Tabellen["customer_facts"]["Insert"];
export type NeueMail = Tabellen["emails"]["Insert"];
export type NeueMailfassung = Tabellen["email_versions"]["Insert"];
export type NeueStilregel = Tabellen["style_rules"]["Insert"];
export type NeuerGlossareintrag = Tabellen["glossary"]["Insert"];
export type NeuerTextbaustein = Tabellen["boilerplates"]["Insert"];
export type NeuesDokument = Tabellen["documents"]["Insert"];
export type NeuerAbschnitt = Tabellen["chunks"]["Insert"];
export type NeueKostenzeile = Tabellen["usage_log"]["Insert"];

/* --- Werte, die in der Datenbank als CHECK-Bedingung stehen --------------
   Postgres-CHECK erzeugt keinen TypeScript-Aufzählungstyp. Diese Listen
   bilden ihn nach, damit ein Tippfehler beim Bauen auffällt und nicht erst
   als Datenbankfehler im Betrieb. Ändert sich eine CHECK-Bedingung, muss
   die zugehörige Liste hier mitgeändert werden. */

export const SPRACHEN = ["de", "en"] as const;
export type Sprache = (typeof SPRACHEN)[number];

export const MAIL_STATUS = ["entwurf", "verwendet", "verworfen"] as const;
export type MailStatus = (typeof MAIL_STATUS)[number];

export const FAKT_KATEGORIEN = [
  "preference",
  "history",
  "product",
  "condition",
  "person",
] as const;
export type FaktKategorie = (typeof FAKT_KATEGORIEN)[number];

export const REGEL_ARTEN = [
  "vermeiden",
  "bevorzugen",
  "ton",
  "aufbau",
] as const;
export type RegelArt = (typeof REGEL_ARTEN)[number];

export const REGEL_STATUS = ["aktiv", "vorgeschlagen", "abgelehnt"] as const;
export type RegelStatus = (typeof REGEL_STATUS)[number];

export const REGEL_HERKUNFT = ["ausdruecklich", "abgeleitet"] as const;
export type RegelHerkunft = (typeof REGEL_HERKUNFT)[number];

export const FASSUNG_AUSLOESER = [
  "erste",
  "anweisung",
  "eigene_bearbeitung",
] as const;
export type FassungAusloeser = (typeof FASSUNG_AUSLOESER)[number];

export const GLOSSAR_BEREICHE = [
  "kaese",
  "export",
  "qualitaet",
  "allgemein",
] as const;
export type GlossarBereich = (typeof GLOSSAR_BEREICHE)[number];

export const BAUSTEIN_KATEGORIEN = [
  "signatur",
  "anrede",
  "abschluss",
  "rechtliches",
  "standard",
] as const;
export type BausteinKategorie = (typeof BAUSTEIN_KATEGORIEN)[number];

export const DOKUMENT_ARTEN = [
  "angebot",
  "preisliste",
  "lieferschein",
  "sortiment",
  "sonstiges",
] as const;
export type DokumentArt = (typeof DOKUMENT_ARTEN)[number];

export const ABSCHNITT_QUELLEN = [
  "mail",
  "verdichtung",
  "dokument",
  "baustein",
] as const;
export type AbschnittQuelle = (typeof ABSCHNITT_QUELLEN)[number];

/* --- Der Kunde, wie ihn die Oberfläche sieht -----------------------------
   In der Datenbank liegen Name, Firma und Ansprechpartner verschlüsselt.
   Was aus dem Server nach oben gereicht wird, ist bereits entschlüsselt —
   und trägt die Geheimtexte nicht mehr mit sich. */

export type KundeLesbar = Omit<
  Kunde,
  | "anzeigename_geheim"
  | "anzeigename_such"
  | "firma_geheim"
  | "firma_such"
  | "ansprechpartner_geheim"
  | "ansprechpartner_such"
> & {
  anzeigename: string;
  firma: string | null;
  ansprechpartner: string | null;
};
