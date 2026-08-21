import "server-only";
import { einbetten } from "@/lib/modell";
import { serverZugang } from "@/lib/supabase/server";

/**
 * Die RAG-Basis: Texte in Abschnitte zerlegen, einbetten und ablegen
 * (`PLAN.md` §2, Phase 10).
 *
 * **Wissen wächst von allein.** Sie legt keine Wissensbasis an — jede Mail,
 * die sie schreibt, wird nebenbei zu durchsuchbarem Material. Das ist
 * dieselbe Zusage wie beim Kundengedächtnis, und sie trägt nur, solange
 * niemand etwas dafür tun muss.
 *
 * **Pseudonymisiert wird auch hier.** Die Abschnitte landen dauerhaft in der
 * Datenbank, und bei jedem Einbetten geht ihr Inhalt an den Anbieter —
 * `einbetten` nimmt die Klarnamen deshalb entgegen und ersetzt sie, bevor
 * etwas den Server verlässt.
 */

export type Quellenart = "mail" | "verdichtung" | "dokument" | "baustein";

/** Ungefähre Zeichenzahl je Abschnitt. */
const ABSCHNITT = 900;
/** Überlappung, damit ein Satz an der Grenze nicht verlorengeht. */
const UEBERLAPPUNG = 150;

/**
 * Zerlegt einen Text in Abschnitte.
 *
 * Getrennt wird **an Absätzen**, nicht an einer festen Zeichenzahl: Ein
 * Abschnitt, der mitten im Satz endet, liefert bei der Ähnlichkeitssuche
 * einen Treffer, den man nicht mehr verstehen kann. Erst wenn ein einzelner
 * Absatz zu lang ist, wird hart geschnitten.
 */
export function zerlegen(text: string): string[] {
  const sauber = text.trim();
  if (!sauber) return [];
  if (sauber.length <= ABSCHNITT) return [sauber];

  const absaetze = sauber.split(/\n\s*\n/).filter((a) => a.trim());
  const abschnitte: string[] = [];
  let laufend = "";

  for (const absatz of absaetze) {
    if (absatz.length > ABSCHNITT) {
      if (laufend.trim()) {
        abschnitte.push(laufend.trim());
        laufend = "";
      }
      abschnitte.push(...hartSchneiden(absatz));
      continue;
    }

    if ((laufend + absatz).length > ABSCHNITT) {
      abschnitte.push(laufend.trim());
      /* Das Ende des vorigen Abschnitts wandert mit — sonst reißt ein
         Zusammenhang genau an der Grenze ab. */
      laufend = `${laufend.slice(-UEBERLAPPUNG)}\n\n${absatz}`;
    } else {
      laufend = laufend ? `${laufend}\n\n${absatz}` : absatz;
    }
  }

  if (laufend.trim()) abschnitte.push(laufend.trim());
  return abschnitte.filter((a) => a.length > 20);
}

function hartSchneiden(text: string): string[] {
  const teile: string[] = [];
  for (let i = 0; i < text.length; i += ABSCHNITT - UEBERLAPPUNG) {
    teile.push(text.slice(i, i + ABSCHNITT).trim());
  }
  return teile.filter(Boolean);
}

export type IndexierenAngaben = {
  nutzerId: string;
  quelleArt: Quellenart;
  quelleId: string;
  text: string;
  kundeId?: string | null;
  /** Klarnamen, die den Server nicht verlassen dürfen. */
  namen?: {
    kunde?: string | null;
    firma?: string | null;
    ansprechpartner?: string | null;
  };
  abbruch?: AbortSignal;
};

/**
 * Legt einen Text als durchsuchbare Abschnitte ab.
 *
 * Alte Abschnitte derselben Quelle werden vorher entfernt: Wird eine Mail
 * überarbeitet, stünden sonst zwei Fassungen nebeneinander im Index, und die
 * Suche fände mal die eine, mal die andere.
 *
 * Wirft nie. Ein fehlender Index kostet Qualität in künftigen Mails, aber er
 * darf nie der Grund sein, warum eine fertige Mail nicht ankommt.
 */
export async function indexieren(angaben: IndexierenAngaben): Promise<number> {
  const abschnitte = zerlegen(angaben.text);
  if (abschnitte.length === 0) return 0;

  try {
    const zugang = await serverZugang();

    await zugang
      .from("chunks")
      .delete()
      .eq("quelle_art", angaben.quelleArt)
      .eq("quelle_id", angaben.quelleId);

    const vektoren = await einbetten({
      texte: abschnitte,
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

    await zugang.from("chunks").insert(
      abschnitte.map((inhalt, i) => ({
        nutzer_id: angaben.nutzerId,
        kunde_id: angaben.kundeId ?? null,
        quelle_art: angaben.quelleArt,
        quelle_id: angaben.quelleId,
        /* **Der Klartext bleibt hier.** Pseudonymisiert wird, was an den
           Anbieter geht — nicht, was in ihrer eigenen Datenbank liegt.
           Sonst stünde in jedem Suchtreffer „[KUNDE_1]" statt eines
           Namens, und die Beispiele wären für das Modell wertlos. */
        inhalt,
        einbettung: vektoren[i] ? JSON.stringify(vektoren[i]) : null,
      })),
    );

    return abschnitte.length;
  } catch {
    return 0;
  }
}
