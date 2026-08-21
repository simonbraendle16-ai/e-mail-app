import "server-only";
import { nurServer } from "@/lib/umgebung";
import { OpenAiKompatiblerAnbieter } from "./openai-kompatibel";
import { ModellFehler } from "./schnittstelle";
import type { ModellAnbieter } from "./schnittstelle";

/**
 * Welcher Anbieter läuft — und die Modellnamen dazu.
 *
 * Der Wechsel ist eine Umgebungsvariable (`MODELL.md` §8):
 *   MODELL_ANBIETER=mistral   (Vorgabe)
 *   MODELL_ANBIETER=lokal     Ollama, LM Studio, alles OpenAI-kompatible
 *
 * Auch der Wechsel von seinem Mistral-Konto auf ihr eigenes ist damit nichts
 * weiter als ein neuer Schlüssel in der Konfiguration.
 */

/**
 * Mistral, EU-Endpunkt.
 *
 * **Modellnamen, am 2026-08-21 gegen die laufende API geprüft** — nicht aus
 * der Dokumentation abgeschrieben, die andere Schreibweisen nennt:
 *   `mistral-large-2512`  (Large 3)
 *   `mistral-small-2603`  (Small 4)
 *   `mistral-embed-2312`  (1024 Dimensionen, passt zu `vector(1024)`)
 *
 * `MODELL.md` §1 nennt durchgehend „Small 3.1". Das führt Mistral inzwischen
 * als veraltet; an seiner Stelle steht Small 4.
 *
 * **Feste Versionen, kein `-latest`.** Es gäbe `mistral-large-latest`, aber
 * dann änderte sich das Modell still unter der App weg. Genau dagegen ist die
 * Rückschrittsprüfung gebaut (`MODELL.md` §6): Ändert sich das Modell, sollen
 * die gesammelten Fälle erneut durchlaufen — das setzt voraus, dass der
 * Wechsel überhaupt bemerkt wird.
 *
 * Die Namen sind über Umgebungsvariablen überschreibbar, damit ein
 * Modellwechsel keinen neuen Build braucht — bei einer App, die eine einzelne
 * Person im Büro benutzt, ist das der Unterschied zwischen „heute Abend
 * behoben" und „nächstes Wochenende".
 */
function mistral(): ModellAnbieter {
  return new OpenAiKompatiblerAnbieter({
    name: "mistral",
    basisAdresse: process.env.MISTRAL_BASIS_ADRESSE ?? "https://api.mistral.ai/v1",
    schluessel: nurServer("MISTRAL_API_KEY"),
    modelle: {
      gross: process.env.MISTRAL_MODELL_GROSS ?? "mistral-large-2512",
      klein: process.env.MISTRAL_MODELL_KLEIN ?? "mistral-small-2603",
    },
    einbettungsModell:
      process.env.MISTRAL_MODELL_EINBETTUNG ?? "mistral-embed-2312",
  });
}

/**
 * Ein lokal laufendes Modell.
 *
 * Steht hier nicht als Spielerei, sondern als Nachweis: Die Behauptung „der
 * Anbieter ist austauschbar" ist erst dann etwas wert, wenn es einen zweiten
 * gibt. Solange nur ein Adapter existiert, ist die Schnittstelle eine
 * Vermutung.
 *
 * Praktisch heißt das: Sollte Mistral je ausfallen, die Preise verdoppeln oder
 * die Rechtslage sich ändern, läuft die App auf ihrem eigenen Rechner weiter —
 * langsamer, aber sie läuft, und kein Kundendatum verlässt dann das Haus.
 */
function lokal(): ModellAnbieter {
  return new OpenAiKompatiblerAnbieter({
    name: "lokal",
    basisAdresse: process.env.LOKAL_BASIS_ADRESSE ?? "http://localhost:11434/v1",
    /* Ollama will keinen Schlüssel, verlangt aber irgendeinen Wert. */
    schluessel: process.env.LOKAL_SCHLUESSEL ?? "nicht-noetig",
    modelle: {
      gross: process.env.LOKAL_MODELL_GROSS ?? "mistral-small",
      klein: process.env.LOKAL_MODELL_KLEIN ?? "mistral-small",
    },
    einbettungsModell: process.env.LOKAL_MODELL_EINBETTUNG ?? "nomic-embed-text",
    /* Auf einem Bürorechner ohne Grafikkarte dauert eine Mail Minuten. */
    zeitgrenzeMs: 600_000,
  });
}

let zwischengespeichert: ModellAnbieter | undefined;

/**
 * Der eingestellte Anbieter. Wird einmal gebaut und behalten — jeder Aufruf
 * würde sonst die Umgebungsvariablen neu einlesen und den Schlüssel neu prüfen.
 *
 * Fehlt der Schlüssel, kommt ein `ModellFehler` mit einem Satz, den sie lesen
 * kann — kein roher Programmfehler. Das ist kein Netzproblem, sondern etwas,
 * das einmal eingerichtet werden muss, und beides braucht verschiedene Sätze.
 */
export function anbieter(): ModellAnbieter {
  if (zwischengespeichert) return zwischengespeichert;

  const gewaehlt = (process.env.MODELL_ANBIETER ?? "mistral").toLowerCase();
  try {
    zwischengespeichert = gewaehlt === "lokal" ? lokal() : mistral();
  } catch (fehler) {
    throw new ModellFehler(
      "Die App ist noch nicht fertig eingerichtet. Sag deinem Sohn Bescheid — es fehlt ein Zugang.",
      fehler instanceof Error ? fehler.message : String(fehler),
      fehler,
    );
  }
  return zwischengespeichert;
}

/**
 * Ob überhaupt ein Anbieter eingerichtet ist.
 * Für Anzeigen, die auch ohne Modellzugang stehen bleiben sollen.
 */
export function anbieterEingerichtet(): boolean {
  try {
    anbieter();
    return true;
  } catch {
    return false;
  }
}

/** Nur für Tests: erzwingt den Neuaufbau beim nächsten Zugriff. */
export function anbieterVergessen(): void {
  zwischengespeichert = undefined;
}
