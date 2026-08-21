import { notFound } from "next/navigation";
import { Zurueck } from "@/components/zurueck";
import { Kundenmarke } from "@/components/bausteine/kundenmarke";
import { Gelerntes } from "@/components/gelerntes";
import { kundeLaden } from "@/lib/db/kunden";
import { faktenZumKunden } from "@/lib/db/fakten";
import { mailsZumKunden } from "@/lib/db/mails";
import { regelnAlle } from "@/lib/db/regeln";

/**
 * Die Kundenakte (DESIGN.md §5).
 *
 * Sprache, Ansprechpartner, was die App gelernt hat, gemerkte Regeln,
 * letzte Mails. Jeder gelernte Punkt hat ein kleines Kreuz zum Entfernen —
 * was die App über einen Kunden weiß, muss sie jederzeit widerrufen können.
 *
 * Seit Phase 9 stehen hier echte Daten. **Angelegt hat sie nichts davon:**
 * Der Kunde entstand beim Schreiben, die gelernten Punkte kamen nebenbei aus
 * ihren Mails. Nichts hier ist Pflichtfeld — die App funktioniert, auch wenn
 * sie diesen Bildschirm nie öffnet.
 */

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

function alsDatum(wert: string | null): string {
  if (!wert) return "";
  try {
    return new Date(wert).toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
    });
  } catch {
    return "";
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const kunde = await kundeLaden(id).catch(() => null);
  return { title: kunde ? kunde.anzeigename : "Kunde" };
}

export default async function KundenakteSeite({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const kunde = await kundeLaden(id).catch(() => null);
  if (!kunde) notFound();

  /* Jeder Teil einzeln und ausfallsicher: Fehlt einer, fehlt eben ein
     Abschnitt — die Akte öffnet trotzdem. */
  const [fakten, mails, alleRegeln] = await Promise.all([
    faktenZumKunden(kunde.id),
    mailsZumKunden(kunde.id),
    regelnAlle().catch(() => []),
  ]);

  const regeln = alleRegeln.filter(
    (r) => r.kundeId === kunde.id && r.status === "aktiv",
  );

  const beschreibung = [
    kunde.ansprechpartner,
    kunde.branche,
    kunde.land,
  ].filter(Boolean);

  return (
    <>
      <main className="max-w-inhalt px-5 py-6">
        <Zurueck nach="/kunden" />

        <h1 className="text-xl font-semibold mb-2">
          <Kundenmarke
            name={kunde.anzeigename}
            sprache={kunde.sprache === "en" ? "en" : "de"}
          />
        </h1>
        {beschreibung.length > 0 ? (
          <p className="text-m text-text-leise mb-6">
            {beschreibung.join(" · ")}
          </p>
        ) : null}

        {kunde.tonalitaet ? (
          <Abschnitt titel="So schreibt er">
            <p className="text-m">{kunde.tonalitaet}</p>
          </Abschnitt>
        ) : null}

        <Abschnitt titel="Was ich gelernt habe">
          <Gelerntes
            punkte={fakten.map((f) => ({
              id: f.id,
              text: f.text,
              bestaetigt: f.bestaetigt,
            }))}
          />
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
              <li
                key={regel.id}
                className="text-m py-3 border-b border-linie"
              >
                {regel.text}
              </li>
            ))}
          </ul>
        </Abschnitt>

        <Abschnitt
          titel="Letzte Mails"
          leer={mails.length === 0 ? "Noch keine Mails." : undefined}
        >
          <ul className="flex flex-col">
            {mails.map((mail) => (
              <li
                key={mail.id}
                className="flex items-baseline justify-between gap-4 py-3 border-b border-linie"
              >
                <span className="text-m">
                  {mail.betreff ?? mail.ihre_stichworte ?? "Ohne Betreff"}
                </span>
                <span className="text-xs text-text-leise">
                  {alsDatum(mail.erstellt_am)}
                </span>
              </li>
            ))}
          </ul>
        </Abschnitt>
      </main>
    </>
  );
}
