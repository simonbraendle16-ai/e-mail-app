import { beforeAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";

/**
 * Getestet wird, was still kaputtgehen kann (PLAN.md §1).
 *
 * Die Verschlüsselung gehört genau dazu: Ein Fehler hier fällt im Alltag nicht
 * auf — die App läuft weiter, nur liegen die Kundennamen dann im Klartext oder
 * sind unwiederbringlich unlesbar. Beides merkt man erst, wenn es zu spät ist.
 */

// Schlüssel setzen, bevor das Modul geladen wird — es liest sie beim Aufruf.
beforeAll(() => {
  process.env.DATEN_SCHLUESSEL = randomBytes(32).toString("base64");
  process.env.SUCH_SCHLUESSEL = randomBytes(32).toString("base64");
});

const laden = async () => await import("./verschluesselung");

describe("verschluesseln / entschluesseln", () => {
  it("gibt genau zurück, was hineinging", async () => {
    const { verschluesseln, entschluesseln } = await laden();
    const klartext = "Meier & Co. KG";

    expect(entschluesseln(verschluesseln(klartext))).toBe(klartext);
  });

  it("verträgt Umlaute, ß und Sonderzeichen", async () => {
    const { verschluesseln, entschluesseln } = await laden();
    /* Bei einer deutschen Käserei ist das kein Randfall, sondern der Normalfall. */
    const klartext = "Käserei Grüße & Söhne GmbH — Straße 5, Zürich";

    expect(entschluesseln(verschluesseln(klartext))).toBe(klartext);
  });

  it("erzeugt bei gleichem Text zweimal verschiedenen Geheimtext", async () => {
    const { verschluesseln } = await laden();
    /* Sonst könnte jemand mit Datenbankzugriff sehen, welche Zeilen denselben
       Kunden betreffen, ohne den Namen zu kennen. */
    const a = verschluesseln("Meier & Co.");
    const b = verschluesseln("Meier & Co.");

    expect(a).not.toBe(b);
  });

  it("merkt, wenn jemand am Geheimtext manipuliert hat", async () => {
    const { verschluesseln, entschluesseln } = await laden();
    const echt = verschluesseln("Meier & Co.");

    /* Ein Zeichen im Geheimtext verdrehen. Ohne Authentifizierungsanhang
       käme hier still etwas Falsches heraus statt eines Fehlers. */
    const teile = echt.split(":");
    const roh = Buffer.from(teile[3]!, "base64");
    roh[0] = roh[0]! ^ 0xff;
    teile[3] = roh.toString("base64");

    expect(() => entschluesseln(teile.join(":"))).toThrow();
  });

  it("wirft bei kaputtem Format statt still etwas zu liefern", async () => {
    const { entschluesseln } = await laden();

    expect(() => entschluesseln("nur-irgendein-text")).toThrow();
    expect(() => entschluesseln("v2:a:b:c")).toThrow();
  });

  it("liefert null statt zu werfen, wo das gewollt ist", async () => {
    const { entschluesselnWennMoeglich } = await laden();

    expect(entschluesselnWennMoeglich(null)).toBeNull();
    expect(entschluesselnWennMoeglich("kaputt")).toBeNull();
  });
});

describe("suchwert", () => {
  it("ist für denselben Namen immer gleich", async () => {
    const { suchwert } = await laden();
    /* Das ist der ganze Zweck: verschlüsselte Spalten sind nicht durchsuchbar,
       der Suchwert macht exakte Treffer wieder möglich. */
    expect(suchwert("Meier & Co.")).toBe(suchwert("Meier & Co."));
  });

  it("ignoriert Groß-/Kleinschreibung und überflüssige Leerzeichen", async () => {
    const { suchwert } = await laden();
    const erwartet = suchwert("Meier & Co.");

    expect(suchwert("  meier & co.  ")).toBe(erwartet);
    expect(suchwert("MEIER  &   CO.")).toBe(erwartet);
  });

  it("unterscheidet verschiedene Namen", async () => {
    const { suchwert } = await laden();

    expect(suchwert("Meier & Co.")).not.toBe(suchwert("Meyer & Co."));
  });

  it("gibt den Namen nicht preis", async () => {
    const { suchwert } = await laden();
    const wert = suchwert("Meier & Co.");

    /* Wer die Datenbank sieht, soll aus dem Suchwert nichts ablesen können. */
    expect(wert.toLowerCase()).not.toContain("meier");
    expect(wert).not.toContain("Meier");
  });

  it("vergleicht zwei Suchwerte richtig", async () => {
    const { suchwert, suchwerteGleich } = await laden();

    expect(suchwerteGleich(suchwert("Alpenhof"), suchwert("alpenhof"))).toBe(
      true,
    );
    expect(suchwerteGleich(suchwert("Alpenhof"), suchwert("Nordfood"))).toBe(
      false,
    );
  });
});
