import "server-only";
import { serverZugang } from "@/lib/supabase/server";
import { kundeLaden } from "@/lib/db/kunden";
import type { KundeLesbar, RegelArt } from "@/lib/db/typen";
import type { Skill } from "@/lib/skills/typen";
import { abschnitteSuchen } from "@/lib/wissen/suche";

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
  /** `vermeiden`, `bevorzugen`, `ton`, `aufbau` (`lib/db/typen.ts`). */
  art: RegelArt;
  /**
   * Suchmuster für die maschinelle Prüfung (`MODELL.md` §4).
   *
   * Nur `vermeiden`-Regeln haben eins, und auch die nicht immer: „klinge
   * nicht so steif" lässt sich nicht als Muster fassen, „nie 'mit
   * freundlichen Grüßen'" schon. Ohne Muster bleibt die Regel eine reine
   * Anweisung an das Modell — mit Muster kommt die Prüfung dazu, die auch
   * dann noch greift, wenn das Modell die Anweisung überliest.
   */
  muster: string | null;
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
  /**
   * Wessen Kostenzeile die Einbettung der Suchanfrage wird. Ohne diese
   * Angabe fällt die hybride Suche aus und es bleibt bei „zuletzt
   * geschrieben" — kein Fehler, nur weniger passende Beispiele.
   */
  nutzerId?: string;
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
    beispieleLaden(
      kundeId,
      skill,
      angaben.nutzerId
        ? {
            nutzerId: angaben.nutzerId,
            suchtext: angaben.suchtext,
            archivEinbeziehen: angaben.archivEinbeziehen,
          }
        : undefined,
    ),
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
      .select("regel, kunde_id, art, muster")
      .eq("status", "aktiv");

    /* Globale Regeln immer, kundenspezifische nur für diesen Kunden. */
    abfrage = kundeId
      ? abfrage.or(`kunde_id.is.null,kunde_id.eq.${kundeId}`)
      : abfrage.is("kunde_id", null);

    const { data } = await abfrage;

    return (data ?? []).map((z) => ({
      text: z.regel,
      kundenspezifisch: z.kunde_id !== null,
      art: (z.art ?? "vermeiden") as RegelArt,
      muster: z.muster ?? null,
    }));
  } catch {
    return [];
  }
}

/**
 * Frühere Mails als Tonbeispiele.
 *
 * **Seit Phase 10 zuerst über die hybride Suche** — die *ähnlichsten* Mails
 * statt der *letzten*. Für den Ton reicht „zuletzt geschrieben", für den
 * Inhalt nicht: Fragt ein Kunde nach einem Reifegrad, hilft die Mail von
 * vorletzter Woche zum selben Thema mehr als die von gestern zur Lieferung.
 *
 * Die Reihenfolge ist bewusst: Findet die Suche nichts — kein Index, keine
 * Einbettung, Datenbank klemmt —, fällt sie auf „zuletzt geschrieben"
 * zurück. Ein generisches Beispiel ist besser als gar keins.
 */
async function beispieleLaden(
  kundeId: string | null | undefined,
  skill: Skill,
  suche?: { nutzerId: string; suchtext: string; archivEinbeziehen?: boolean },
): Promise<string[]> {
  if (!skill.kontext.includes("letzte_mails")) return [];

  if (suche?.suchtext.trim() && suche.nutzerId) {
    const treffer = await abschnitteSuchen({
      nutzerId: suche.nutzerId,
      frage: suche.suchtext,
      kundeId,
      anzahl: kundeId ? GRENZEN.beispieleKunde : GRENZEN.beispieleFremd,
      archivEinbeziehen: suche.archivEinbeziehen,
    });

    const gefunden = treffer
      .filter((t) => t.quelleArt === "mail" || t.quelleArt === "verdichtung")
      .map((t) =>
        t.inhalt.length > GRENZEN.beispielZeichen
          ? t.inhalt.slice(0, GRENZEN.beispielZeichen) + " …"
          : t.inhalt,
      );

    if (gefunden.length > 0) return gefunden;
  }

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
