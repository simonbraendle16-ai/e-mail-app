import "server-only";
import { anbieter, anbieterEingerichtet } from "./anbieter";
import { protokollieren } from "./kosten";
import {
  pseudonymisieren,
  zurueckersetzen,
  type Klarnamen,
} from "./pseudonymisierung";
import type {
  Antwort,
  Auftrag,
  Bruchstueck,
  Nachricht,
  Stufe,
  Zweck,
} from "./schnittstelle";

export { ModellFehler } from "./schnittstelle";
export type { Antwort, Auftrag, Bruchstueck, Nachricht, Stufe, Zweck };
export { monatsuebersicht, warnschwelle } from "./kosten";
export type { Monatsuebersicht } from "./kosten";
export { uebrigePlatzhalter } from "./pseudonymisierung";
export type { Klarnamen } from "./pseudonymisierung";

/**
 * Die Fassade, die der übrige Code benutzt.
 *
 * Sie bindet drei Dinge zusammen, die immer zusammen gehören und deshalb nicht
 * an jeder Aufrufstelle einzeln bedacht werden sollen:
 *
 *   1. **Pseudonymisieren** vor dem Aufruf, zurückersetzen danach — beides
 *      serverseitig. Wer den Anbieter direkt aufruft, umgeht das; deshalb ist
 *      dies der bequemere Weg.
 *   2. **Kosten protokollieren** nach jedem Aufruf.
 *   3. **Modellstufe zuordnen** nach `MODELL.md` §1 — die Zuordnung steht an
 *      einer Stelle statt verstreut im Code.
 */

/**
 * Welche Stufe welcher Zweck braucht (`MODELL.md` §1).
 *
 * Zwei von zehn Zwecken brauchen das teure Modell. Das ist die eigentliche
 * Kostensteuerung — nicht das Sparen an Kontext, denn zu wenig Kontext kostet
 * Qualität dort, wo sie zählt.
 */
const STUFE: Record<Zweck, Stufe> = {
  einordnen: "klein",
  "kunde-erkennen": "klein",
  formulieren: "gross", // das ist das Produkt
  uebersetzen: "gross", // Fachsprache, Register, Sinnübertragung
  rueckuebersetzen: "klein", // wörtlich, keine Sprachkunst
  "terminologie-pruefen": "klein",
  "regel-ableiten": "klein",
  "fakten-extrahieren": "klein",
  verdichten: "klein",
  einbetten: "klein",
};

export type AufrufAngaben = {
  zweck: Zweck;
  nachrichten: Nachricht[];
  /** Wessen Kostenzeile das wird. */
  nutzerId: string;
  /** Namen, die den Server nicht im Klartext verlassen dürfen. */
  namen?: Klarnamen;
  hoechstlaenge?: number;
  streuung?: number;
  abbruch?: AbortSignal;
  /**
   * Schluessel fuers Prompt-Caching (MODELL.md 7). Muss ueber gleichartige
   * Aufrufe stabil sein -- ohne ihn cacht Mistral nicht, und die stabilen
   * Anweisungsbloecke kosten jedes Mal voll.
   */
  zwischenspeicherSchluessel?: string;
};

function auftragBauen(
  angaben: AufrufAngaben,
): { auftrag: Auftrag; zurueck: (text: string) => string } {
  const inhalte = angaben.nachrichten.map((n) => n.inhalt);

  if (!angaben.namen) {
    return {
      auftrag: {
        zweck: angaben.zweck,
        stufe: STUFE[angaben.zweck],
        nachrichten: angaben.nachrichten,
        hoechstlaenge: angaben.hoechstlaenge,
        streuung: angaben.streuung,
        abbruch: angaben.abbruch,
        zwischenspeicherSchluessel: angaben.zwischenspeicherSchluessel,
      },
      zurueck: (text) => text,
    };
  }

  const { texte, zuordnung } = pseudonymisieren(inhalte, angaben.namen);

  return {
    auftrag: {
      zweck: angaben.zweck,
      stufe: STUFE[angaben.zweck],
      nachrichten: angaben.nachrichten.map((n, i) => ({
        rolle: n.rolle,
        inhalt: texte[i] ?? n.inhalt,
      })),
      hoechstlaenge: angaben.hoechstlaenge,
      streuung: angaben.streuung,
      abbruch: angaben.abbruch,
      zwischenspeicherSchluessel: angaben.zwischenspeicherSchluessel,
    },
    zurueck: (text) => zurueckersetzen(text, zuordnung),
  };
}

/**
 * Erzeugt Text und gibt ihn stückweise heraus, während er entsteht.
 *
 * Die Rückersetzung der Namen passiert **auf jedem Bruchstück**. Das ist nicht
 * ganz billig, aber die Alternative wäre, den Text erst am Ende zu säubern —
 * dann stünde für ein paar Sekunden `[KUNDE_1]` auf ihrem Bildschirm, und
 * genau dieser Blick würde das Vertrauen kosten.
 *
 * Ein Platzhalter kann trotzdem über eine Bruchstückgrenze fallen und dabei
 * unerkannt bleiben. Deshalb prüft die Schlussmeldung den Gesamttext noch
 * einmal, und Phase 6 kontrolliert ihn ein zweites Mal.
 */
export async function* formulieren(
  angaben: AufrufAngaben,
): AsyncGenerator<Bruchstueck, void, unknown> {
  const { auftrag, zurueck } = auftragBauen(angaben);

  for await (const stueck of anbieter().formulieren(auftrag)) {
    if (stueck.art === "text") {
      yield { art: "text", text: zurueck(stueck.text) };
      continue;
    }

    const text = zurueck(stueck.antwort.text);
    await protokollieren(angaben.nutzerId, angaben.zweck, stueck.antwort.verbrauch);
    yield { art: "fertig", antwort: { ...stueck.antwort, text } };
  }
}

/** Überträgt in eine andere Sprache. Wartet die vollständige Antwort ab. */
export async function uebersetzen(angaben: AufrufAngaben): Promise<Antwort> {
  const { auftrag, zurueck } = auftragBauen(angaben);
  const antwort = await anbieter().uebersetzen(auftrag);
  await protokollieren(angaben.nutzerId, angaben.zweck, antwort.verbrauch);
  return { ...antwort, text: zurueck(antwort.text) };
}

/** Klassifiziert, prüft, extrahiert — alles Kurze und Sachliche. */
export async function einordnen(angaben: AufrufAngaben): Promise<Antwort> {
  const { auftrag, zurueck } = auftragBauen(angaben);
  const antwort = await anbieter().einordnen(auftrag);
  await protokollieren(angaben.nutzerId, angaben.zweck, antwort.verbrauch);
  return { ...antwort, text: zurueck(antwort.text) };
}

/**
 * Wandelt Texte in Vektoren für die Ähnlichkeitssuche.
 *
 * Pseudonymisiert wird auch hier: Die Abschnitte landen dauerhaft in der
 * Datenbank, und bei jedem Einbetten geht ihr Inhalt an den Anbieter.
 */
export async function einbetten(angaben: {
  texte: string[];
  nutzerId: string;
  namen?: Klarnamen;
  abbruch?: AbortSignal;
}): Promise<number[][]> {
  const texte = angaben.namen
    ? pseudonymisieren(angaben.texte, angaben.namen).texte
    : angaben.texte;

  const { vektoren, verbrauch } = await anbieter().einbetten(
    texte,
    angaben.abbruch,
  );
  await protokollieren(angaben.nutzerId, "einbetten", verbrauch);
  return vektoren;
}

/**
 * Welcher Anbieter gerade läuft. Für die Wartungsanzeige.
 * Gibt einen Text zurück statt zu werfen -- eine Anzeige darf nie der Grund
 * sein, warum ein Bildschirm abstürzt.
 */
export function anbieterName(): string {
  return anbieterEingerichtet() ? anbieter().name : "nicht eingerichtet";
}
