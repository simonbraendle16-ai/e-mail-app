import "server-only";
import { einbetten } from "@/lib/modell";
import { serverZugang } from "@/lib/supabase/server";

/**
 * Die hybride Suche (`SKILLS.md` §6, Skill `wissensabruf`).
 *
 * **Warum hybrid und nicht nur Ähnlichkeit:** Eine reine Vektorsuche
 * übersieht exakte Begriffe. „Artikel 4711" ist einer Anfrage nach
 * „Bestellnummer 4712" semantisch zum Verwechseln ähnlich — und genau der
 * eine Ziffernunterschied entscheidet. Die Volltextsuche findet solche
 * Begriffe zuverlässig, die Ähnlichkeitssuche findet, was anders formuliert
 * ist. Zusammengeführt werden beide in `abschnitte_suchen`.
 *
 * Die Rangbildung passiert in der Datenbank, nicht hier — sonst müssten zwei
 * Trefferlisten über die Leitung, nur um im Server verworfen zu werden.
 */

export type Treffer = {
  id: string;
  inhalt: string;
  quelleArt: string;
  quelleId: string;
  kundeId: string | null;
  ausArchiv: boolean;
  punkte: number;
};

export type SucheAngaben = {
  nutzerId: string;
  frage: string;
  kundeId?: string | null;
  anzahl?: number;
  /**
   * Nimmt archivierte Abschnitte dazu — nur auf ihren ausdrücklichen Wunsch.
   * Normalerweise bleibt der Wortlaut verdichteter Mails außen vor, damit er
   * den Server nicht mehr verlässt (`CLAUDE.md` §4).
   */
  archivEinbeziehen?: boolean;
  namen?: {
    kunde?: string | null;
    firma?: string | null;
    ansprechpartner?: string | null;
  };
  abbruch?: AbortSignal;
};

export async function abschnitteSuchen(
  angaben: SucheAngaben,
): Promise<Treffer[]> {
  const frage = angaben.frage.trim();
  if (!frage) return [];

  try {
    const [vektor] = await einbetten({
      texte: [frage.slice(0, 2000)],
      nutzerId: angaben.nutzerId,
      namen: angaben.namen
        ? {
            kunde: angaben.namen.kunde ?? undefined,
            firma: angaben.namen.firma ?? undefined,
            ansprechpartner: angaben.namen.ansprechpartner ?? undefined,
          }
        : undefined,
      abbruch: angaben.abbruch,
    });

    if (!vektor) return [];

    const zugang = await serverZugang();
    const { data } = await zugang.rpc("abschnitte_suchen", {
      frage_einbettung: JSON.stringify(vektor),
      frage_text: frage,
      nur_kunde: angaben.kundeId ?? undefined,
      anzahl: angaben.anzahl ?? 6,
      archiv_einbeziehen: angaben.archivEinbeziehen ?? false,
    });

    return (data ?? []).map(
      (z: {
        id: string;
        inhalt: string;
        quelle_art: string;
        quelle_id: string;
        kunde_id: string | null;
        aus_archiv: boolean;
        punkte: number;
      }) => ({
        id: z.id,
        inhalt: z.inhalt,
        quelleArt: z.quelle_art,
        quelleId: z.quelle_id,
        kundeId: z.kunde_id,
        ausArchiv: z.aus_archiv,
        punkte: z.punkte,
      }),
    );
  } catch {
    /* Ohne Suche wird formuliert, nur ohne passende Beispiele. Das ist
       schlechter, aber nicht kaputt — und `MODELL.md` §5 verlangt genau
       das: „Datenbank nicht erreichbar → Formulieren geht weiter." */
    return [];
  }
}
