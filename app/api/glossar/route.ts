import { NextResponse, type NextRequest } from "next/server";
import { angemeldeteNutzerin } from "@/lib/supabase/server";
import { begriffBestaetigen } from "@/lib/db/glossar";

/**
 * „Heißt das bei euch so?" — ein Klick, und der Begriff ist verbindlich.
 *
 * Das ist der einzige Weg, auf dem das Glossar wächst (`CLAUDE.md` §5.4): Ein
 * Glossareintrag ist ein *Paar*, und aus einer einsprachigen Mail lässt sich
 * keins gewinnen. Es gibt weder einen Mailexport noch eine Terminologieliste
 * der Firma. Also entsteht das Glossar im Arbeitsablauf, ein bestätigter
 * Begriff nach dem anderen — und wird danach nie wieder erfragt.
 */
export async function POST(anfrage: NextRequest) {
  const nutzerin = await angemeldeteNutzerin();
  if (!nutzerin) {
    return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
  }

  let angaben: { de?: string; en?: string };

  try {
    angaben = await anfrage.json();
  } catch {
    return NextResponse.json(
      { fehler: "Die Anfrage war nicht lesbar." },
      { status: 400 },
    );
  }

  const de = angaben.de?.trim();
  const en = angaben.en?.trim();

  if (!de || !en) {
    return NextResponse.json(
      { fehler: "Es fehlt ein Begriff." },
      { status: 400 },
    );
  }

  try {
    await begriffBestaetigen(nutzerin.id, de, en);
    return NextResponse.json({ gespeichert: true });
  } catch {
    /* Ein nicht gespeicherter Begriff ist ärgerlich, aber harmlos — beim
       nächsten Mal fragt die App erneut. Sie soll deswegen keine
       Fehlermeldung sehen, die nach einem Datenverlust klingt. */
    return NextResponse.json(
      { fehler: "Das konnte ich gerade nicht merken. Ich frage später nochmal." },
      { status: 200 },
    );
  }
}
