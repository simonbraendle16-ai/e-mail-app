import "server-only";
import { einordnen } from "@/lib/modell";
import { faktAblegen, faktenZumKunden } from "@/lib/db/fakten";
import type { FaktKategorie } from "@/lib/db/typen";

/**
 * Faktenextraktion aus einer geschriebenen Mail (`PLAN.md` §6, Phase 9).
 *
 * **Sie pflegt nichts, sie schreibt nur — die App lernt nebenbei.** Das ist
 * die entschiedene Randbedingung des Projekts, und sie ist der Grund, warum
 * die Kundenakte überhaupt eine Chance hat, im Alltag zu überleben.
 *
 * Läuft nach dem Verfassen, mit dem kleinen Modell, und darf jederzeit
 * ausfallen: Ein Fakt, der diesmal nicht gefunden wird, fällt beim nächsten
 * Mail an denselben Kunden wieder auf. Die Extraktion ist ein Zusatz, nie
 * eine Voraussetzung.
 */

const KATEGORIEN: Record<string, FaktKategorie> = {
  vorliebe: "preference",
  verlauf: "history",
  produkt: "product",
  kondition: "condition",
  person: "person",
};

/** Mehr als das braucht keine Mail — sonst wächst die Akte zu Rauschen. */
const HOECHSTENS = 4;

export async function faktenExtrahieren(angaben: {
  nutzerId: string;
  kundeId: string;
  /** Die eingegangene Kundenmail und die geschriebene Antwort. */
  eingehenderText?: string;
  antwort: string;
  mailId?: string | null;
  abbruch?: AbortSignal;
}): Promise<number> {
  if (!angaben.kundeId) return 0;

  try {
    const bekannt = await faktenZumKunden(angaben.kundeId);

    const antwort = await einordnen({
      zweck: "fakten-extrahieren",
      nutzerId: angaben.nutzerId,
      hoechstlaenge: 400,
      abbruch: angaben.abbruch,
      nachrichten: [
        {
          rolle: "system",
          inhalt: [
            "Du liest den Mailwechsel einer Käserei mit einem Kunden.",
            "",
            `Nenne höchstens ${HOECHSTENS} dauerhaft nützliche Tatsachen über diesen Kunden.`,
            "Dauerhaft heißt: gilt auch in einem halben Jahr noch.",
            "",
            "Nimm NICHT auf: einmalige Bestellmengen, Preise, Termine, Tagesgeschäft.",
            "Nimm auf: Vorlieben, feste Konditionen, Ansprechpartner, Sortiment, wie er angesprochen werden will.",
            "",
            "Antworte ausschließlich mit Zeilen der Form: kategorie | tatsache",
            "Kategorien: vorliebe, verlauf, produkt, kondition, person",
            "Gibt es nichts Dauerhaftes, antworte mit einem Bindestrich.",
            "Rate nicht. Im Zweifel: Bindestrich.",
          ].join("\n"),
        },
        {
          rolle: "nutzer",
          inhalt: [
            angaben.eingehenderText
              ? `Vom Kunden:\n${angaben.eingehenderText}`
              : "Es gab keine eingegangene Mail.",
            `Ihre Antwort:\n${angaben.antwort}`,
            bekannt.length
              ? `Schon bekannt (nicht wiederholen):\n${bekannt.map((f) => `- ${f.text}`).join("\n")}`
              : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
    });

    const schonDa = new Set(bekannt.map((f) => f.text.toLowerCase().trim()));

    const neue = antwort.text
      .split("\n")
      .map((z) => z.replace(/^[-*\d.\s]+/, "").trim())
      .filter((z) => z.includes("|"))
      .map((z) => {
        const [roh = "", text = ""] = z.split("|");
        return {
          kategorie: KATEGORIEN[roh.trim().toLowerCase()] ?? "history",
          text: text.trim(),
        };
      })
      .filter((f) => f.text.length > 3 && !schonDa.has(f.text.toLowerCase()))
      .slice(0, HOECHSTENS);

    for (const fakt of neue) {
      await faktAblegen({
        nutzerId: angaben.nutzerId,
        kundeId: angaben.kundeId,
        text: fakt.text,
        kategorie: fakt.kategorie,
        quelleMailId: angaben.mailId ?? null,
      });
    }

    return neue.length;
  } catch {
    return 0;
  }
}
