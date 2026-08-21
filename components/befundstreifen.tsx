import { Hinweisstreifen } from "@/components/bausteine/hinweisstreifen";
import type { Befund } from "@/lib/pruefungen/typen";

/**
 * Zeigt, was die maschinellen Prüfungen gefunden haben (`MODELL.md` §4).
 *
 * **Die Abstufung ist die eigentliche Arbeit hier.** Würde jeder Befund
 * gleich aussehen, wäre die wichtigste Meldung des Projekts — „diese Zahl
 * stand nirgends" — optisch dasselbe wie „die Mail ist lang geworden". Nach
 * der dritten gleichförmigen Warnung liest sie keine mehr, und genau dann
 * rutscht der falsche Preis durch.
 *
 * Deshalb: Nur die Befunde, die eine Angabe betreffen, bekommen den
 * Fehlerton. Alles andere ist ein ruhiger Hinweis.
 */
export function Befundstreifen({ befunde }: { befunde: Befund[] }) {
  if (befunde.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {befunde.map((befund) => (
        <Hinweisstreifen
          key={`${befund.art}-${befund.stellen.join("|")}`}
          art={befund.folge === "markieren" ? "fehler" : "hinweis"}
        >
          {befund.text}
        </Hinweisstreifen>
      ))}
    </div>
  );
}

/**
 * Die Stellen, die in der Mail selbst hervorgehoben werden sollen — Zahlen
 * und Daten ohne Beleg, übriggebliebene Pseudonyme.
 *
 * Lücken sind **nicht** dabei: Die markiert `Mailtext` schon von sich aus als
 * Aufgabe, und sie sind kein Mangel.
 */
export function ungedeckteStellen(befunde: Befund[]): string[] {
  return befunde
    .filter((b) => b.art === "erfundene-angabe" || b.art === "pseudonym-rest")
    .flatMap((b) => b.stellen);
}
