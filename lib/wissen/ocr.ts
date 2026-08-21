import "server-only";

/**
 * Mistral OCR — Text aus PDFs und Bildern (`CLAUDE.md` §5.5).
 *
 * **Warum ein eigener Endpunkt und nicht der Chat-Adapter:** OCR ist kein
 * Gespräch. Mistral bietet dafür `/v1/ocr` mit eigenem Modell und eigener
 * Abrechnung (pro Seite, nicht pro Token). Durch das Provider-Interface zu
 * pressen hieße, es als Chat zu verkleiden, und die Kostenzeile stimmte nicht.
 *
 * **Was hier bewusst nicht passiert:** keine Pseudonymisierung. Ein Angebot
 * oder eine Preisliste als Bild lässt sich nicht sinnvoll um Namen
 * bereinigen, bevor man weiß, was daraufsteht — die Erkennung ist ja gerade
 * der Schritt, der den Text erst lesbar macht. Der erkannte Text durchläuft
 * die Pseudonymisierung danach, beim Einbetten und bei jedem Modellaufruf.
 * Das ist eine bewusste Lücke, keine übersehene: Sie steht offen in
 * `CLAUDE.md` §4 unter „Pseudonymisierung ist eine Schutzschicht, kein
 * Schutzwall".
 *
 * **Nicht am echten Endpunkt erprobt.** Der Aufruf folgt der
 * dokumentierten Form; getestet ist bisher nur, dass ein Fehlschlag sauber
 * als solcher ankommt und den Upload nicht mitreißt.
 */

const MODELL = process.env.MISTRAL_MODELL_OCR ?? "mistral-ocr-2512";

export type OcrErgebnis =
  | { erkannt: true; text: string; seiten: number }
  | { erkannt: false; grund: string };

/**
 * Liest den Text aus einer Datei.
 *
 * Gibt nie einen Fehler weiter, sondern immer ein Ergebnis: Eine
 * hochgeladene Unterlage, deren Text nicht erkannt wurde, ist trotzdem
 * abgelegt — sie taucht nur nicht in der Suche auf. Das ist ein
 * Qualitätsverlust, kein Datenverlust, und der Unterschied gehört sichtbar
 * gemacht statt in eine Ausnahme verpackt.
 */
export async function textErkennen(angaben: {
  /** Öffentlich erreichbare Adresse oder `data:`-URL der Datei. */
  dateiAdresse: string;
  abbruch?: AbortSignal;
}): Promise<OcrErgebnis> {
  const schluessel = process.env.MISTRAL_API_KEY;
  const basis = process.env.MISTRAL_BASIS_ADRESSE ?? "https://api.mistral.ai/v1";

  if (!schluessel) {
    return {
      erkannt: false,
      grund: "Die Texterkennung ist noch nicht eingerichtet.",
    };
  }

  try {
    const antwort = await fetch(`${basis}/ocr`, {
      method: "POST",
      signal: angaben.abbruch,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${schluessel}`,
      },
      body: JSON.stringify({
        model: MODELL,
        document: {
          type: "document_url",
          document_url: angaben.dateiAdresse,
        },
      }),
    });

    if (!antwort.ok) {
      return {
        erkannt: false,
        grund: "Aus dieser Datei konnte ich keinen Text lesen.",
      };
    }

    const daten = (await antwort.json()) as {
      pages?: { markdown?: string; text?: string }[];
    };

    const seiten = daten.pages ?? [];
    const text = seiten
      .map((s) => s.markdown ?? s.text ?? "")
      .filter(Boolean)
      .join("\n\n")
      .trim();

    if (!text) {
      return {
        erkannt: false,
        grund: "In dieser Datei stand kein lesbarer Text.",
      };
    }

    return { erkannt: true, text, seiten: seiten.length };
  } catch {
    return {
      erkannt: false,
      grund: "Die Texterkennung klemmt gerade. Die Unterlage ist trotzdem abgelegt.",
    };
  }
}
