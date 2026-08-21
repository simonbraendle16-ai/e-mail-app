import Link from "next/link";
import { notFound } from "next/navigation";
import { Zurueck } from "@/components/zurueck";
import { Kundenmarke } from "@/components/bausteine/kundenmarke";
import {
  gelerntesUeberMeier,
  kunden,
  letzteMails,
  regelnMeier,
} from "@/lib/beispieldaten";

/**
 * Die Kundenakte (DESIGN.md §5).
 *
 * Sprache, Ansprechpartner, was die App gelernt hat, gemerkte Regeln,
 * letzte Mails. Jeder gelernte Punkt hat ein kleines Kreuz zum Entfernen —
 * was die App über einen Kunden weiß, muss sie jederzeit widerrufen können.
 */

/** Eine Zeile mit Entfernen-Kreuz. Verdrahtet wird das in Phase 9. */
function Punkt({ text, zusatz }: { text: string; zusatz?: string }) {
  return (
    <li className="flex items-start justify-between gap-3 py-3 border-b border-linie">
      <span className="text-m">
        {text}
        {zusatz ? (
          <span className="text-xs text-text-leise"> · {zusatz}</span>
        ) : null}
      </span>
      <button
        type="button"
        aria-label={`„${text}" entfernen`}
        className="text-m text-text-leise hover:text-fehler px-2 rounded-feld shrink-0"
      >
        ✕
      </button>
    </li>
  );
}

function Abschnitt({
  titel,
  leer,
  children,
}: {
  titel: string;
  leer?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="text-s font-semibold text-text-leise mb-3">{titel}</h2>
      {leer ? <p className="text-m text-text-leise">{leer}</p> : children}
    </section>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const kunde = kunden.find((k) => k.id === id);
  return { title: kunde ? kunde.name : "Kunde" };
}

export default async function KundenakteSeite({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const kunde = kunden.find((k) => k.id === id);
  if (!kunde) notFound();

  /* Nur für Meier liegen im Prototyp gelernte Punkte vor — so ist auch
     der Zustand „hier weiß ich noch nichts" zu sehen. */
  const istMeier = kunde.id === "meier";
  const gelerntes = istMeier ? gelerntesUeberMeier : [];
  const regeln = istMeier ? regelnMeier : [];
  const mails = letzteMails.filter((m) => m.kunde === kunde.name);

  return (
    <>
      <main className="max-w-inhalt px-5 py-6">
        <Zurueck nach="/kunden" />

        <h1 className="text-xl font-semibold mb-2">
          <Kundenmarke name={kunde.name} sprache={kunde.sprache} />
        </h1>
        <p className="text-m text-text-leise mb-6">
          {kunde.ansprechpartner} · {kunde.branche} · {kunde.land}
        </p>

        <Abschnitt titel="So schreibt er">
          <p className="text-m">{kunde.tonalitaet}</p>
        </Abschnitt>

        <Abschnitt
          titel="Was ich gelernt habe"
          leer={
            gelerntes.length === 0
              ? "Zu diesem Kunden weiß ich noch nichts. Das kommt mit der Zeit von allein."
              : undefined
          }
        >
          <ul>
            {gelerntes.map((punkt) => (
              <Punkt key={punkt} text={punkt} />
            ))}
          </ul>
        </Abschnitt>

        <Abschnitt
          titel="Gemerkte Regeln"
          leer={
            regeln.length === 0
              ? "Noch keine Regeln. Sie entstehen, wenn du sagst, was nicht passt."
              : undefined
          }
        >
          <ul>
            {regeln.map((regel) => (
              <Punkt key={regel.text} text={regel.text} zusatz={regel.art} />
            ))}
          </ul>
        </Abschnitt>

        <Abschnitt
          titel="Letzte Mails"
          leer={mails.length === 0 ? "Noch keine Mails." : undefined}
        >
          <ul className="flex flex-col">
            {mails.map((mail) => (
              <li key={mail.id}>
                <Link
                  href="/antworten/ergebnis"
                  className="flex items-baseline justify-between gap-4 py-3 border-b border-linie hover:bg-grund-tief transition-colors"
                >
                  <span className="text-m">{mail.thema}</span>
                  <span className="text-xs text-text-leise">{mail.wann}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Abschnitt>
      </main>
    </>
  );
}
