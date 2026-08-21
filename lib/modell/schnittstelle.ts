/**
 * Die eine Schnittstelle, über die jeder Modellaufruf läuft (`MODELL.md` §8).
 *
 * Vier Methoden: `formulieren`, `uebersetzen`, `einordnen`, `einbetten`.
 * Darunter liegen austauschbare Umsetzungen — Mistral und ein Adapter für
 * lokal laufende Modelle. Der Wechsel ist eine Umgebungsvariable, kein Umbau.
 *
 * Warum überhaupt eine Schnittstelle bei einer Nutzerin: Die App verarbeitet
 * Kundendaten ihres Arbeitgebers. Wenn sich die Rechtslage, die Preise oder
 * die Qualität ändern, muss der Anbieterwechsel eine Konfigurationszeile sein
 * und keine Umbauaktion — sonst wird er aus Aufwandsgründen unterlassen.
 */

/** Wofür ein Aufruf gedacht ist. Landet im Kostenprotokoll (`MODELL.md` §7). */
export type Zweck =
  | "einordnen"
  | "kunde-erkennen"
  | "formulieren"
  | "uebersetzen"
  | "rueckuebersetzen"
  | "terminologie-pruefen"
  | "regel-ableiten"
  | "fakten-extrahieren"
  | "verdichten"
  | "einbetten";

/**
 * Welche Modellstufe ein Aufruf braucht.
 *
 * Diese Zuordnung ist die eigentliche Kostensteuerung (`MODELL.md` §1):
 * Von neun Aufgaben brauchen zwei das teure Modell. Nicht das Sparen am
 * Kontext hält die Kosten unten — zu wenig Kontext kostet Qualität.
 */
export type Stufe = "klein" | "gross";

export type Nachricht = {
  rolle: "system" | "nutzer" | "modell";
  inhalt: string;
};

export type Auftrag = {
  zweck: Zweck;
  stufe: Stufe;
  nachrichten: Nachricht[];
  /** Obergrenze der Antwortlänge. Ohne Angabe entscheidet der Adapter. */
  hoechstlaenge?: number;
  /**
   * Niedrig = wortgetreu, hoch = freier. Die Rückübersetzung braucht
   * bewusst einen niedrigen Wert, sonst glättet sie und die Kontrolle
   * wird wertlos (`SKILLS.md` §8).
   */
  streuung?: number;
  /** Bricht den Aufruf ab, wenn die Nutzerin die Seite verlässt. */
  abbruch?: AbortSignal;
  /**
   * Schlüssel für das Prompt-Caching (`MODELL.md` §7).
   *
   * Mistral gewährt rund 90 % Nachlass auf Eingabe-Token, die es aus einem
   * zwischengespeicherten Präfix wiederverwenden kann — und das muss man
   * anfordern, es passiert nicht von allein.
   *
   * Der Schlüssel muss über gleichartige Aufrufe hinweg **stabil** sein und
   * darf nichts Wechselndes enthalten. Genau deshalb steht er hier und wird
   * nicht im Adapter geraten: Nur die aufrufende Stelle weiß, welche Blöcke
   * sie unverändert lässt.
   */
  zwischenspeicherSchluessel?: string;
};

export type Verbrauch = {
  modell: string;
  tokenEin: number;
  tokenAus: number;
  /**
   * Wie viele der Eingabe-Token aus dem Zwischenspeicher kamen.
   * Sie stecken in `tokenEin` mit drin, kosten aber nur einen Bruchteil.
   */
  tokenZwischenspeicher: number;
  kostenEur: number;
};

export type Antwort = {
  text: string;
  verbrauch: Verbrauch;
};

/** Ein Stück Text, während es entsteht — oder die Schlussmeldung. */
export type Bruchstueck =
  | { art: "text"; text: string }
  | { art: "fertig"; antwort: Antwort };

/**
 * Was jeder Anbieter können muss.
 *
 * `formulieren` streamt, die anderen drei nicht. Das ist kein Zufall:
 * Ihr Engpass ist Grübelzeit vor dem leeren Feld (`CLAUDE.md` §1). Beim
 * Formulieren zählt, dass Text *entsteht*, während sie zusieht. Beim
 * Einordnen oder Einbetten sieht sie ohnehin nichts.
 */
export interface ModellAnbieter {
  readonly name: string;

  /** Erzeugt Text und gibt ihn stückweise heraus, während er entsteht. */
  formulieren(auftrag: Auftrag): AsyncGenerator<Bruchstueck, void, unknown>;

  /** Überträgt in eine andere Sprache. Wartet die vollständige Antwort ab. */
  uebersetzen(auftrag: Auftrag): Promise<Antwort>;

  /** Klassifiziert, prüft, extrahiert — alles Kurze und Sachliche. */
  einordnen(auftrag: Auftrag): Promise<Antwort>;

  /** Wandelt Texte in Vektoren für die Ähnlichkeitssuche. */
  einbetten(texte: string[], abbruch?: AbortSignal): Promise<{
    vektoren: number[][];
    verbrauch: Verbrauch;
  }>;
}

/**
 * Wird geworfen, wenn ein Aufruf endgültig nicht klappt — also nach allen
 * Wiederholungen. Trägt einen Satz, der ihr gezeigt werden kann: deutsch,
 * ohne Code, mit einer Handlungsanweisung (`MODELL.md` §5, `DESIGN.md` §7).
 */
export class ModellFehler extends Error {
  constructor(
    /** Was ihr angezeigt wird. */
    readonly fuerSie: string,
    /** Was ins Serverprotokoll gehört. */
    technisch: string,
    readonly ursache?: unknown,
  ) {
    super(technisch);
    this.name = "ModellFehler";
  }
}
