# Skills — Fähigkeiten der App

> Stand: 2026-08-21 · Verbindliche Spezifikation. Gehört zu `CLAUDE.md` und `PLAN.md`.

Ein Skill ist ein benannter Anweisungsbaustein mit eigenen Signalwörtern, eigenem Kontextbedarf
und eigenem Ausgabeformat. Skills liegen als Dateien im Repo unter `skills/<name>.md` und werden
beim Start eingelesen — Änderungen brauchen keinen Codeeingriff.

Es gibt zwei Klassen:

- **Fach-Skills** — was für eine Art Mail ist das? Bestimmen Aufbau, Tonfall, Pflichtangaben.
- **System-Skills** — Fähigkeiten, die quer zu jeder Mail laufen: Übersetzen, Wissen holen, Lernen.

---

## Aufbau einer Skill-Datei

```markdown
---
name: liefertermin
klasse: fach
signalwoerter: [Liefertermin, Lieferung, Termin, wann kommt, Verzögerung, verspätet, Versand]
kontext: [kundenakte, letzte_mails, textbausteine]
modell: large
---

## Zweck
Termine bestätigen, verschieben oder eine Verzögerung erklären.

## Aufbau der Mail
1. Bezug auf die Anfrage
2. Der Termin — konkret, mit Datum
3. Bei Verzögerung: Grund in einem Satz, ohne Ausflüchte
4. Was als Nächstes passiert
5. Abschluss

## Regeln
- Nie ein Datum nennen, das nicht in den Stichworten oder Unterlagen steht.
- Bei Verzögerung: der Grund kommt vor der Entschuldigung, nicht danach.
- Keine Konjunktiv-Ketten ("könnte eventuell möglicherweise").

## Grenzen
Enthält die Anfrage eine Reklamation, übernimmt der Reklamations-Skill.
```

**Feldbedeutung**

| Feld | Bedeutung |
|---|---|
| `name` | Eindeutiger Bezeichner, zugleich Dateiname |
| `klasse` | `fach` oder `system` |
| `signalwoerter` | Wörter, die diesen Skill in Betracht ziehen lassen — deterministisch, ohne Modell |
| `kontext` | Welche Wissensquellen zusammengestellt werden (spart Token, wo sie nichts bringen) |
| `modell` | `small` oder `large` — die Kostensteuerung sitzt hier, nicht im Code |

---

## Wie ein Skill ausgewählt wird

Zwei Stufen, damit es weder rät noch stur ist:

1. **Signalwort-Abgleich (kein Modell, kostenlos).** Die eingegangene Mail und ihre Stichworte
   werden gegen alle `signalwoerter` geprüft. Ergebnis: eine Vorauswahl.
2. **Einordnung (Small 3.1, ein günstiger Aufruf).** Das Modell bekommt nur die Vorauswahl plus
   die Kurzbeschreibungen und entscheidet. Bei Gleichstand gewinnt der Skill mit den meisten Treffern.

**Sie sieht immer, welcher Skill aktiv ist**, als schlichter Text über dem Ergebnis
(„Als Liefertermin-Mail behandelt") mit der Möglichkeit, mit einem Klick umzuschalten.
Kein verstecktes Verhalten — wenn die App etwas falsch einordnet, muss sie es sofort sehen und
korrigieren können.

Mehrere Skills können gleichzeitig greifen: ein Fach-Skill plus beliebig viele System-Skills.
Zwei Fach-Skills gleichzeitig sind ausgeschlossen; bei Mischfällen entscheidet die `Grenzen`-Angabe.

---

## Fach-Skills

### 1 · `anfrage-angebot`
**Signalwörter:** Anfrage, Angebot, Preis, Konditionen, Muster, verfügbar, Verfügbarkeit, Menge, Staffel, Katalog

**Zweck:** Auf Anfragen zu Produkten, Preisen und Verfügbarkeit antworten.

**Aufbau:** Dank für die Anfrage · was genau angefragt wurde (zeigt, dass gelesen wurde) ·
Antwort mit konkreten Angaben · was noch geklärt werden muss · Angebot zum nächsten Schritt

**Harte Regel:** *Keine Zahl, die nicht in den Stichworten, der Kundenakte oder einem hinterlegten
Dokument steht.* Fehlt eine Zahl, schreibt die App eine Lücke in eckigen Klammern hinein —
`[Preis eintragen]` — statt zu erfinden. Diese Regel wird zusätzlich maschinell geprüft (siehe `MODELL.md`).

**Kontext:** Kundenakte, Preislisten und Sortimentsdaten, letzte Mails an diesen Kunden, Textbausteine

---

### 2 · `liefertermin`
**Signalwörter:** Liefertermin, Lieferung, Termin, wann kommt, Verzögerung, verspätet, Versand, Spedition, Abholung

**Zweck:** Termine bestätigen, verschieben, Verzögerungen erklären.

**Aufbau:** Bezug auf die Anfrage · der Termin, konkret mit Datum · bei Verzögerung der Grund in
einem Satz · was als Nächstes passiert · Abschluss

**Harte Regeln:** Kein Datum erfinden. Bei Verzögerung steht der Grund vor der Entschuldigung.
Keine Konjunktivketten.

**Kontext:** Kundenakte, letzte Mails, Textbausteine

---

### 3 · `auftrag-bestellung`
**Signalwörter:** Bestellung, Auftrag, bestellen, Auftragsbestätigung, Menge, ändern, stornieren, Nachbestellung

**Zweck:** Bestellungen bestätigen, Rückfragen zu Mengen und Artikeln, Auftragsänderungen.

**Aufbau:** Bestätigung des Eingangs · Auflistung des Verstandenen (Artikel, Menge, Termin) ·
offene Punkte als Frage · Abschluss

**Besonderheit:** Der einzige Skill, der **strukturiert auflistet** statt durchgehend zu formulieren.
Eine Bestellbestätigung muss überprüfbar sein, nicht schön.

**Kontext:** Kundenakte, Sortimentsdaten, letzte Mails

---

### 4 · `allgemein` (Rückfallebene)
Greift, wenn kein Fach-Skill passt. Kein eigener Aufbau, nur Stilprofil und Kundenkontext.
Verhindert, dass eine unpassende Vorlage übergestülpt wird.

---

### Nicht enthalten, aber vorgesehen: `reklamation`
Du hast diesen Mailtyp in der Abfrage nicht ausgewählt. Die Struktur trägt ihn — wenn sich zeigt,
dass Beschwerden doch regelmäßig vorkommen, ist es eine neue Datei unter `skills/`, kein Umbau.
Er wäre der einzige Skill mit Deeskalation als Hauptaufgabe und verdient dann eigene Sorgfalt.

---

## System-Skills

### 5 · `uebersetzer`
**Klasse:** system · **Modell:** large · **Läuft:** immer, wenn die Kundensprache Englisch ist

**Zweck:** Die fertige deutsche Mail fachlich korrekt ins Englische übertragen.

**Arbeitsweise:**
1. Alle Glossarbegriffe, die im deutschen Text vorkommen, werden **vorher** per exaktem
   Zeichenkettenabgleich gesucht — nicht per Ähnlichkeitssuche. Terminologie darf nicht geraten werden.
2. Die Trefferliste geht als verbindliche Vorgabe in die Anweisung: *diese Begriffe genau so, keine Synonyme.*
3. Übersetzt wird der Sinn, nicht die Wortstellung. Deutsche Schachtelsätze werden aufgelöst.
4. Anrede und Grußformel folgen englischer Geschäftskonvention, nicht der deutschen Übersetzung
   („Dear Mr Miller" / „Kind regards", nicht „Very honoured Mister Miller").

**Nachkontrolle (Small 3.1):** Prüft jeden Glossarbegriff einzeln. Bei Abweichung genau eine
gezielte Nachbesserung, danach ein sichtbarer Hinweis für sie.

**Glossaraufbau — der einzige Weg, der ohne Vorarbeit funktioniert.** Es gibt weder einen
Mailexport noch eine Terminologieliste der Firma. Das Glossar startet also leer und wächst durch
Bestätigung: Nach der Übersetzung markiert die App die Fachbegriffe, die sie gewählt hat, und
fragt einmal nach — *„Heißt das bei euch so?"*. Ein Klick macht den Begriff verbindlich, danach
wird nie wieder gefragt. Höchstens drei Nachfragen pro Mail, sonst wird es zur Last.
Was sie nicht bestätigt, bleibt Vorschlag und wird nicht erzwungen.

**Grenze:** Übersetzt nie eine Mail, die noch nicht freigegeben ist. Erst Deutsch fertig, dann Englisch.

---

### 6 · `wissensabruf`
**Klasse:** system · **Modell:** small · **Läuft:** vor jeder Formulierung

**Zweck:** Zusammenstellen, was die App über diesen Kunden und dieses Thema weiß.

**Signalwörter für gezielte Suche:** wie letztes Mal, wie besprochen, wie immer, damals, üblich,
bekannt, unser Standard

Tauchen diese auf, wird die Suche in der Mailhistorie **vorrangig** und die Trefferzahl erhöht —
sie verweist dann ausdrücklich auf etwas Früheres, und die App muss es finden.

**Zusammenstellung, in dieser Reihenfolge:**

| Quelle | Umfang | Warum begrenzt |
|---|---|---|
| Kundenakte + bestätigte Fakten | vollständig | Klein und immer relevant |
| Aktive Stilregeln (global + Kunde) | vollständig | Nicht verhandelbar, dürfen nie wegfallen |
| Frühere Mails an diesen Kunden | 6 | Genug für den Ton, ohne das Fenster zu fluten |
| Frühere Mails an andere Kunden | 4, nur wenn Kunde neu | Rückfall, damit auch der erste Kontakt sitzt |
| Passende Textbausteine | 3 | Mehr verwirrt mehr als es hilft |
| Glossartreffer | alle im Text vorkommenden | Exakter Abgleich, keine Auswahl |
| Dokumentauszüge | 3 Abschnitte | Nur bei `anfrage-angebot` |

**Suchverfahren:** Ähnlichkeitssuche über pgvector **und** deutsche Volltextsuche, die Ergebnisse
werden zusammengeführt. Reine Ähnlichkeitssuche übersieht exakte Begriffe wie Artikelnummern,
reine Volltextsuche übersieht sinnverwandte Formulierungen. Beides zusammen deckt beides ab.

**Grenze:** Findet sich nichts, wird nichts erfunden — die App formuliert dann ohne Kontext und
sagt das auch: „Zu diesem Kunden weiß ich noch nichts."

---

### 7 · `selbstverbesserung`
**Klasse:** system · **Modell:** small · **Läuft:** nach jeder Korrektur, im Hintergrund

**Zweck:** Aus ihren Korrekturen dauerhafte Regeln machen. Das ist die Korrekturschleife aus
`CLAUDE.md` §5.3 als Skill formuliert.

**Zwei Auslöser:**

**a) Sie sagt, was stört** — Signalwörter im Korrekturfeld:
zu förmlich, zu steif, zu lang, zu kurz, das Wort, nie wieder, immer, mag ich nicht, klingt nach,
freundlicher, direkter, kürzer

→ Neue Fassung sofort. Setzt sie den Haken, wird daraus eine Regel mit Status `aktiv`.
Kein Rateschritt: Was sie ausdrücklich sagt, gilt.

**b) Sie überschreibt den Text** — Ableitung in vier Schritten:
1. Satzweiser Vergleich alt gegen neu
2. Änderungen sammeln, nicht sofort deuten
3. Modellaufruf: Steckt darin eine wiederkehrende Regel?
4. **Nur wenn dasselbe Muster mindestens zweimal auftrat** oder das Modell sich sicher ist,
   erscheint ein Vorschlag. Bis zu ihrer Bestätigung Status `vorgeschlagen` — wirkungslos.

**Was der Skill niemals tut:** eine Regel stillschweigend aktivieren. Eine falsch gelernte Regel
verschlechtert jede folgende Mail, und sie hätte keine Möglichkeit zu verstehen, warum.
Deshalb: ableiten ja, vorschlagen ja, selbst entscheiden nein.

**Bewertung als zweite Quelle:** Unter jeder fertigen Mail stehen Daumen hoch und runter.
Ein Daumen runter erzeugt keine Regel, sondern eine Rückfrage: „Was hat nicht gepasst?"
Ihre Antwort läuft dann durch Auslöser (a). So entsteht ohne Zusatzaufwand die Sammlung
bewerteter Beispiele, die später als Prüfsatz dient (siehe `MODELL.md` §6).

**Grenze:** Regeln, die einander widersprechen, werden nicht beide aktiviert. Beim Anlegen prüft
der Skill gegen bestehende Regeln und legt den Konflikt ihr vor: „Neu: ‚kürzer fassen'.
Bisher: ‚ausführlich begründen'. Was gilt?"

---

### 8 · `rueckuebersetzung`
**Klasse:** system · **Modell:** small · **Läuft:** immer nach einer englischen Fassung

**Zweck:** Ihr Sicherheitsnetz. Sie braucht die App, *weil* sie das Fach-Englisch nicht sicher
beurteilen kann — also kann sie das Ergebnis auch nicht prüfen. Die Terminologiekontrolle prüft
Begriffe, nicht Sinn: „we can deliver" statt „we could deliver" besteht jede Glossarprüfung und
ändert die Zusage.

**Arbeitsweise:** Die fertige englische Mail wird **ohne Kenntnis des deutschen Originals**
zurück ins Deutsche übertragen — wörtlich am englischen Text, nicht schön. Nur so zeigt sich,
was dort tatsächlich steht.

**Anzeige:** Eingeklappt unter der englischen Fassung, Zeile „Steht da, was du meinst?".
Weicht die Rückübersetzung in einer Zusage, einer Zahl oder einer Verneinung vom deutschen
Original ab, wird die Stelle hervorgehoben — das ist der einzige Fall, in dem die App ihr von
sich aus etwas zeigt, das sie nicht angefragt hat.

**Grenze:** Die Rückübersetzung ist Kontrollmittel, nie Ergebnis. Sie wird nie kopiert
und nie verschickt.

---

## Zusammenspiel bei einer Mail

```
Eingegangene Mail + Stichworte
   │
   ├─ Signalwort-Abgleich  ──────────►  Vorauswahl der Skills   (kein Modell)
   ├─ Einordnung           ──────────►  ein Fach-Skill steht fest (Small)
   │
   ├─ wissensabruf         ──────────►  Kontext zusammengestellt (Small + Datenbank)
   │
   ├─ Fach-Skill           ──────────►  zwei deutsche Fassungen  (Large, laufender Text)
   ├─ harte Prüfungen      ──────────►  Regeln, Zahlen, Glossar  (kein Modell)
   ├─ uebersetzer          ──────────►  englische Fassung        (Large, nur bei Bedarf)
   ├─ rueckuebersetzung    ──────────►  Kontrolle für sie        (Small, nur bei Englisch)
   │
   └─ selbstverbesserung   ──────────►  nach ihrer Korrektur     (Small, im Hintergrund)
```

**Zwei Fassungen, laufender Text.** Ihr Engpass ist Grübelzeit, nicht Tipparbeit. Deshalb erscheint
der Text **beim Entstehen**, statt nach 25 Sekunden fertig aufzuploppen — sie liest schon, während
formuliert wird. Und es kommen **zwei Fassungen**: knapp und ausführlicher. Auswählen bricht eine
Grübelschleife zuverlässiger als ein einzelner Vorschlag, den man dann doch wieder zerdenkt.

Von acht Schritten brauchen nur zwei das teure Modell. Das ist der Grund, warum der Betrieb
im niedrigen zweistelligen Bereich pro Monat bleibt, ohne dass die Formulierung leidet.

## Skills ergänzen

Eine neue Datei unter `skills/`, App neu starten, fertig. Kein Codeeingriff, keine Migration.
Damit kannst du auch selbst nachschärfen, wenn sich im Alltag ein Muster zeigt, das wir jetzt
noch nicht kennen — und genau das wird passieren.
