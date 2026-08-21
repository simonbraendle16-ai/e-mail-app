import { Hinweisstreifen } from "@/components/bausteine/hinweisstreifen";
import { anbieterName } from "@/lib/modell";
import { monatsuebersicht } from "@/lib/modell/kosten";

export const metadata = { title: "Kosten" };

/**
 * Kostenübersicht (`MODELL.md` §7).
 *
 * Dieser Bildschirm ist **für den User**, nicht für sie — er steht deshalb
 * nicht unter den fünf Bildschirmen in `DESIGN.md` §5. Sie soll sich um
 * Kosten nicht kümmern müssen; das wäre genau der „Klotz am Bein", gegen den
 * die ganze App gebaut ist.
 *
 * Er hält sich trotzdem ans Designsystem: Sie könnte hier landen, und dann
 * soll nichts nach Baustelle aussehen.
 */

function euro(betrag: number): string {
  return betrag.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

function zahl(wert: number): string {
  return wert.toLocaleString("de-DE");
}

export default async function KostenSeite() {
  let uebersicht;
  try {
    uebersicht = await monatsuebersicht();
  } catch {
    return (
      <main className="max-w-inhalt px-5 py-6">
        <h1 className="text-xl font-semibold mb-5">Kosten</h1>
        <Hinweisstreifen>
          Die Zahlen sind gerade nicht abrufbar. Probier es in einer Minute
          nochmal.
        </Hinweisstreifen>
      </main>
    );
  }

  const monat = new Date().toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="max-w-inhalt px-5 py-6">
      <h1 className="text-xl font-semibold mb-2">Kosten</h1>
      <p className="text-m text-text-leise mb-6">{monat}</p>

      {uebersicht.ueberSchwelle ? (
        <div className="mb-6">
          <Hinweisstreifen art="fehler">
            Über der Warnschwelle von {euro(uebersicht.schwelleEur)}. Schau
            nach, ob das erwartbar war.
          </Hinweisstreifen>
        </div>
      ) : null}

      <div className="bg-papier rounded-karte shadow-papier px-5 py-5 mb-6">
        <p className="text-s text-text-leise mb-2">Bisher diesen Monat</p>
        <p className="text-2xl font-semibold">{euro(uebersicht.kostenEur)}</p>
        <p className="text-s text-text-leise mt-2">
          von {euro(uebersicht.schwelleEur)} Warnschwelle
        </p>
      </div>

      <dl className="flex flex-col">
        {[
          ["Aufrufe", zahl(uebersicht.aufrufe)],
          ["Token hinein", zahl(uebersicht.tokenEin)],
          ["Token heraus", zahl(uebersicht.tokenAus)],
          ["Anbieter", anbieterName()],
        ].map(([was, wert]) => (
          <div
            key={was}
            className="flex items-baseline justify-between gap-4 py-3 border-b border-linie"
          >
            <dt className="text-m text-text-leise">{was}</dt>
            <dd className="text-m">{wert}</dd>
          </div>
        ))}
      </dl>

      <p className="text-s text-text-leise mt-5">
        Geschätzt aus den gezählten Token. Die verbindliche Zahl steht auf der
        Rechnung.
      </p>
    </main>
  );
}
