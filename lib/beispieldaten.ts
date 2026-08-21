/**
 * Beispieldaten für den Design-Prototyp (Phase 1).
 *
 * Diese Datei ist Kulisse, keine Funktion. Sie existiert, damit die fünf
 * Bildschirme mit realistischem Inhalt beurteilt werden können — ein Entwurf
 * mit "Lorem ipsum" lässt sich nicht auf Ton prüfen, und der Ton ist hier
 * das Entscheidende.
 *
 * Wird in Phase 5 bis 10 durch echte Daten aus Supabase ersetzt und dann
 * gelöscht. Die Namen sind erfunden.
 */

export type Sprache = "de" | "en";

export type Kunde = {
  id: string;
  name: string;
  sprache: Sprache;
  land: string;
  ansprechpartner: string;
  branche: string;
  letzterKontakt: string;
  tonalitaet: string;
};

export const kunden: Kunde[] = [
  {
    id: "meier",
    name: "Meier & Co.",
    sprache: "de",
    land: "Deutschland",
    ansprechpartner: "Herr Meier",
    branche: "Feinkosthandel",
    letzterKontakt: "gestern",
    tonalitaet: "Schreibt knapp und direkt. Mag keine langen Vorreden.",
  },
  {
    id: "vandijk",
    name: "Van Dijk BV",
    sprache: "en",
    land: "Niederlande",
    ansprechpartner: "Frau de Vries",
    branche: "Großhandel",
    letzterKontakt: "gestern",
    tonalitaet: "Freundlich, aber sachlich. Fragt gern nach Zertifikaten.",
  },
  {
    id: "alpenhof",
    name: "Alpenhof",
    sprache: "de",
    land: "Österreich",
    ansprechpartner: "Frau Gruber",
    branche: "Hotellerie",
    letzterKontakt: "Montag",
    tonalitaet: "Sehr herzlich. Duzt fast, tut es aber nie ganz.",
  },
  {
    id: "nordfood",
    name: "Nordfood A/S",
    sprache: "en",
    land: "Dänemark",
    ansprechpartner: "Herr Sørensen",
    branche: "Einzelhandelskette",
    letzterKontakt: "vor zwei Wochen",
    tonalitaet: "Knapp bis wortkarg. Will Zahlen, keine Sätze.",
  },
];

export type LetzteMail = {
  id: string;
  kunde: string;
  thema: string;
  wann: string;
};

export const letzteMails: LetzteMail[] = [
  { id: "1", kunde: "Meier & Co.", thema: "Liefertermin", wann: "gestern" },
  { id: "2", kunde: "Van Dijk BV", thema: "Angebot", wann: "gestern" },
  { id: "3", kunde: "Alpenhof", thema: "Bestellung", wann: "Montag" },
  { id: "4", kunde: "Nordfood A/S", thema: "Anfrage", wann: "letzte Woche" },
  { id: "5", kunde: "Meier & Co.", thema: "Bestellung", wann: "letzte Woche" },
];

/** Was die App über einen Kunden gelernt hat. Jeder Punkt ist einzeln löschbar. */
export const gelerntesUeberMeier = [
  "Bestellt regelmäßig Bergkäse in 12-kg-Laiben",
  "Möchte Lieferungen immer dienstags",
  "Reagiert gereizt auf Textbausteine, schreibt selbst sehr knapp",
  "Fragt vor jeder Bestellung nach dem Reifegrad",
];

/** Gemerkte Regeln. Kundenspezifische überstimmen globale. */
export const regelnMeier = [
  { text: "Kein „Sehr geehrter“ — er wird mit „Hallo“ angeschrieben.", art: "kundenspezifisch" },
  { text: "Nie „diesbezüglich“ schreiben.", art: "gilt immer" },
  { text: "Keine Mail über 150 Wörter, außer es geht um Konditionen.", art: "gilt immer" },
];

/** Die eingegangene Kundenmail, wie sie eingefügt wurde. */
export const eingegangeneMail = `Sehr geehrte Frau Brändle,

wir hatten vergangene Woche über die Nachlieferung Bergkäse gesprochen. Können Sie mir sagen, wann die Ware bei uns eintrifft? Wir planen gerade unsere Wochenauslieferung und bräuchten den Termin bis Mittwoch.

Vielen Dank und beste Grüße
Thomas Meier`;

export const ihreStichworte = "Lieferung geht Freitag raus, Spedition wie immer";

/** Fassung A: knapp. Höchstens fünf Sätze. */
export const fassungKnapp = `Hallo Herr Meier,

die Lieferung verlässt unser Haus am Freitag, den [Datum eintragen]. Der Transport läuft wie gewohnt über unsere Spedition.

Bei Ihnen sollte die Ware damit Anfang nächster Woche eintreffen.

Viele Grüße
Sabine Brändle`;

/** Fassung B: ausführlicher. Mit Begründung und einem Satz zum Vorgehen. */
export const fassungAusfuehrlich = `Hallo Herr Meier,

danke für Ihre Nachricht. Die Nachlieferung Bergkäse verlässt unser Haus am Freitag, den [Datum eintragen].

Der Transport läuft wie gewohnt über unsere Spedition, sodass die Ware bei Ihnen voraussichtlich Anfang der kommenden Woche eintrifft — rechtzeitig für Ihre Wochenauslieferung.

Sobald die Sendung abgegangen ist, schicke ich Ihnen die Sendungsnummer.

Viele Grüße
Sabine Brändle`;

/** Englische Fassung für einen Kunden mit Sprache "en". */
export const fassungEnglisch = `Dear Ms de Vries,

thank you for your enquiry. We can supply the mountain cheese in 12 kg wheels at a maturity level of [Reifegrad eintragen] months.

The price is [Preis eintragen] per kilo, ex works. Delivery would take around ten working days from receipt of your order.

Please let me know if you would like samples first.

Kind regards
Sabine Brändle`;

/** Rückübersetzung: wörtlich am englischen Text, nicht schön. */
export const rueckuebersetzung = `Sehr geehrte Frau de Vries,

danke für Ihre Anfrage. Wir können den Bergkäse in 12-kg-Laiben mit einem Reifegrad von [Reifegrad eintragen] Monaten liefern.

Der Preis beträgt [Preis eintragen] pro Kilo, ab Werk. Die Lieferung würde etwa zehn Werktage ab Eingang Ihrer Bestellung dauern.

Sagen Sie mir bitte Bescheid, wenn Sie zuerst Muster möchten.

Viele Grüße
Sabine Brändle`;

/** Fachbegriffe mit verbindlicher Übersetzung. */
export const glossar = [
  { de: "Bergkäse", en: "mountain cheese", bereich: "Käse" },
  { de: "Laib", en: "wheel", bereich: "Käse" },
  { de: "Reifegrad", en: "maturity level", bereich: "Qualität" },
  { de: "Mindesthaltbarkeitsdatum", en: "best before date", bereich: "Qualität" },
  { de: "ab Werk", en: "ex works", bereich: "Export" },
];

/** Was die App vorschlägt und noch bestätigt haben will. */
export const glossarVorschlaege = [
  { de: "Schnittfestigkeit", en: "firmness", bereich: "Qualität" },
  { de: "Rohmilch", en: "raw milk", bereich: "Käse" },
];

export const textbausteine = [
  { name: "Signatur", zweck: "Steht unter jeder Mail" },
  { name: "Bestellbestätigung, Einstieg", zweck: "Erster Absatz bei Aufträgen" },
  { name: "Hinweis auf Zertifikate", zweck: "Wenn nach Nachweisen gefragt wird" },
];

export const dokumente = [
  { name: "Preisliste 2026.pdf", art: "Preisliste", stand: "seit März" },
  { name: "Sortiment Hartkäse.pdf", art: "Sortiment", stand: "seit Januar" },
];

/** Ein abgeleiteter Regelvorschlag, wie er nach einer Korrektur erscheint. */
export const regelVorschlag = {
  beobachtung:
    "Du hast „mit freundlichen Grüßen“ dreimal durch „Viele Grüße“ ersetzt.",
  frage: "Soll ich mir das merken?",
};
