# Modell-Anweisungen & Qualitätssicherung

> Stand: 2026-08-21 · Verbindliche Spezifikation. Gehört zu `CLAUDE.md`, `SKILLS.md`, `PLAN.md`.

Dieses Dokument legt fest, **was das Modell genau gesagt bekommt** und **wie geprüft wird, dass
etwas Brauchbares herauskommt**. Ohne beides ist „schreibt gute Mails" eine Behauptung.

---

## 1. Modellzuordnung

> **In Phase 3 gegen die laufende API geprüft.** Die Namen unten sind Gattungsnamen;
> die tatsächlichen Kennungen lauten:
>
> | Hier genannt | Tatsächliche Kennung |
> |---|---|
> | Large 3 | `mistral-large-2512` |
> | ~~Small 3.1~~ → **Small 4** | `mistral-small-2603` |
> | mistral-embed | `mistral-embed-2312` (1024 Dimensionen, passt zu `vector(1024)`) |
> | Mistral OCR | `mistral-ocr-2512` |
>
> **Small 3.1 führt Mistral inzwischen als veraltet** — an seiner Stelle steht Small 4.
> Überall unten, wo "Small 3.1" steht, ist die kleine Stufe gemeint.
>
> Bewusst feste Versionen statt `-latest`: Sonst änderte sich das Modell still unter der
> App weg, und die Rückschrittsprüfung aus §6 könnte gar nicht greifen — die setzt voraus,
> dass ein Modellwechsel überhaupt bemerkt wird. Die Namen sind über Umgebungsvariablen
> überschreibbar (`lib/modell/anbieter.ts`).

| Aufgabe | Modell | Warum |
|---|---|---|
| Eingegangene Mail einordnen | Small 3.1 | Klassifikation, keine Sprachkunst nötig |
| Kunde erkennen | Small 3.1 | Namensabgleich mit Bestand |
| Deutsche Mail formulieren | **Large 3** | Das ist das Produkt |
| Ins Englische übertragen | **Large 3** | Fachsprache, Register, Sinnübertragung |
| Zurück ins Deutsche (Kontrolle) | Small 3.1 | Wörtliche Rückübertragung, keine Sprachkunst |
| Terminologie nachkontrollieren | Small 3.1 | Abgleich gegen eine Liste |
| Regel aus Bearbeitung ableiten | Small 3.1 | Kurzer Text, klare Frage |
| Fakten über Kunden extrahieren | Small 3.1 | Läuft im Hintergrund, Menge zählt mehr als Finesse |
| Dokumente einlesen | Mistral OCR | Eigenes Modell für Papier und PDF |
| Einbettungen | mistral-embed | 1024 Dimensionen |

Zwei von neun Aufgaben brauchen das teure Modell. Diese Aufteilung ist die eigentliche
Kostensteuerung — nicht das Sparen an Kontext, denn zu wenig Kontext kostet Qualität.

---

## 2. Aufbau jeder Anweisung

Jeder Aufruf zum Formulieren besteht aus fünf Blöcken, immer in dieser Reihenfolge.
Die Reihenfolge ist nicht beliebig: Was später steht, wiegt schwerer, deshalb stehen
kundenspezifische Regeln hinter globalen.

```
1  Rolle und Grundhaltung          (fest, ändert sich nie)
2  Stilprofil                      (global, wächst mit ihren Regeln)
3  Skill-Anweisung                 (aus SKILLS.md, je nach Mailtyp)
4  Kundenkontext                   (Akte, Fakten, Beispiele — pseudonymisiert)
5  Regeln                          (global, dann kundenspezifisch — als harte Vorgaben)
```

### Block 1 — Rolle und Grundhaltung (unveränderlich)

```
Du schreibst geschäftliche E-Mails für die Kundenbetreuung einer deutschen Käserei.
Du schreibst sie fertig, so dass sie ohne Änderung abgeschickt werden können.

Grundhaltung:
- Du schreibst, wie ein erfahrener Mensch im Büro schreibt: klar, freundlich, ohne Floskeln.
- Kurze Sätze. Ein Gedanke pro Satz.
- Keine Werbesprache, keine Superlative, keine Ausrufezeichen.
- Keine Höflichkeitsschleifen ("Wir möchten uns herzlich dafür bedanken, dass Sie sich die
  Zeit genommen haben") — ein Dank reicht, und zwar in einem Satz.
- Du erfindest nichts. Keine Zahlen, keine Termine, keine Zusagen, die nicht in den
  Angaben stehen. Fehlt etwas, schreibst du eine Lücke in eckigen Klammern: [Preis eintragen].
- Du kommentierst deine eigene Arbeit nicht. Du lieferst die Mail, sonst nichts.
```

Der letzte Punkt ist wichtiger, als er aussieht: Ohne ihn liefern Modelle gern „Hier ist Ihre
E-Mail:" mit Nachbemerkungen, und sie müsste das jedes Mal wegräumen.

### Block 2 — Stilprofil

Startfassung, wird durch gelernte Regeln ergänzt:

```
Ihr Schreibstil:
- Anrede: "Sehr geehrte Frau X" / "Sehr geehrter Herr X", bei bekannten Kunden "Hallo Herr X"
- Abschluss: "Mit freundlichen Grüßen"
- Sie duzt niemanden im geschäftlichen Kontext.
- Sie kommt nach höchstens zwei Sätzen zum Anliegen.
- Sie verspricht nichts, was sie nicht halten kann — lieber "ich kläre das und melde mich"
  als ein Termin auf Verdacht.
```

Was hier steht, ist eine **Annahme bis zur ersten echten Mail**. Sobald Beispielmaterial vorliegt,
wird dieser Block daraus abgeleitet statt geraten.

### Block 3 — Skill-Anweisung
Wörtlich aus der Skill-Datei (`SKILLS.md`), Abschnitte *Aufbau*, *Regeln*, *Grenzen*.

### Block 4 — Kundenkontext (pseudonymisiert)

```
Kunde: [KUNDE_1], Land: Niederlande, Sprache: Englisch
Ansprechpartner: [PERSON_1]
Was wir über diesen Kunden wissen:
- Bestellt regelmäßig Bergkäse in 12-kg-Laiben
- Möchte Lieferungen immer dienstags
- Reagiert gereizt auf Textbausteine, schreibt selbst sehr knapp

So haben Sie diesem Kunden früher geschrieben:
--- Beispiel 1 ---
[frühere Mail]
```

**Namen verlassen den Server nie im Klartext.** Ersetzung vor dem Aufruf, Rückersetzung nach der
Antwort — beides serverseitig, deterministisch, über eine Zuordnungstabelle pro Anfrage.

### Block 5 — Regeln

```
Nicht verhandelbare Vorgaben. Bei Widerspruch zu allem Vorherigen gilt das hier:
1. Nie "diesbezüglich" schreiben.
2. Keine Mail über 150 Wörter, außer es geht um Konditionen.
3. Für [KUNDE_1]: kein "Sehr geehrte", er wird mit "Hallo" angeschrieben.
```

Nummeriert, kurz, im Imperativ. Kundenspezifische Regeln zuletzt, damit sie globale überstimmen.

---

## 2b. Zwei Fassungen und laufender Text

Ihr Engpass ist Grübelzeit. Deshalb zwei Abweichungen vom naheliegenden Vorgehen:

**Der Text läuft ein.** Die Antwort wird gestreamt und erscheint Wort für Wort. Sie liest bereits,
während formuliert wird — die gefühlte Wartezeit fällt fast weg. Ohne das steht sie 25 Sekunden vor
einem leeren Feld, und genau das Warten füttert die Grübelschleife.

**Es kommen zwei Fassungen**, in einem Aufruf erzeugt:

```
Schreibe zwei Fassungen dieser Mail.

Fassung A: knapp. Nur das Nötige, höchstens fünf Sätze.
Fassung B: ausführlicher. Mit Begründung und einem Satz zum weiteren Vorgehen.

Beide Fassungen halten sich an alle oben genannten Vorgaben.
Trenne sie durch eine Zeile mit ---
Keine Überschriften, keine Erklärungen.
```

Auswählen ist leichter als bewerten. Ein einzelner Vorschlag wird zerdacht, zwei nebeneinander
erzwingen eine Entscheidung — und die getroffene Wahl ist zugleich ein Lernsignal: Wählt sie
dauerhaft die knappe Fassung, wird das zur Stilregel.

## 3. Die Übersetzungsanweisung

```
Übertrage die folgende deutsche Geschäftsmail ins Englische.

Verbindliche Begriffe — genau so, keine Synonyme:
  Bergkäse → mountain cheese
  Laib → wheel
  Reifegrad → maturity level
  Mindesthaltbarkeitsdatum → best before date

Regeln:
- Übertrage den Sinn, nicht die Wortstellung. Löse deutsche Schachtelsätze auf.
- Anrede und Grußformel nach englischer Geschäftskonvention:
  "Dear Mr Miller" / "Kind regards" — nicht die deutsche Formel übersetzt.
- Britisches Englisch, außer der Kunde sitzt in Nordamerika.
- Zahlen, Daten und Mengen bleiben unverändert. Datumsformat an das Land anpassen.
- Keine Erklärungen, keine Anmerkungen. Nur die englische Mail.
```

Die Begriffsliste entsteht durch **exakten Zeichenkettenabgleich** des deutschen Textes gegen das
Glossar, nicht durch Ähnlichkeitssuche. Terminologie darf nicht geraten werden.

---

## 3b. Die Rückübersetzung (Kontrollanweisung)

```
Übertrage die folgende englische Mail zurück ins Deutsche.

- Übersetze wörtlich, nah am englischen Text. Nicht schön machen, nicht glätten.
- Gib Zusagen genau so wieder, wie sie dort stehen: "können" ist nicht "könnten".
- Übernimm Zahlen, Daten und Mengen unverändert.
- Keine Anmerkungen. Nur der deutsche Text.
```

Das deutsche Original wird **nicht** mitgeschickt. Kennt das Modell den Ausgangstext, gleicht es
unbewusst an und die Kontrolle wird wertlos — sie würde bestätigen, was sie prüfen soll.

Ein Vergleichsschritt prüft anschließend maschinell auf Abweichungen bei Zusagen (können/könnten,
werden/würden), Verneinungen und Zahlen. Nur dort wird hervorgehoben.

## 4. Maschinelle Prüfungen (kein Modell, keine Kosten)

Laufen nach jeder Formulierung, bevor sie das Ergebnis sieht. Das ist die Schicht, die auch dann
noch greift, wenn das Modell einen schlechten Tag hat.

| Prüfung | Was passiert bei Verstoß |
|---|---|
| **Verbotene Formulierung** — jede `avoid`-Regel mit Muster wird per Suchmuster geprüft | Genau ein automatischer Neuversuch mit ausdrücklichem Hinweis. Danach sichtbare Warnung. |
| **Erfundene Zahl** — jede Zahl, jedes Datum, jeder Betrag im Entwurf muss in Stichworten, Kundenmail, Akte oder Dokument vorkommen | Die Stelle wird ihr markiert: „Diese Angabe stand nirgends." Kein stiller Neuversuch — sie muss es sehen. |
| **Glossar eingehalten** — jeder erkannte Begriff muss in der Zielsprache korrekt erscheinen | Gezielte Nachbesserung nur dieser Stelle |
| **Vollständigkeit** — Anrede, Hauptteil, Grußformel vorhanden | Neuversuch |
| **Platzhalter** — `[...]` im Text | Kein Fehler, sondern gewollt: wird farblich hervorgehoben, damit sie es ausfüllt |
| **Länge** — über 250 Wörter ohne Konditionsbezug | Hinweis, keine Änderung |

Die Prüfung auf erfundene Zahlen ist die wichtigste von allen. Ein falscher Preis in einer
Kundenmail ist der einzige Fehler in diesem Projekt, der echten Schaden anrichten kann.

---

## 5. Fehlerverhalten

| Fall | Verhalten |
|---|---|
| Mistral nicht erreichbar | Drei Versuche mit wachsendem Abstand. Danach: „Die Verbindung klemmt gerade. Dein Text ist gespeichert, probier es in einer Minute nochmal." |
| Ratenbegrenzung | Automatisches Warten, sichtbarer Hinweis: „Einen Moment noch." |
| Antwort leer oder unbrauchbar | Ein Neuversuch, dann ehrliche Meldung — kein leerer Bildschirm |
| Datenbank nicht erreichbar | Formulieren geht weiter, ohne Kontext, mit Hinweis. Ihr Text geht nie verloren. |
| Kunde nicht erkannt | Nachfrage statt Rateversuch |

Ihr eingegebener Text wird im Browser zwischengespeichert, bevor irgendein Aufruf startet.
Kein Ausfall darf sie Tipparbeit kosten.

---

## 6. Woran wir Qualität messen

Du und deine Mutter beurteilt die Mails selbst — kein Prüfsatz, der vorab beschafft werden muss.
Damit das trotzdem belastbar wird, sammelt die App die Beurteilung im Vorbeigehen:

**Stufe 1 — Bewertung im Alltag.** Unter jeder Mail Daumen hoch und runter. Ein Daumen runter
fragt zurück: „Was hat nicht gepasst?" Ihre Antwort erzeugt eine Regel (siehe `SKILLS.md` §7).
Ein Klick, kein Formular.

**Stufe 2 — Der Prüfsatz wächst von selbst.** Jede mit Daumen hoch bewertete Mail wird zum
Referenzbeispiel: Ausgangslage, Stichworte, akzeptiertes Ergebnis. Nach ein paar Wochen liegen
zwanzig bis dreißig echte Fälle vor — ohne dass irgendjemand Material zusammensuchen musste.

**Stufe 3 — Rückschrittsprüfung.** Ändere ich später eine Anweisung oder ein Modell, laufen die
gesammelten Fälle erneut durch. Verglichen wird maschinell, nicht nach Geschmack:

- Sind die harten Prüfungen aus §4 weiterhin bestanden?
- Sind alle Glossarbegriffe wieder korrekt?
- Wurde eine aktive Regel verletzt, die vorher eingehalten wurde?
- Weicht die Länge um mehr als 40 % ab?

Wird eine dieser Fragen schlechter beantwortet als beim letzten Durchlauf, gilt die Änderung als
Rückschritt und wird nicht übernommen. Das kostet nichts außer ein paar Modellaufrufen und ist
die Absicherung dagegen, dass eine gut gemeinte Verbesserung still alles verschlechtert.

**Was bewusst nicht gemessen wird:** „Klingt das gut?" durch ein Modell. Das ist genau die Frage,
die deine Mutter besser beantwortet als jede Maschine — und die einzige, auf die es am Ende ankommt.

---

## 7. Kostenkontrolle

- Jeder Aufruf wird protokolliert: Modell, Zweck, Token, geschätzte Kosten
- Ein Bildschirm zeigt dir den laufenden Monat
- Warnschwelle einstellbar, Vorgabe 25 €
- Prompt-Caching für die festen Blöcke 1 bis 3, die sich zwischen Aufrufen kaum ändern
- Kontextzusammenstellung mit festen Obergrenzen (`SKILLS.md` §6), damit ein Kunde mit
  200 Mails nicht plötzlich das Zehnfache kostet

## 8. Wechsel des Anbieters

Alle Modellaufrufe laufen über eine einzige Schnittstelle mit vier Methoden:
`formulieren`, `uebersetzen`, `einordnen`, `einbetten`. Darunter liegen austauschbare Umsetzungen.
Mitgeliefert werden Mistral und ein Adapter für lokal laufende Modelle über die
OpenAI-kompatible Schnittstelle (Ollama, LM Studio).

Der Wechsel ist eine Umgebungsvariable. Auch der Wechsel von deinem Mistral-Konto auf ihr eigenes
ist damit nichts weiter als ein neuer Schlüssel in der Konfiguration.
