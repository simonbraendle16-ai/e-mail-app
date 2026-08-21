import "server-only";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { verfassen } from "@/lib/verfassen/verfassen";
import { pruefen } from "@/lib/pruefungen/pruefen";
import { kontextSammeln } from "@/lib/verfassen/kontext";
import { rueckfallSkill, skillFinden } from "@/lib/skills/register";
import { glossarLaden } from "@/lib/db/glossar";
import { begriffeImText, glossarAbweichungen } from "@/lib/uebersetzen/glossar";
import { anbieterName } from "@/lib/modell";
import { pruefaelleLaden } from "./pruefsatz";
import {
  rueckschritteFinden,
  urteil,
  type Durchlauf,
  type Fallergebnis,
} from "./vergleich";

/**
 * Lässt den Prüfsatz durchlaufen und vergleicht mit dem letzten Ergebnis
 * (`MODELL.md` §6, Stufe 3).
 *
 * **Läuft nicht in der App, sondern über `npm run rueckschritt`.** Sie soll
 * davon nie etwas sehen — es ist die Absicherung des Users dagegen, dass eine
 * gut gemeinte Änderung an einer Anweisung still alles verschlechtert.
 *
 * Der Durchlauf kostet echte Modellaufrufe, einen pro Fall. Bei dreißig
 * gesammelten Fällen sind das ein paar Cent — verglichen mit dem Schaden
 * einer unbemerkten Verschlechterung ist das nichts.
 */

/** Wo der letzte Durchlauf liegt. Bewusst im Repo, damit er im Diff auftaucht. */
const ABLAGE = "nachweise/rueckschritt-letzter-durchlauf.json";

export type DurchlaufBericht = {
  durchlauf: Durchlauf;
  /** Fehlt beim allerersten Mal — dann gibt es nichts zu vergleichen. */
  urteilstext: string;
  rueckschritte: { mailId: string; text: string }[];
};

export async function pruefsatzDurchlaufen(angaben: {
  nutzerId: string;
  /** Schreibt das Ergebnis als neuen Bezugspunkt fort. */
  festschreiben?: boolean;
}): Promise<DurchlaufBericht> {
  const faelle = await pruefaelleLaden();

  if (faelle.length === 0) {
    return {
      durchlauf: {
        gelaufenAm: new Date().toISOString(),
        modell: anbieterName(),
        ergebnisse: [],
      },
      urteilstext:
        "Noch kein Prüfsatz. Er wächst aus den Mails, die mit Daumen hoch bewertet werden.",
      rueckschritte: [],
    };
  }

  const glossar = await glossarLaden();
  const ergebnisse: Fallergebnis[] = [];

  for (const fall of faelle) {
    let neuerText = "";

    /* Derselbe Weg wie im Alltag — nicht ein nachgebauter. Ein Prüfsatz, der
       etwas anderes durchläuft als die App, misst etwas anderes als die App. */
    for await (const schritt of verfassen({
      nutzerId: angaben.nutzerId,
      eingehenderText: fall.eingehenderText ?? undefined,
      stichworte: fall.stichworte,
      kundeId: fall.kundeId,
      skillName: fall.skill ?? undefined,
    })) {
      if (schritt.art === "fertig") neuerText = schritt.knapp;
      if (schritt.art === "fehler") neuerText = "";
    }

    if (!neuerText) continue;

    const kontext = await kontextSammeln({
      kundeId: fall.kundeId,
      skill: (fall.skill ? skillFinden(fall.skill) : null) ?? rueckfallSkill(),
      suchtext: fall.stichworte,
    }).catch(() => null);

    ergebnisse.push({
      mailId: fall.mailId,
      befunde: pruefen({
        entwurf: neuerText,
        quellen: [
          fall.stichworte,
          fall.eingehenderText ?? "",
          ...(kontext?.fakten ?? []),
          ...(kontext?.bausteine ?? []),
        ].filter((q) => q.trim()),
        regeln: kontext?.regeln ?? [],
      }),
      /* Die Glossarprüfung läuft gegen den deutschen Text: Sie prüft hier
         nicht die Übersetzung, sondern ob dieselben Fachbegriffe wie im
         akzeptierten Ergebnis überhaupt noch vorkommen. */
      glossarLuecken: glossarAbweichungen(
        neuerText,
        begriffeImText(fall.akzeptiert, glossar).map((e) => ({
          ...e,
          en: e.de,
        })),
      ).length,
      woerter: neuerText.trim().split(/\s+/).filter(Boolean).length,
    });
  }

  const durchlauf: Durchlauf = {
    gelaufenAm: new Date().toISOString(),
    modell: anbieterName(),
    ergebnisse,
  };

  const vorher = await letztenLesen();

  const bericht: DurchlaufBericht = vorher
    ? (() => {
        const vergleich = rueckschritteFinden(vorher, durchlauf);
        return {
          durchlauf,
          urteilstext: urteil(vergleich),
          rueckschritte: vergleich.rueckschritte,
        };
      })()
    : {
        durchlauf,
        urteilstext: `Erster Durchlauf mit ${ergebnisse.length} Fällen. Ab jetzt gibt es einen Bezugspunkt.`,
        rueckschritte: [],
      };

  /* Festgeschrieben wird nur, was kein Rückschritt ist. Sonst würde eine
     verschlechterte Fassung zum neuen Maßstab, und die nächste Prüfung
     bescheinigte der Verschlechterung, dass alles in Ordnung sei. */
  if (angaben.festschreiben && bericht.rueckschritte.length === 0) {
    await letztenSchreiben(durchlauf);
  }

  return bericht;
}

async function letztenLesen(): Promise<Durchlauf | null> {
  try {
    return JSON.parse(await readFile(ABLAGE, "utf8")) as Durchlauf;
  } catch {
    return null;
  }
}

async function letztenSchreiben(durchlauf: Durchlauf): Promise<void> {
  await mkdir(dirname(ABLAGE), { recursive: true });
  await writeFile(ABLAGE, JSON.stringify(durchlauf, null, 2), "utf8");
}
