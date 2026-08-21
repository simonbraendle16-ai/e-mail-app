import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { faelligeVerdichten } from "@/lib/verdichtung/verdichten";

/**
 * Stößt die 100-Tage-Verdichtung an (`CLAUDE.md` §4).
 *
 * **Warum eine Route und kein eigenes Skript:** Die Verdichtung braucht einen
 * Modellaufruf und die Pseudonymisierung — beides steckt in der App. Ein
 * zweites Programm daneben hätte dieselbe Logik ein zweites Mal, und
 * spätestens beim nächsten Anbieterwechsel würden die beiden auseinanderlaufen.
 * Der Zeitplan stößt hier also nur an; gedacht wird an einer Stelle.
 *
 * **Warum ein eigenes Geheimnis und keine Anmeldung:** Der Lauf hat keine
 * Nutzerin — er läuft nachts aus einem Zeitplan. Ein Endpunkt ohne jede
 * Prüfung wäre aber offen für jeden, der die Adresse kennt: Er kostet
 * Modellaufrufe und verändert Daten. Deshalb ein Bearer-Token aus der
 * Umgebung, verglichen in konstanter Zeit.
 *
 * Ist `WARTUNG_TOKEN` nicht gesetzt, ist der Endpunkt **zu** — nicht offen.
 * Ein vergessenes Geheimnis darf nie bedeuten, dass die Tür aufsteht.
 */
export async function POST(anfrage: NextRequest) {
  const erwartet = process.env.WARTUNG_TOKEN;

  if (!erwartet) {
    return NextResponse.json(
      { fehler: "Wartung ist nicht eingerichtet." },
      { status: 503 },
    );
  }

  const kopf = anfrage.headers.get("authorization") ?? "";
  const gegeben = kopf.startsWith("Bearer ") ? kopf.slice(7) : "";

  if (!gleich(gegeben, erwartet)) {
    return NextResponse.json({ fehler: "Nicht erlaubt." }, { status: 401 });
  }

  try {
    const bericht = await faelligeVerdichten();

    /* Der Bericht geht ins Protokoll des Zeitplans, nicht an sie. Sie soll von
       der Verdichtung gar nichts merken — sie ist Hausarbeit, kein Ereignis. */
    console.warn("[verdichtung]", JSON.stringify(bericht));

    return NextResponse.json(bericht);
  } catch (fehler) {
    console.error("[verdichtung] gescheitert:", fehler);
    return NextResponse.json(
      { fehler: "Der Lauf ist gescheitert." },
      { status: 500 },
    );
  }
}

/**
 * Vergleich in konstanter Zeit.
 *
 * Ein `===` verrät über die Antwortzeit, wie viele Zeichen am Anfang schon
 * stimmen — damit lässt sich ein Geheimnis Zeichen für Zeichen erraten. Bei
 * einem Endpunkt, der über Monate unbeaufsichtigt erreichbar ist, ist das
 * keine Theorie.
 */
function gleich(a: string, b: string): boolean {
  const einsA = Buffer.from(a);
  const einsB = Buffer.from(b);
  /* Unterschiedliche Längen kann `timingSafeEqual` nicht vergleichen — es
     wirft. Die Länge selbst ist kein nennenswertes Geheimnis. */
  if (einsA.length !== einsB.length) return false;
  return timingSafeEqual(einsA, einsB);
}
