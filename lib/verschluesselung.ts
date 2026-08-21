import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { nurServer } from "@/lib/umgebung";

/**
 * Feldverschlüsselung für Kundenname, Firma und Ansprechpartner.
 *
 * **Verschlüsselt wird in der App, nicht in der Datenbank.** Das ist der
 * Unterschied, auf den es ankommt: Bei pgcrypto müsste der Schlüssel bei jeder
 * Abfrage mitgeschickt werden und stünde damit in Supabases Anfrageprotokollen —
 * also genau dort, wovor die Verschlüsselung schützen soll. Hier sieht Supabase
 * nur Bytes. Entscheidung des Users, Grundsatz „immer der saubere Weg"
 * (CLAUDE.md §4).
 *
 * `server-only` sorgt dafür, dass ein versehentlicher Import aus einer
 * Client-Komponente den Bau abbricht statt den Schlüssel auszuliefern.
 *
 * Verfahren: AES-256-GCM. Der Authentifizierungsanhang deckt auch Manipulation
 * auf, nicht nur Mitlesen — eine veränderte Zeile in der Datenbank fällt beim
 * Entschlüsseln auf, statt still falsche Daten zu liefern.
 */

const ALGORITHMUS = "aes-256-gcm";
const IV_LAENGE = 12; // GCM-Standard
const MARKE = "v1"; // Versionsmarke, damit ein späterer Schlüsselwechsel möglich bleibt

function schluessel(name: string): Buffer {
  const roh = Buffer.from(nurServer(name), "base64");
  if (roh.length !== 32) {
    throw new Error(
      `${name} muss 32 Bytes lang sein (base64). Neu erzeugen mit: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
    );
  }
  return roh;
}

/**
 * Verschlüsselt einen Klartext. Ergebnis ist eine Zeichenkette, die gefahrlos
 * in einer Textspalte liegen kann: `v1:<iv>:<anhang>:<geheimtext>`, alles base64.
 */
export function verschluesseln(klartext: string): string {
  const iv = randomBytes(IV_LAENGE);
  const chiffre = createCipheriv(ALGORITHMUS, schluessel("DATEN_SCHLUESSEL"), iv);
  const geheim = Buffer.concat([
    chiffre.update(klartext, "utf8"),
    chiffre.final(),
  ]);
  const anhang = chiffre.getAuthTag();

  return [
    MARKE,
    iv.toString("base64"),
    anhang.toString("base64"),
    geheim.toString("base64"),
  ].join(":");
}

/**
 * Entschlüsselt, was `verschluesseln` erzeugt hat.
 * Wirft bei Manipulation oder falschem Schlüssel — das ist gewollt:
 * lieber ein Fehler als still falsche Kundendaten in einer Mail.
 */
export function entschluesseln(gespeichert: string): string {
  const teile = gespeichert.split(":");
  if (teile.length !== 4 || teile[0] !== MARKE) {
    throw new Error("Der gespeicherte Wert hat nicht das erwartete Format.");
  }
  const [, ivB64, anhangB64, geheimB64] = teile as [
    string,
    string,
    string,
    string,
  ];

  const entziffer = createDecipheriv(
    ALGORITHMUS,
    schluessel("DATEN_SCHLUESSEL"),
    Buffer.from(ivB64, "base64"),
  );
  entziffer.setAuthTag(Buffer.from(anhangB64, "base64"));

  return Buffer.concat([
    entziffer.update(Buffer.from(geheimB64, "base64")),
    entziffer.final(),
  ]).toString("utf8");
}

/** Entschlüsselt, gibt aber bei Fehlern `null` statt zu werfen. */
export function entschluesselnWennMoeglich(
  gespeichert: string | null,
): string | null {
  if (!gespeichert) return null;
  try {
    return entschluesseln(gespeichert);
  } catch {
    return null;
  }
}

/**
 * Suchwert für ein verschlüsseltes Feld.
 *
 * Der im Kreuzverhör aufgedeckte Haken: Verschlüsselte Spalten sind nicht
 * durchsuchbar — jeder Aufruf erzeugt wegen des zufälligen IV ein anderes
 * Ergebnis. Deshalb liegt neben dem Geheimtext ein HMAC des normalisierten
 * Klartexts. Gleicher Name, gleicher Hash: damit ist exakte Suche möglich.
 *
 * HMAC statt schlichtem SHA: Ohne Schlüssel könnte jeder, der die Datenbank
 * sieht, einen Namen raten, ihn hashen und vergleichen. Der Suchschlüssel
 * verhindert das und liegt getrennt vom Datenschlüssel.
 *
 * Was das nicht kann: Teilwortsuche und Sortierung. Beides muss über die
 * unverschlüsselten Felder laufen oder nach dem Entschlüsseln im Server
 * passieren — bei einer Nutzerin mit einigen hundert Kunden ist das
 * unproblematisch.
 */
export function suchwert(klartext: string): string {
  const normalisiert = klartext
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .normalize("NFKC");

  return createHmac("sha256", schluessel("SUCH_SCHLUESSEL"))
    .update(normalisiert, "utf8")
    .digest("base64");
}

/** Vergleicht zwei Suchwerte ohne Zeitunterschied. */
export function suchwerteGleich(a: string, b: string): boolean {
  const pa = Buffer.from(a, "base64");
  const pb = Buffer.from(b, "base64");
  if (pa.length !== pb.length) return false;
  return timingSafeEqual(pa, pb);
}
