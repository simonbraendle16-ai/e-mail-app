import type { Kontextquelle, Skill, SkillKlasse } from "./typen";

/**
 * Liest eine Skill-Datei.
 *
 * Der Kopf ist bewusst eng definiert — Zeichenketten, Listen, Zahlen, Wahrheits-
 * werte, keine Verschachtelung. Deshalb reicht dieser kleine Leser und es
 * braucht keine YAML-Bibliothek: Ein vollständiger YAML-Leser könnte Dinge, die
 * hier nie vorkommen sollen, und würde bei einem Tippfehler etwas Überraschendes
 * tun statt sich zu beschweren.
 */

export class SkillFehler extends Error {
  constructor(datei: string, grund: string) {
    super(`skills/${datei}: ${grund}`);
    this.name = "SkillFehler";
  }
}

/** Erlaubte Kontextquellen — ein Tippfehler soll auffallen, nicht durchrutschen. */
const QUELLEN: readonly Kontextquelle[] = [
  "kundenakte",
  "letzte_mails",
  "letzte_fassungen",
  "textbausteine",
  "dokumente",
  "preislisten",
  "sortiment",
  "glossar",
  "stilregeln",
];

/** `[a, b, c]` oder `[]` → Liste. */
function listeLesen(roh: string): string[] {
  const innen = roh.trim().replace(/^\[/, "").replace(/\]$/, "").trim();
  if (!innen) return [];
  return innen
    .split(",")
    .map((e) => e.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

export function skillLesen(datei: string, inhalt: string): Skill {
  const treffer = inhalt.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!treffer) {
    throw new SkillFehler(
      datei,
      "Kein Kopf gefunden. Die Datei muss mit --- beginnen und der Kopf mit --- enden.",
    );
  }

  const [, kopfRoh, koerper] = treffer as unknown as [string, string, string];

  const kopf = new Map<string, string>();
  for (const zeile of kopfRoh.split(/\r?\n/)) {
    if (!zeile.trim() || zeile.trimStart().startsWith("#")) continue;
    const doppelpunkt = zeile.indexOf(":");
    if (doppelpunkt === -1) continue;
    kopf.set(
      zeile.slice(0, doppelpunkt).trim(),
      zeile.slice(doppelpunkt + 1).trim(),
    );
  }

  const pflicht = (feld: string): string => {
    const wert = kopf.get(feld);
    if (!wert) throw new SkillFehler(datei, `Feld "${feld}" fehlt im Kopf.`);
    return wert;
  };

  const name = pflicht("name");
  const erwarteterName = datei.replace(/\.md$/, "");
  if (name !== erwarteterName) {
    /* Sonst sucht man den Fehler an der falschen Stelle: Die Datei heißt
       liefertermin.md, der Skill nennt sich anders, und in der Oberfläche
       steht ein Name, den es im Repo nicht gibt. */
    throw new SkillFehler(
      datei,
      `Der Name im Kopf ("${name}") passt nicht zum Dateinamen ("${erwarteterName}").`,
    );
  }

  const klasse = pflicht("klasse");
  if (klasse !== "fach" && klasse !== "system") {
    throw new SkillFehler(datei, `klasse muss "fach" oder "system" sein.`);
  }

  const modell = pflicht("modell");
  if (modell !== "klein" && modell !== "gross") {
    throw new SkillFehler(datei, `modell muss "klein" oder "gross" sein.`);
  }

  const kontext = listeLesen(kopf.get("kontext") ?? "[]");
  for (const quelle of kontext) {
    if (!QUELLEN.includes(quelle as Kontextquelle)) {
      throw new SkillFehler(
        datei,
        `Unbekannte Kontextquelle "${quelle}". Erlaubt: ${QUELLEN.join(", ")}.`,
      );
    }
  }

  const streuungRoh = kopf.get("streuung");
  const streuung = streuungRoh ? Number(streuungRoh) : undefined;
  if (streuung !== undefined && !Number.isFinite(streuung)) {
    throw new SkillFehler(datei, `streuung ist keine Zahl: "${streuungRoh}".`);
  }

  const anweisung = koerper.trim();
  if (!anweisung) {
    throw new SkillFehler(datei, "Die Anweisung unter dem Kopf ist leer.");
  }

  return {
    name,
    klasse: klasse as SkillKlasse,
    signalwoerter: listeLesen(kopf.get("signalwoerter") ?? "[]"),
    kontext: kontext as Kontextquelle[],
    modell,
    laeuft: kopf.get("laeuft"),
    rueckfallebene: kopf.get("rueckfallebene") === "true",
    streuung,
    anweisung,
    kurzbeschreibung: kurzbeschreibungLesen(anweisung),
  };
}

/**
 * Der erste Satz unter „## Zweck".
 *
 * Geht in den Einordnungsschritt: Das Modell bekommt nur die Kurzbeschreibungen
 * der vorausgewählten Skills, nicht deren vollen Text. Ein Einordnungsaufruf
 * mit acht vollständigen Anweisungen wäre teurer als das Formulieren selbst.
 */
function kurzbeschreibungLesen(anweisung: string): string {
  const zweck = anweisung.match(/##\s*Zweck\s*\r?\n+([\s\S]*?)(?=\r?\n##|$)/);
  if (!zweck?.[1]) return "";

  return zweck[1]
    .trim()
    .split(/\r?\n\r?\n/)[0]!
    .replace(/\s+/g, " ")
    .trim();
}
