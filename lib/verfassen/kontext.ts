import "server-only";
import { serverZugang } from "@/lib/supabase/server";
import { kundeLaden } from "@/lib/db/kunden";
import type { KundeLesbar } from "@/lib/db/typen";
import type { Skill } from "@/lib/skills/typen";

/**
 * Stellt zusammen, was die App über diesen Kunden und dieses Thema weiß
 * (`SKILLS.md` §6, Skill `wissensabruf`).
 *
 * **Reine Datenbankarbeit, kein Modellaufruf.** Das ist Schritt 2 im
 * Verarbeitungsweg (`PLAN.md` §3) und kostet nichts.
 *
 * Die Obergrenzen sind nicht geraten, sondern stehen in `SKILLS.md` §6 —
 * sie sind die Kostenbremse gegen den Fall, dass ein Kunde mit 200 Mails
 * plötzlich das Zehnfache kostet.
 */

/** Obergrenzen aus `SKILLS.md` §6. */
const GRENZEN = {
  /** Frühere Mails an diesen Kunden — genug für den Ton, ohne das Fenster zu fluten. */
  beispieleKunde: 6,
  /** Frühere Mails an andere, nur wenn der Kunde neu ist. Rückfall für den Erstkontakt. */
  beispieleFremd: 4,
  /** Passende Textbausteine — mehr verwirrt mehr als es hilft. */
  bausteine: 3,
  /** Dokumentauszüge, nur bei `anfrage-angebot`. */
  dokumente: 3,
  /** Wie lang ein Beispiel höchstens sein darf, bevor es gekürzt wird. */
  beispielZeichen: 1200,
} as const;

export type Kontextregel = {
  text: string;
  kundenspezifisch: boolean;
};

export type Kontext = {
  kunde?: KundeLesbar;
  /** Bestätigte Fakten über den Kunden. */
  fakten: string[];
  /** Aktive Stilregeln, global und kundenspezifisch. */
  regeln: Kontextregel[];
  /** Frühere Mails als Tonbeispiele. */
  beispiele: string[];
  /** Passende Textbausteine. */
  bausteine: string[];
  /** Ob überhaupt etwas gefunden wurde — für den ehrlichen Hinweis. */
  leer: boolean;
};

export type KontextAngaben = {
  kundeId?: string | null;
  skill: Skill;
  /** Eingegangene Mail und Stichworte, für die Suche. */
  suchtext: string;
  /** Nimmt archivierte Mails dazu — nur auf ihren ausdrücklichen Wunsch. */
  archivEinbeziehen?: boolean;
};

/**
 * Sammelt den Kontext.
 *
 * **Ein Ausfall darf sie nicht am Schreiben hindern** (`MODELL.md` §5:
 * „Datenbank nicht erreichbar → Formulieren geht weiter, ohne Kontext, mit
 * Hinweis"). Deshalb wird jeder Teil einzeln versucht; was nicht kommt, fehlt
 * eben, statt alles scheitern zu lassen.
 */
export async function kontextSammeln(
  angaben: KontextAngaben,
): Promise<Kontext> {
  const { kundeId, skill } = angaben;

  const kunde = kundeId ? await kundeLadenSicher(kundeId) : undefined;

  const [fakten, regeln, beispiele, bausteine] = await Promise.all([
    kundeId ? faktenLaden(kundeId) : Promise.resolve([]),
    regelnLaden(kundeId),
    beispieleLaden(kundeId, skill),
    bausteineLaden(skill),
  ]);

  return {
    kunde,
    fakten,
    regeln,
    beispiele,
    bausteine,
    leer:
      !kunde &&
      fakten.length === 0 &&
      beispiele.length === 0 &&
      bausteine.length === 0,
  };
}

async function kundeLadenSicher(id: string): Promise<KundeLesbar | undefined> {
  try {
    return (await kundeLaden(id)) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Bestätigte Fakten zuerst, unbestätigte danach.
 *
 * Unbestätigte gehen mit — sie sind der Grund, warum die App über die Zeit
 * persönlicher wird. Aber sie stehen hinten, damit das Modell im Zweifel dem
 * folgt, was sie bestätigt hat.
 */
async function faktenLaden(kundeId: string): Promise<string[]> {
  try {
    const zugang = await serverZugang();
    const { data } = await zugang
      .from("customer_facts")
      .select("fakt, bestaetigt, sicherheit")
      .eq("kunde_id", kundeId)
      .order("bestaetigt", { ascending: false })
      .order("sicherheit", { ascending: false })
      .limit(20);

    return (data ?? []).map((z) => z.fakt);
  } catch {
    return [];
  }
}

/**
 * Aktive Stilregeln.
 *
 * **Nur `aktiv`** — vorgeschlagene Regeln wirken nicht, bis sie bestätigt sind
 * (`PLAN.md` §4). Eine still gelernte falsche Regel verschlechtert jede
 * folgende Mail, und sie hätte keine Möglichkeit zu verstehen, warum.
 */
async function regelnLaden(
  kundeId: string | null | undefined,
): Promise<Kontextregel[]> {
  try {
    const zugang = await serverZugang();
    let abfrage = zugang
      .from("style_rules")
      .select("regel, kunde_id")
      .eq("status", "aktiv");

    /* Globale Regeln immer, kundenspezifische nur für diesen Kunden. */
    abfrage = kundeId
      ? abfrage.or(`kunde_id.is.null,kunde_id.eq.${kundeId}`)
      : abfrage.is("kunde_id", null);

    const { data } = await abfrage;

    return (data ?? []).map((z) => ({
      text: z.regel,
      kundenspezifisch: z.kunde_id !== null,
    }));
  } catch {
    return [];
  }
}

/**
 * Frühere Mails als Tonbeispiele.
 *
 * Vorerst die zuletzt verwendeten, nicht die ähnlichsten: Die hybride Suche
 * braucht Einbettungen, und die entstehen erst in Phase 10. Bis dahin ist
 * „zuletzt an diesen Kunden geschrieben" der beste verfügbare Näherungswert
 * für „so schreibt sie ihm".
 */
async function beispieleLaden(
  kundeId: string | null | undefined,
  skill: Skill,
): Promise<string[]> {
  if (!skill.kontext.includes("letzte_mails")) return [];

  try {
    const zugang = await serverZugang();

    const abfrage = zugang
      .from("emails")
      .select("text_de, verdichtung, verdichtet_am")
      .eq("status", "verwendet")
      .order("erstellt_am", { ascending: false });

    const { data } = kundeId
      ? await abfrage.eq("kunde_id", kundeId).limit(GRENZEN.beispieleKunde)
      : await abfrage.limit(GRENZEN.beispieleFremd);

    return (data ?? [])
      .map((z) => {
        /* Ist die Mail verdichtet, geht die Verdichtung mit — nicht der
           Wortlaut. Das ist die 100-Tage-Regel (`CLAUDE.md` §4). */
        const inhalt = z.verdichtet_am ? z.verdichtung : z.text_de;
        return inhalt?.trim() ?? "";
      })
      .filter(Boolean)
      .map((t) =>
        t.length > GRENZEN.beispielZeichen
          ? t.slice(0, GRENZEN.beispielZeichen) + " …"
          : t,
      );
  } catch {
    return [];
  }
}

async function bausteineLaden(skill: Skill): Promise<string[]> {
  if (!skill.kontext.includes("textbausteine")) return [];

  try {
    const zugang = await serverZugang();
    const { data } = await zugang
      .from("boilerplates")
      .select("name, text_de")
      .limit(GRENZEN.bausteine);

    return (data ?? []).map((z) => `${z.name}: ${z.text_de}`);
  } catch {
    return [];
  }
}
