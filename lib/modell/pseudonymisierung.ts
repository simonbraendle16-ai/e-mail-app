import "server-only";

/**
 * Namen ersetzen, bevor etwas an Mistral geht — und zurückersetzen, wenn die
 * Antwort da ist. Beides serverseitig, beides deterministisch.
 *
 * **Ehrlich eingeordnet, wörtlich aus `CLAUDE.md` §4:** Das senkt das Risiko,
 * beseitigt es nicht. „200 Laib Bergkäse für die Filiale in Rotterdam"
 * identifiziert den Kunden für jeden, der die Branche kennt; dazu kommen
 * Adressen, Bestell- und Telefonnummern im Fließtext. Namensersetzung ist eine
 * Schutzschicht, kein Schutzwall. Wer hier mehr verspricht, täuscht.
 *
 * Was diese Datei deshalb *nicht* versucht: den Fließtext nach allem
 * durchsuchen, was ein Mensch sein könnte. Ein Namenserkenner, der zu 90 %
 * trifft, ersetzt in jeder zehnten Mail etwas Falsches — und weckt dabei den
 * Eindruck, es sei alles abgedeckt. Ersetzt wird nur, was die App *sicher
 * weiß*: die Namen aus der Kundenakte.
 */

export type Zuordnung = {
  /** Platzhalter → echter Wert. Nur für die Rückersetzung. */
  readonly tabelle: ReadonlyMap<string, string>;
};

/** Was pseudonymisiert wird. Alles optional — leere Werte werden übersprungen. */
export type Klarnamen = {
  kunde?: string | null;
  firma?: string | null;
  ansprechpartner?: string | null;
  /** Weitere Namen, etwa aus den bestätigten Fakten eines Kunden. */
  weitere?: readonly string[];
  /**
   * **Ihr eigener Name.**
   *
   * In der Gegenprüfung nach `PLAN.md` §8 aufgefallen: Steht in der
   * eingegangenen Mail „Liebe Frau Brändle" und ist der Name der Kundin
   * pseudonymisiert, greift das Modell nach dem einzigen Namen, den es noch
   * sieht — und adressiert die Antwort an *sie selbst*. Die Mail ginge mit
   * falscher Anrede an den Kunden raus.
   *
   * Deshalb wird ihr Name mitpseudonymisiert. Dann steht in der Vorlage kein
   * Name mehr, nach dem das Modell greifen könnte.
   */
  ichSelbst?: string | null;
};

/**
 * Anreden, die vor einem Namen stehen können.
 *
 * Sie werden **nicht** mitersetzt. Grund aus der Gegenprüfung: Ist der ganze
 * Eintrag „Herr Meier" ein Platzhalter, sieht das Modell dort keine Anrede
 * und setzt selbst eine davor — heraus kommt „Hallo Herr Herr Meier".
 * Das trat in drei von vier Fällen auf.
 *
 * Bleibt die Anrede stehen und wird nur „Meier" ersetzt, schreibt das Modell
 * „Hallo Herr [PERSON_1]" und die Rückersetzung ergibt „Hallo Herr Meier".
 */
const ANREDEN = [
  "Herr",
  "Herrn",
  "Frau",
  "Dr.",
  "Prof.",
  "Prof. Dr.",
  "Mr",
  "Mr.",
  "Mrs",
  "Mrs.",
  "Ms",
  "Ms.",
];

/**
 * Trennt eine vorangestellte Anrede ab.
 * „Herr Meier" → „Meier". „Meier & Co." → „Meier & Co." (unverändert).
 */
function ohneAnrede(wert: string): string {
  let rest = wert.trim();
  /* In einer Schleife, weil „Prof. Dr. Meier" zwei Anreden trägt. */
  let gekuerzt = true;
  while (gekuerzt) {
    gekuerzt = false;
    for (const anrede of ANREDEN) {
      const praefix = `${anrede} `;
      if (rest.toLowerCase().startsWith(praefix.toLowerCase())) {
        const kandidat = rest.slice(praefix.length).trim();
        /* Nur kürzen, wenn danach noch ein brauchbarer Name steht. */
        if (kandidat.length >= 2) {
          rest = kandidat;
          gekuerzt = true;
          break;
        }
      }
    }
  }
  return rest;
}

/**
 * Baut die Zuordnungstabelle und ersetzt die Namen im Text.
 *
 * Die Platzhalter sind durchnummeriert (`[KUNDE_1]`), nicht generisch:
 * Kommen zwei Namen vor, muss das Modell sie auseinanderhalten können,
 * sonst schreibt es die Mail an die falsche Person.
 */
export function pseudonymisieren(
  texte: readonly string[],
  namen: Klarnamen,
): { texte: string[]; zuordnung: Zuordnung } {
  const tabelle = new Map<string, string>();

  /* Längere Namen zuerst ersetzen. Sonst zerlegt „Meier" den Eintrag
     „Meier & Co." und übrig bleibt „[KUNDE_1] & Co." — der Firmenname
     stünde dann weiter im Klartext. */
  const eintraege: { wert: string; platzhalter: string }[] = [];
  let kundeNr = 0;
  let personNr = 0;

  const aufnehmen = (
    wert: string | null | undefined,
    art: "KUNDE" | "PERSON" | "ICH",
  ) => {
    if (!wert) return;
    /* Anrede abtrennen — sonst schreibt das Modell „Herr [PERSON_1]" und
       heraus kommt „Herr Herr Meier". */
    const sauber = art === "KUNDE" ? wert.trim() : ohneAnrede(wert);
    if (sauber.length < 2) return; // ein Buchstabe zerschösse den Text
    if (eintraege.some((e) => e.wert === sauber)) return;

    const platzhalter =
      art === "ICH"
        ? "[ICH]"
        : `[${art}_${art === "KUNDE" ? ++kundeNr : ++personNr}]`;

    eintraege.push({ wert: sauber, platzhalter });
  };

  aufnehmen(namen.kunde, "KUNDE");
  aufnehmen(namen.firma, "KUNDE");
  aufnehmen(namen.ansprechpartner, "PERSON");
  for (const weiterer of namen.weitere ?? []) aufnehmen(weiterer, "PERSON");
  aufnehmen(namen.ichSelbst, "ICH");

  eintraege.sort((a, b) => b.wert.length - a.wert.length);

  const ersetzt = texte.map((text) => {
    let ergebnis = text;
    for (const { wert, platzhalter } of eintraege) {
      ergebnis = ergebnis.split(wert).join(platzhalter);
      /* Auch die kleingeschriebene Form: in „hallo herr meier" steht der
         Name genauso, nur anders geschrieben. */
      const klein = wert.toLowerCase();
      if (klein !== wert) ergebnis = ergebnis.split(klein).join(platzhalter);
    }
    return ergebnis;
  });

  for (const { wert, platzhalter } of eintraege) tabelle.set(platzhalter, wert);

  return { texte: ersetzt, zuordnung: { tabelle } };
}

/**
 * Setzt die echten Namen wieder ein.
 *
 * Läuft im Server, nachdem die Antwort da ist — der Klartext erreicht Mistral
 * also zu keinem Zeitpunkt.
 */
export function zurueckersetzen(text: string, zuordnung: Zuordnung): string {
  let ergebnis = text;
  for (const [platzhalter, wert] of zuordnung.tabelle) {
    ergebnis = ergebnis.split(platzhalter).join(wert);
  }
  return ergebnis;
}

/**
 * Findet Platzhalter, die nach der Rückersetzung übrig geblieben sind.
 *
 * Das passiert, wenn das Modell einen Platzhalter erfindet (`[KUNDE_3]`, wo es
 * nur zwei gibt) oder ihn verstümmelt. Bliebe das unbemerkt, stünde in der
 * fertigen Mail an den Kunden „Sehr geehrter [KUNDE_2]" — der peinlichste
 * mögliche Fehler dieser App.
 */
export function uebrigePlatzhalter(text: string): string[] {
  const treffer = text.match(/\[(?:KUNDE|PERSON)_\d+\]|\[ICH\]/g);
  return treffer ? [...new Set(treffer)] : [];
}
