import "server-only";
import { alleKunden } from "@/lib/db/kunden";
import type { KundeLesbar } from "@/lib/db/typen";

/**
 * Erkennt, von wem eine eingefügte Mail stammt.
 *
 * **Der Fehlschlag ist der Normalfall, nicht die Ausnahme** (`CLAUDE.md` §9):
 * Kopiert sie nur den Mailtext ohne Kopfzeilen, steht der Absender bestenfalls
 * in der Signatur; bei Erstkontakt gibt es gar keinen Kunden. Deshalb ist
 * „nicht erkannt" hier ein gleichwertiges Ergebnis und kein Fehler — die App
 * fragt dann schlicht nach.
 *
 * **Kein Modellaufruf.** Der Abgleich läuft gegen den Bestand: Steht ein
 * bekannter Kundenname im Text, ist er es sehr wahrscheinlich. Ein Modell
 * würde hier raten, wo es nichts zu raten gibt — und dabei Kundendaten an
 * Mistral schicken für eine Frage, die eine Zeichenkettensuche beantwortet.
 */

export type Erkennung =
  | { stand: "erkannt"; kunde: KundeLesbar; grund: string }
  | { stand: "mehrdeutig"; kandidaten: KundeLesbar[] }
  | { stand: "unbekannt" };

/**
 * Sucht bekannte Kundennamen im Text.
 *
 * Verglichen wird gegen die entschlüsselten Namen — die Suche über den
 * HMAC-Suchwert kann nur exakte Treffer, hier brauchen wir aber Fundstellen
 * mitten im Fließtext. Bei einigen hundert Kunden ist das unproblematisch.
 */
export async function kundeErkennen(text: string): Promise<Erkennung> {
  if (!text.trim()) return { stand: "unbekannt" };

  let kunden: KundeLesbar[];
  try {
    kunden = await alleKunden();
  } catch {
    /* Datenbank nicht erreichbar: Sie soll trotzdem schreiben können. */
    return { stand: "unbekannt" };
  }

  if (kunden.length === 0) return { stand: "unbekannt" };

  const klein = text.toLowerCase();
  const treffer: { kunde: KundeLesbar; grund: string; gewicht: number }[] = [];

  for (const kunde of kunden) {
    /* Firma und Anzeigename wiegen schwerer als der Ansprechpartner:
       „Meier" kann viele sein, „Meier & Co." ist eindeutiger. */
    const kandidaten: { wert: string | null; grund: string; gewicht: number }[] =
      [
        { wert: kunde.firma, grund: "Firma steht in der Mail", gewicht: 3 },
        { wert: kunde.anzeigename, grund: "Name steht in der Mail", gewicht: 3 },
        {
          wert: kunde.ansprechpartner,
          grund: "Ansprechpartner steht in der Mail",
          gewicht: 1,
        },
      ];

    for (const { wert, grund, gewicht } of kandidaten) {
      if (!wert || wert.length < 3) continue;
      if (klein.includes(wert.toLowerCase())) {
        treffer.push({ kunde, grund, gewicht: gewicht * wert.length });
        break; // ein Treffer pro Kunde genügt
      }
    }
  }

  if (treffer.length === 0) return { stand: "unbekannt" };

  treffer.sort((a, b) => b.gewicht - a.gewicht);

  const [bester, zweiter] = treffer;

  /* Mehrdeutig, wenn zwei Kunden ähnlich stark treffen. Dann wird gefragt
     statt geraten — eine Mail an den falschen Kunden ist schlimmer als eine
     Rückfrage. */
  if (zweiter && zweiter.gewicht >= bester!.gewicht * 0.8) {
    return {
      stand: "mehrdeutig",
      kandidaten: treffer.slice(0, 3).map((t) => t.kunde),
    };
  }

  return { stand: "erkannt", kunde: bester!.kunde, grund: bester!.grund };
}
