import { angemeldeteNutzerin } from "@/lib/supabase/server";

/**
 * Startseite — Phase 0.
 *
 * Hier steht bewusst noch fast nichts: Phase 0 weist nur nach, dass die App
 * unter einer Adresse läuft und die Anmeldung greift. Der eigentliche
 * Start-Bildschirm aus DESIGN.md §5 entsteht in Phase 1 und wird vor dem
 * Weiterbauen freigegeben.
 */
export default async function StartSeite() {
  const nutzerin = await angemeldeteNutzerin();

  return (
    <main className="mx-auto max-w-seite px-4 py-8">
      <h1 className="text-2xl font-semibold mb-3">Guten Tag.</h1>

      <p className="text-m text-text-leise mb-6">
        Das Fundament steht. Die Bildschirme kommen als Nächstes.
      </p>

      {nutzerin ? (
        <form action="/abmelden" method="post">
          <button
            type="submit"
            className="font-ui text-m font-semibold text-gruen hover:underline"
          >
            Abmelden
          </button>
        </form>
      ) : null}
    </main>
  );
}
