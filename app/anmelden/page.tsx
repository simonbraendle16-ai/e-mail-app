import { Hinweisstreifen } from "@/components/bausteine/hinweisstreifen";
import { fehltFuerAnmeldung } from "@/lib/umgebung";
import { Anmeldeformular } from "./formular";

export const metadata = { title: "Anmelden" };

/* Was schiefgehen kann, wenn sie auf den Link klickt — in ihren Worten. */
const HINWEISE: Record<string, string> = {
  "link-abgelaufen":
    "Der Link ist nicht mehr gültig. Fordere unten einfach einen neuen an.",
  "link-unvollstaendig":
    "Mit dem Link stimmte etwas nicht. Fordere unten einfach einen neuen an.",
};

export default async function AnmeldeSeite({
  searchParams,
}: {
  searchParams: Promise<{ hinweis?: string }>;
}) {
  const { hinweis } = await searchParams;
  const hinweisText = hinweis ? HINWEISE[hinweis] : undefined;
  const fehlt = fehltFuerAnmeldung();

  return (
    <main className="mx-auto max-w-inhalt px-4 py-8">
      <h1 className="text-2xl font-semibold mb-2">Willkommen.</h1>
      <p className="text-m text-text-leise mb-6">
        Dein Werkzeug fürs Schreiben.
      </p>

      {fehlt.length > 0 ? (
        <div className="flex flex-col gap-3">
          <Hinweisstreifen>
            Die App ist noch nicht mit der Datenbank verbunden. Das muss einmalig
            eingerichtet werden — danach ist hier nur noch die Anmeldung.
          </Hinweisstreifen>
          {/* Diese Liste sieht nur der User beim Einrichten, nie die Nutzerin. */}
          <ul className="text-s text-text-leise list-disc pl-4">
            {fehlt.map((eintrag) => (
              <li key={eintrag.name}>
                <code>{eintrag.name}</code> — {eintrag.zweck}
              </li>
            ))}
          </ul>
          <p className="text-s text-text-leise">
            Die Werte gehören in <code>.env.local</code>. Die Klickfolge steht in{" "}
            <code>SUPABASE-SETUP.md</code>.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {hinweisText ? (
            <Hinweisstreifen>{hinweisText}</Hinweisstreifen>
          ) : null}
          <Anmeldeformular />
        </div>
      )}
    </main>
  );
}
