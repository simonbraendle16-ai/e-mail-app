/**
 * Zahlen, Daten und Beträge aus einem Text ziehen und vergleichbar machen.
 *
 * Grundlage der wichtigsten Prüfung des ganzen Projekts (`MODELL.md` §4):
 *
 * > „Jede Zahl, jedes Datum, jeder Betrag im Entwurf muss in Stichworten,
 * > Kundenmail, Akte oder Dokument vorkommen."
 *
 * **Warum das Vergleichen der schwierige Teil ist:** „1.200", „1200" und
 * „1.200,00 €" sind dieselbe Menge, und „12.03.2026", „12.3.26" und
 * „12. März 2026" derselbe Tag. Ein stumpfer Textvergleich würde all das für
 * erfunden halten und sie mit Fehlalarmen zumüllen — nach dem dritten würde
 * sie die Warnungen wegklicken, ohne zu lesen, und dann fängt die Prüfung
 * genau den einen Fall nicht mehr ab, für den sie da ist.
 *
 * Deshalb wird jede Angabe erst auf eine Normalform gebracht und dann
 * verglichen.
 */

/** Was für eine Angabe das ist — nur für den Satz, den sie liest. */
export type Angabenart = "datum" | "uhrzeit" | "zahl";

export type Angabe = {
  art: Angabenart;
  /** Wie es im Text steht — das zeigen wir ihr. */
  wortlaut: string;
  /** Worauf verglichen wird. */
  normal: string;
};

const MONATE: Record<string, number> = {
  januar: 1,
  jänner: 1,
  februar: 2,
  märz: 3,
  maerz: 3,
  april: 4,
  mai: 5,
  juni: 6,
  juli: 7,
  august: 8,
  september: 9,
  oktober: 10,
  november: 11,
  dezember: 12,
};

const MONATSNAMEN = Object.keys(MONATE).join("|");

/**
 * Die Muster laufen in dieser Reihenfolge, und jeder Treffer wird aus dem
 * Text herausgeschnitten, bevor das nächste greift. Sonst zerfiele
 * „12.03.2026" in die drei Zahlen 12, 3 und 2026 — und schon meldet die
 * Prüfung drei erfundene Angaben, wo eine einzige steht.
 */
const MUSTER = [
  /** 12.03.2026 · 12.3.26 · 12.03. */
  {
    art: "datum" as const,
    regex: /\b(\d{1,2})\.\s?(\d{1,2})\.(?:\s?(\d{2,4}))?/g,
    normal: (t: RegExpExecArray) => datumNormal(Number(t[1]), Number(t[2])),
  },
  /** 12. März 2026 · 12. Maerz */
  {
    art: "datum" as const,
    regex: new RegExp(`\\b(\\d{1,2})\\.?\\s+(${MONATSNAMEN})\\b`, "gi"),
    normal: (t: RegExpExecArray) =>
      datumNormal(Number(t[1]), MONATE[(t[2] ?? "").toLowerCase()] ?? 0),
  },
  /** 8:00 · 08:30 Uhr */
  {
    art: "uhrzeit" as const,
    regex: /\b(\d{1,2}):(\d{2})\b/g,
    normal: (t: RegExpExecArray) =>
      `${Number(t[1])}:${(t[2] ?? "").padStart(2, "0")}`,
  },
  /** KW 12 — steht für einen Termin, nicht für eine Menge. */
  {
    art: "datum" as const,
    regex: /\bKW\s?(\d{1,2})\b/gi,
    normal: (t: RegExpExecArray) => `kw${Number(t[1])}`,
  },
  /** 1.200,50 · 1200 · 4,5 · 0.5 */
  {
    art: "zahl" as const,
    regex: /\b\d{1,3}(?:\.\d{3})+(?:,\d+)?\b|\b\d+(?:[.,]\d+)?\b/g,
    normal: (t: RegExpExecArray) => zahlNormal(t[0]),
  },
];

/**
 * Tag und Monat genügen — siehe `angabenBelegt`. Ein unplausibler Wert
 * ergibt bewusst gar keine Angabe: lieber eine Zahl nicht prüfen, als eine
 * unsinnige Normalform in die Vergleichsmenge zu legen.
 */
function datumNormal(tag: number, monat: number): string {
  if (!tag || !monat || tag > 31 || monat > 12) return "";
  return `${tag}.${monat}.`;
}

/**
 * Deutsche Schreibweise auflösen: Punkt vor genau drei Ziffern ist ein
 * Tausendertrenner, sonst ein Dezimalpunkt. Komma ist immer Dezimalkomma.
 */
function zahlNormal(roh: string): string {
  const ohneTausender = roh.replace(/\.(?=\d{3}\b)/g, "");
  const zahl = Number(ohneTausender.replace(",", "."));
  return Number.isFinite(zahl) ? String(zahl) : roh;
}

/**
 * Gliederungsziffern am Zeilenanfang („1." · „2)") sind Aufzählung, keine
 * Angabe. Sie mitzuprüfen erzeugt Fehlalarme in jeder Mail, die eine Liste
 * enthält.
 *
 * **Der Monatsname ist ausgenommen.** „12. März" am Zeilenanfang sieht
 * genauso aus wie ein Aufzählungspunkt, ist aber ein Datum — und ein Datum
 * zu verlieren ist der teurere Fehler von beiden: Es fiele als Beleg aus,
 * und die Prüfung meldete ausgerechnet den richtigen Termin als erfunden.
 */
const GLIEDERUNG = new RegExp(
  `^\\s*\\d{1,2}[.)]\\s+(?!(?:${MONATSNAMEN})\\b)`,
  "gim",
);

function ohneGliederung(text: string): string {
  return text.replace(GLIEDERUNG, " ");
}

/** Zieht alle Angaben aus einem Text. */
export function angabenLesen(text: string): Angabe[] {
  let rest = ohneGliederung(text);
  const gefunden: Angabe[] = [];

  for (const muster of MUSTER) {
    /* Ein globaler Ausdruck merkt sich `lastIndex` zwischen Aufrufen. Da
       `MUSTER` ein Modulwert ist, würde der zweite Aufruf sonst mitten im
       Text anfangen und die ersten Angaben verschlucken. */
    muster.regex.lastIndex = 0;

    const treffer = [...rest.matchAll(muster.regex)];
    for (const t of treffer) {
      const normal = muster.normal(t as RegExpExecArray);
      if (!normal) continue;
      gefunden.push({ art: muster.art, wortlaut: t[0].trim(), normal });
    }

    /* Herausschneiden, damit das nächste Muster den Treffer nicht erneut
       aufgreift. Ersetzt durch Leerzeichen gleicher Länge, damit Wortgrenzen
       erhalten bleiben. */
    rest = rest.replace(muster.regex, (gefundenerText) =>
      " ".repeat(gefundenerText.length),
    );
  }

  return gefunden;
}

/**
 * Welche Angaben aus dem Entwurf in keiner Quelle stehen.
 *
 * **Ein Datum ohne Jahr gilt als belegt, wenn Tag und Monat passen.** Steht
 * in ihren Stichworten „13.03." und schreibt das Modell „13.03.2026", ist das
 * dieselbe Zusage und kein erfundenes Datum. Umgekehrt gilt dasselbe: Das
 * Jahr ist der Teil, den man aus dem Kalender ergänzen kann, Tag und Monat
 * nicht.
 */
export function angabenBelegt(entwurf: string, quellen: string[]): Angabe[] {
  const belegt = new Set<string>();
  for (const quelle of quellen) {
    for (const angabe of angabenLesen(quelle)) belegt.add(angabe.normal);
  }

  const offen: Angabe[] = [];
  const gesehen = new Set<string>();

  for (const angabe of angabenLesen(entwurf)) {
    if (belegt.has(angabe.normal)) continue;
    /* Dieselbe Angabe zweimal in derselben Mail ist ein Befund, nicht zwei. */
    if (gesehen.has(angabe.normal)) continue;
    gesehen.add(angabe.normal);
    offen.push(angabe);
  }

  return offen;
}
