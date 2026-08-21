import "server-only";
import { einordnen, uebersetzen as modellUebersetzen } from "@/lib/modell";
import { serverZugang } from "@/lib/supabase/server";
import { kundeLaden } from "@/lib/db/kunden";
import { begriffVorschlagen, glossarLaden } from "@/lib/db/glossar";
import type { Glossareintrag } from "@/lib/db/glossar";
import {
  rueckuebersetzungAnweisung,
  STREUUNG_RUECK,
  uebersetzungAnweisung,
} from "./anweisung";
import {
  begriffeImText,
  glossarAbweichungen,
  nachbesserungHinweis,
  vorgabeZeilen,
  type Glossarabweichung,
} from "./glossar";
import { abweichungenFinden, type Abweichung } from "./abweichung";

/**
 * Übersetzung und Rückübersetzung (`PLAN.md` §3 Schritte 5 bis 7,
 * `MODELL.md` §3 und §3b).
 *
 * **Die Rückübersetzung ist v1, und zwar als Sicherheitsnetz, nicht als
 * Komfort.** Sie braucht die App, *weil* sie das Fach-Englisch nicht sicher
 * beurteilen kann. Damit kann sie das Ergebnis auch nicht prüfen, und die
 * Terminologiekontrolle prüft nur Begriffe, nicht Sinn. Eine falsch
 * übertragene Zusage („we can" statt „we could") rutscht sonst durch.
 */

/** Höchstens drei Nachfragen pro Mail, sonst wird es zur Last (`SKILLS.md`). */
const HOECHSTENS_NACHFRAGEN = 3;

export type Uebersetzungsschritt =
  | { art: "schritt"; text: string }
  | {
      art: "fertig";
      englisch: string;
      rueckuebersetzung: string;
      /** Sinnabweichungen zwischen Original und Rückübersetzung. */
      abweichungen: Abweichung[];
      /** Verbindliche Begriffe, die trotz Nachbesserung fehlen. */
      glossarLuecken: Glossarabweichung[];
      /** „Heißt das bei euch so?" — höchstens drei. */
      nachfragen: Glossarvorschlag[];
    }
  | { art: "fehler"; text: string };

export type Glossarvorschlag = { de: string; en: string };

export type UebersetzenAngaben = {
  nutzerId: string;
  /** Die fertige deutsche Mail. */
  deutsch: string;
  /** Für Sprache, Land und die Zuordnung der Fassung. */
  kundeId?: string | null;
  /** Zum Nachtragen der englischen Fassung. */
  mailId?: string | null;
  abbruch?: AbortSignal;
};

export async function* uebersetzen(
  angaben: UebersetzenAngaben,
): AsyncGenerator<Uebersetzungsschritt> {
  const { nutzerId, deutsch, kundeId, mailId } = angaben;

  if (!deutsch.trim()) {
    yield { art: "fehler", text: "Es gibt noch keinen Text zum Übersetzen." };
    return;
  }

  try {
    /* --- Kundenakte: Sprache und Land --------------------------------- */
    const kunde = kundeId ? await kundeLadenSicher(kundeId) : null;

    const namen = {
      kunde: kunde?.anzeigename,
      firma: kunde?.firma,
      ansprechpartner: kunde?.ansprechpartner,
    };

    /* --- Glossarabgleich (kein Modell) -------------------------------- */
    const glossar = await glossarLaden();
    const treffer = begriffeImText(deutsch, glossar);

    yield { art: "schritt", text: "Ich übertrage die Mail ins Englische." };

    /* --- Übersetzen --------------------------------------------------- */
    const anweisung = uebersetzungAnweisung({
      deutsch,
      vorgaben: vorgabeZeilen(treffer),
      land: kunde?.land,
    });

    let englisch = (
      await modellUebersetzen({
        zweck: "uebersetzen",
        nutzerId,
        nachrichten: anweisung,
        namen,
        abbruch: angaben.abbruch,
      })
    ).text.trim();

    /* --- Terminologie-Nachkontrolle (kein Modell) --------------------- */
    let luecken = glossarAbweichungen(englisch, treffer);
    const hinweis = nachbesserungHinweis(luecken);

    if (hinweis) {
      /* **Genau eine** gezielte Nachbesserung (`SKILLS.md`, Skill
         `uebersetzer`). Der verworfene Text geht als Modellantwort mit,
         damit nur die Begriffe getauscht werden und nicht die ganze Mail
         neu entsteht. */
      yield { art: "schritt", text: "Ein Fachbegriff stimmt noch nicht — ich bessere nach." };

      englisch = (
        await modellUebersetzen({
          zweck: "uebersetzen",
          nutzerId,
          nachrichten: [
            ...anweisung,
            { rolle: "modell", inhalt: englisch },
            { rolle: "nutzer", inhalt: hinweis },
          ],
          namen,
          abbruch: angaben.abbruch,
        })
      ).text.trim();

      luecken = glossarAbweichungen(englisch, treffer);
    }

    /* --- Rückübersetzung als Kontrolle -------------------------------- */
    yield {
      art: "schritt",
      text: "Ich übertrage das Englische zur Kontrolle zurück ins Deutsche.",
    };

    /* Hier geht **nur** der englische Text hinein — das deutsche Original
       bleibt draußen, sonst gliche das Modell an und die Kontrolle wäre
       wertlos (`MODELL.md` §3b). */
    const rueckuebersetzung = (
      await modellUebersetzen({
        zweck: "rueckuebersetzen",
        nutzerId,
        nachrichten: rueckuebersetzungAnweisung(englisch),
        namen,
        streuung: STREUUNG_RUECK,
        abbruch: angaben.abbruch,
      })
    ).text.trim();

    const abweichungen = abweichungenFinden(deutsch, rueckuebersetzung);

    /* --- Glossaraufbau durch Bestätigung ------------------------------ */
    const nachfragen = await nachfragenSammeln({
      nutzerId,
      deutsch,
      englisch,
      bekannt: glossar,
      abbruch: angaben.abbruch,
    });

    await englischNachtragen(mailId, englisch, rueckuebersetzung);

    yield {
      art: "fertig",
      englisch,
      rueckuebersetzung,
      abweichungen,
      glossarLuecken: luecken,
      nachfragen,
    };
  } catch (fehler) {
    const fuerSie =
      fehler instanceof Error && "fuerSie" in fehler
        ? String((fehler as { fuerSie: unknown }).fuerSie)
        : "Die Verbindung klemmt gerade. Deine deutsche Mail ist da, probier die Übersetzung in einer Minute nochmal.";

    yield { art: "fehler", text: fuerSie };
  }
}

/* ------------------------------------------------------------------------ */

/** Ein Ausfall der Akte darf die Übersetzung nicht verhindern. */
async function kundeLadenSicher(id: string) {
  try {
    return await kundeLaden(id);
  } catch {
    return null;
  }
}

/**
 * Sucht die Fachbegriffe heraus, die das Modell gewählt hat, und macht daraus
 * Nachfragen: *„Heißt das bei euch so?"*
 *
 * Ein günstiger Aufruf, kein teurer — es geht um Begriffspaare, nicht um
 * Sprachgefühl. Schlägt er fehl, gibt es diese Mail lang eben keine
 * Nachfragen; das Glossar wächst dann beim nächsten Mal weiter. Der
 * Glossaraufbau darf nie der Grund sein, warum eine Übersetzung scheitert.
 */
async function nachfragenSammeln(angaben: {
  nutzerId: string;
  deutsch: string;
  englisch: string;
  bekannt: Glossareintrag[];
  abbruch?: AbortSignal;
}): Promise<Glossarvorschlag[]> {
  try {
    const antwort = await einordnen({
      zweck: "terminologie-pruefen",
      nutzerId: angaben.nutzerId,
      hoechstlaenge: 300,
      abbruch: angaben.abbruch,
      nachrichten: [
        {
          rolle: "system",
          inhalt: [
            "Du bekommst eine deutsche Geschäftsmail und ihre englische Übersetzung.",
            `Nenne höchstens ${HOECHSTENS_NACHFRAGEN} Fachbegriffe aus dem Käse-, Lebensmittel-, Export- oder Qualitätsbereich, die in beiden Texten vorkommen.`,
            "Keine Allerweltswörter, keine Namen, keine Zahlen, keine Grußformeln.",
            "Antworte ausschließlich mit Zeilen der Form: deutsch = englisch",
            "Gibt es keinen solchen Begriff, antworte mit einem Bindestrich.",
          ].join("\n"),
        },
        {
          rolle: "nutzer",
          inhalt: `Deutsch:\n${angaben.deutsch}\n\nEnglisch:\n${angaben.englisch}`,
        },
      ],
    });

    const bekannt = new Set(angaben.bekannt.map((e) => e.de.toLowerCase()));

    const vorschlaege = antwort.text
      .split("\n")
      .map((zeile) => zeile.replace(/^[-*\d.\s]+/, "").trim())
      .filter((zeile) => zeile.includes("="))
      .map((zeile) => {
        const [de = "", en = ""] = zeile.split("=");
        return { de: de.trim(), en: en.trim() };
      })
      .filter((v) => v.de && v.en && !bekannt.has(v.de.toLowerCase()))
      .slice(0, HOECHSTENS_NACHFRAGEN);

    /* Als Vorschlag ablegen, aber **nicht** verbindlich. Was sie nicht
       bestätigt hat, wird dem Modell nie als unverhandelbar vorgeschrieben. */
    for (const vorschlag of vorschlaege) {
      await begriffVorschlagen(angaben.nutzerId, vorschlag.de, vorschlag.en);
    }

    return vorschlaege;
  } catch {
    return [];
  }
}

/**
 * Trägt die englische Fassung an der Mail nach.
 *
 * Die Rückübersetzung wird **nicht** gespeichert: Sie ist Kontrollmittel, nie
 * Ergebnis (`SKILLS.md`, Skill `rueckuebersetzung`). Gespeichert wäre sie ein
 * dritter Text, den irgendwann jemand für eine Fassung hält.
 */
async function englischNachtragen(
  mailId: string | null | undefined,
  englisch: string,
  _rueckuebersetzung: string,
): Promise<void> {
  if (!mailId) return;

  try {
    const zugang = await serverZugang();
    await zugang.from("emails").update({ text_en: englisch }).eq("id", mailId);
  } catch {
    /* Der Text steht auf ihrem Bildschirm — das ist der Teil, der zählt. */
  }
}
