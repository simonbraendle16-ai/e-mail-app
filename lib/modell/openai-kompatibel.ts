import "server-only";
import { kostenBerechnen } from "./preise";
import {
  HttpFehler,
  LeereAntwortFehler,
  mitWiederholung,
  uebersetzeFehler,
} from "./wiederholen";
import type {
  Antwort,
  Auftrag,
  Bruchstueck,
  ModellAnbieter,
  Nachricht,
  Stufe,
  Verbrauch,
} from "./schnittstelle";
import { ModellFehler } from "./schnittstelle";

/**
 * Gemeinsamer Unterbau für Mistral und lokal laufende Modelle.
 *
 * Beide sprechen dieselbe Sprache — die OpenAI-kompatible Schnittstelle. Der
 * Unterschied ist die Adresse, der Schlüssel und die Modellnamen. Deshalb steht
 * die Mechanik einmal hier statt zweimal fast gleich in zwei Dateien; sonst
 * driften die beiden Adapter auseinander, und der lokale wäre genau dann kaputt,
 * wenn man ihn braucht.
 */

export type AnbieterEinstellungen = {
  name: string;
  basisAdresse: string;
  schluessel?: string;
  modelle: Record<Stufe, string>;
  einbettungsModell: string;
  /** Manche lokalen Dienste brauchen deutlich länger. */
  zeitgrenzeMs?: number;
};

/** Unsere Rollennamen in die der Schnittstelle. */
function rolle(n: Nachricht): "system" | "user" | "assistant" {
  if (n.rolle === "system") return "system";
  if (n.rolle === "modell") return "assistant";
  return "user";
}

type Verwendung = {
  prompt_tokens?: number;
  completion_tokens?: number;
  /* Mistral meldet hier, wie viele Eingabe-Token aus dem Zwischenspeicher
     kamen. Ohne diese Zahl rechnet die Kostenanzeige deutlich zu hoch --
     im Versuch waren 272 von 312 Token gecacht. */
  prompt_tokens_details?: { cached_tokens?: number };
};

export class OpenAiKompatiblerAnbieter implements ModellAnbieter {
  readonly name: string;

  constructor(private readonly einst: AnbieterEinstellungen) {
    this.name = einst.name;
  }

  private kopfzeilen(): Record<string, string> {
    const kopf: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.einst.schluessel) {
      kopf.Authorization = `Bearer ${this.einst.schluessel}`;
    }
    return kopf;
  }

  private verbrauch(modell: string, verwendung?: Verwendung): Verbrauch {
    const tokenEin = verwendung?.prompt_tokens ?? 0;
    const tokenAus = verwendung?.completion_tokens ?? 0;
    const gecacht = verwendung?.prompt_tokens_details?.cached_tokens ?? 0;
    return {
      modell,
      tokenEin,
      tokenAus,
      tokenZwischenspeicher: gecacht,
      kostenEur: kostenBerechnen(modell, tokenEin, tokenAus, gecacht),
    };
  }

  private async anfragen(
    pfad: string,
    rumpf: unknown,
    abbruch?: AbortSignal,
  ): Promise<Response> {
    const zeitgrenze = AbortSignal.timeout(this.einst.zeitgrenzeMs ?? 120_000);
    const signal = abbruch
      ? AbortSignal.any([abbruch, zeitgrenze])
      : zeitgrenze;

    const antwort = await fetch(`${this.einst.basisAdresse}${pfad}`, {
      method: "POST",
      headers: this.kopfzeilen(),
      body: JSON.stringify(rumpf),
      signal,
    });

    if (!antwort.ok) {
      const text = await antwort.text().catch(() => "");
      const wartezeit = antwort.headers.get("retry-after");
      throw new HttpFehler(
        antwort.status,
        text,
        wartezeit ? Number(wartezeit) : undefined,
      );
    }

    return antwort;
  }

  /**
   * Baut den Anfragerumpf. Einmal, weil Streaming und Nicht-Streaming sich
   * nur in einem Feld unterscheiden -- zweimal fast gleich wuerde bedeuten,
   * dass eine Aenderung irgendwann nur an einer Stelle ankommt.
   */
  private rumpfBauen(auftrag: Auftrag, modell: string, stroemend: boolean) {
    const rumpf: Record<string, unknown> = {
      model: modell,
      messages: auftrag.nachrichten.map((n) => ({
        role: rolle(n),
        content: n.inhalt,
      })),
      max_tokens: auftrag.hoechstlaenge ?? 4096,
      temperature: auftrag.streuung ?? 0.3,
      stream: stroemend,
    };

    /* Prompt-Caching (MODELL.md 7): rund 90 % Nachlass auf Eingabe-Token, die
       Mistral aus einem zwischengespeicherten Praefix wiederverwenden kann.
       Muss angefordert werden, passiert nicht von allein. Der Schluessel wird
       nur mitgeschickt, wenn die aufrufende Stelle einen nennt -- ein geratener
       Schluessel waere schlimmer als keiner, weil er Aufrufe zusammenwirft,
       deren Praefix gar nicht gleich ist. */
    if (auftrag.zwischenspeicherSchluessel) {
      rumpf.prompt_cache_key = auftrag.zwischenspeicherSchluessel;
    }

    return rumpf;
  }

  /** Ein Aufruf, der auf die vollständige Antwort wartet. */
  private async einmal(auftrag: Auftrag): Promise<Antwort> {
    const modell = this.einst.modelle[auftrag.stufe];

    return mitWiederholung(async () => {
      const antwort = await this.anfragen(
        "/chat/completions",
        this.rumpfBauen(auftrag, modell, false),
        auftrag.abbruch,
      );

      const daten = (await antwort.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: Verwendung;
      };

      const text = daten.choices?.[0]?.message?.content ?? "";
      if (!text.trim()) {
        /* MODELL.md §5: leere Antwort -> ein Neuversuch, dann ehrliche
           Meldung. Der Wurf hier löst genau diesen Neuversuch aus. */
        throw new LeereAntwortFehler("Die Antwort war leer.");
      }

      return { text, verbrauch: this.verbrauch(modell, daten.usage) };
    }, auftrag.abbruch);
  }

  async *formulieren(
    auftrag: Auftrag,
  ): AsyncGenerator<Bruchstueck, void, unknown> {
    const modell = this.einst.modelle[auftrag.stufe];

    /* Beim Streamen wird bewusst NICHT wiederholt: Sobald das erste Wort auf
       ihrem Bildschirm steht, wäre ein Neuanfang schlimmer als ein Abbruch --
       der Text spränge vor ihren Augen um. Fehler vor dem ersten Wort fängt
       die Fehlerübersetzung unten ab. */
    let antwort: Response;
    try {
      antwort = await this.anfragen(
        "/chat/completions",
        this.rumpfBauen(auftrag, modell, true),
        auftrag.abbruch,
      );
    } catch (fehler) {
      throw uebersetzeFehler(fehler);
    }

    const leser = antwort.body?.getReader();
    if (!leser) {
      throw new ModellFehler(
        "Die Verbindung klemmt gerade. Dein Text ist gespeichert, probier es in einer Minute nochmal.",
        "Antwort ohne Rumpf",
      );
    }

    const entschluessler = new TextDecoder();
    let rest = "";
    let gesamt = "";
    let verwendung: Verwendung | undefined;

    try {
      while (true) {
        const { done, value } = await leser.read();
        if (done) break;

        rest += entschluessler.decode(value, { stream: true });

        /* Server-Sent Events: Ereignisse sind durch Leerzeilen getrennt,
           ein unvollständiges bleibt für die nächste Runde liegen. */
        const zeilen = rest.split("\n");
        rest = zeilen.pop() ?? "";

        for (const zeile of zeilen) {
          const sauber = zeile.trim();
          if (!sauber.startsWith("data:")) continue;

          const nutzlast = sauber.slice(5).trim();
          if (nutzlast === "[DONE]") continue;

          try {
            const teil = JSON.parse(nutzlast) as {
              choices?: { delta?: { content?: string } }[];
              usage?: Verwendung;
            };
            if (teil.usage) verwendung = teil.usage;

            const stueck = teil.choices?.[0]?.delta?.content;
            if (stueck) {
              gesamt += stueck;
              yield { art: "text", text: stueck };
            }
          } catch {
            /* Ein unlesbares Ereignis ist kein Grund, den ganzen Text
               wegzuwerfen -- weiterlesen. */
          }
        }
      }
    } finally {
      await leser.cancel().catch(() => {});
    }

    if (!gesamt.trim()) {
      throw new ModellFehler(
        "Da kam nichts zurück. Probier es nochmal.",
        "Leerer Strom",
      );
    }

    yield {
      art: "fertig",
      antwort: { text: gesamt, verbrauch: this.verbrauch(modell, verwendung) },
    };
  }

  async uebersetzen(auftrag: Auftrag): Promise<Antwort> {
    return this.einmal(auftrag);
  }

  async einordnen(auftrag: Auftrag): Promise<Antwort> {
    return this.einmal(auftrag);
  }

  async einbetten(
    texte: string[],
    abbruch?: AbortSignal,
  ): Promise<{ vektoren: number[][]; verbrauch: Verbrauch }> {
    const modell = this.einst.einbettungsModell;

    return mitWiederholung(async () => {
      const antwort = await this.anfragen(
        "/embeddings",
        { model: modell, input: texte },
        abbruch,
      );

      const daten = (await antwort.json()) as {
        data?: { embedding: number[]; index: number }[];
        usage?: Verwendung;
      };

      /* Nach Index sortieren: Die Reihenfolge der Antwort ist nicht
         garantiert, und ein vertauschter Vektor ordnet einen Abschnitt
         dauerhaft dem falschen Text zu -- ein Fehler, der nie auffällt. */
      const sortiert = [...(daten.data ?? [])].sort((a, b) => a.index - b.index);

      if (sortiert.length !== texte.length) {
        throw new HttpFehler(
          502,
          `${texte.length} Texte geschickt, ${sortiert.length} Vektoren zurück.`,
        );
      }

      return {
        vektoren: sortiert.map((e) => e.embedding),
        verbrauch: this.verbrauch(modell, daten.usage),
      };
    }, abbruch);
  }
}
