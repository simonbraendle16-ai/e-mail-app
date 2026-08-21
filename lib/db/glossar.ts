import "server-only";
import { serverZugang } from "@/lib/supabase/server";

/**
 * Das Fachglossar DE → EN (`CLAUDE.md` §5.4, `SKILLS.md` Skill `uebersetzer`).
 *
 * **Es startet leer, und das ist kein Versäumnis.** Ein Glossareintrag ist ein
 * *Paar* — aus einer einsprachigen Mail lässt sich keins gewinnen. Es gibt
 * weder einen Mailexport noch eine Terminologieliste der Firma. Deshalb der
 * einzige Weg, der ohne Vorarbeit funktioniert: Aufbau durch Bestätigung im
 * Arbeitsablauf. Die App fragt nach der Übersetzung einmal nach, ein Klick
 * macht den Begriff verbindlich, danach nie wieder.
 *
 * Anders als Kundennamen sind Fachbegriffe **nicht verschlüsselt**:
 * „Bergkäse → mountain cheese" ist kein personenbezogenes Datum, und ein
 * verschlüsseltes Glossar wäre für den exakten Abgleich unbrauchbar.
 */

export type Glossareintrag = {
  id: string;
  de: string;
  en: string;
  /** Nur verbindliche Begriffe werden dem Modell als unverhandelbar vorgegeben. */
  verbindlich: boolean;
  bereich: string;
};

type Zeile = {
  id: string;
  begriff_de: string;
  begriff_en: string;
  verbindlich: boolean;
  bereich: string;
};

function lesbar(zeile: Zeile): Glossareintrag {
  return {
    id: zeile.id,
    de: zeile.begriff_de,
    en: zeile.begriff_en,
    verbindlich: zeile.verbindlich,
    bereich: zeile.bereich,
  };
}

/**
 * Alle Begriffe. Das Glossar ist von Natur aus klein — ein paar hundert
 * Einträge in Jahren —, deshalb wird es ganz geladen und der Abgleich läuft
 * im Server. Eine Datenbankabfrage pro Begriff wäre bei dieser Größe teurer
 * als das Laden am Stück.
 */
export async function glossarLaden(): Promise<Glossareintrag[]> {
  try {
    const zugang = await serverZugang();
    const { data } = await zugang
      .from("glossary")
      .select("id, begriff_de, begriff_en, verbindlich, bereich")
      .order("begriff_de");

    return (data ?? []).map((z) => lesbar(z as Zeile));
  } catch {
    /* Ohne Glossar wird übersetzt, nur ohne verbindliche Vorgaben — das ist
       schlechter, aber nicht kaputt. Sie soll weiterarbeiten können. */
    return [];
  }
}

/**
 * Legt einen vorgeschlagenen Begriff an, ohne ihn verbindlich zu machen.
 *
 * `verbindlich = false` ist der Kern der Zusage: Was sie nicht bestätigt hat,
 * wird dem Modell nicht als unverhandelbar vorgeschrieben. Ein falsch
 * geratener Fachbegriff, der sich still als verbindlich einträgt, wäre in
 * jeder folgenden Mail falsch — und sie hätte keine Möglichkeit zu verstehen,
 * warum.
 */
export async function begriffVorschlagen(
  nutzerId: string,
  de: string,
  en: string,
): Promise<void> {
  try {
    const zugang = await serverZugang();
    await zugang.from("glossary").upsert(
      {
        nutzer_id: nutzerId,
        begriff_de: de,
        begriff_en: en,
        herkunft: "vorgeschlagen",
        verbindlich: false,
      },
      { onConflict: "nutzer_id,begriff_de", ignoreDuplicates: true },
    );
  } catch {
    /* Ein nicht gespeicherter Vorschlag kostet nichts — beim nächsten Mal
       fragt die App eben erneut. */
  }
}

/** Ein Klick von ihr, und der Begriff gilt. Danach wird nie wieder gefragt. */
export async function begriffBestaetigen(
  nutzerId: string,
  de: string,
  en: string,
): Promise<void> {
  const zugang = await serverZugang();
  await zugang.from("glossary").upsert(
    {
      nutzer_id: nutzerId,
      begriff_de: de,
      begriff_en: en,
      herkunft: "bestaetigt",
      verbindlich: true,
      sicherheit: 1,
    },
    { onConflict: "nutzer_id,begriff_de" },
  );
}
