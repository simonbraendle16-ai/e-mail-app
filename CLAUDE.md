# CLAUDE.md — E-Mail-App (DSGVO-konformer Mail-Assistent)

> Stand: 2026-08-21 · Status: **Im Bau. Phase 0 und 1 stehen, Phase 2 abgeschlossen.**
> Durchlaufen: Anforderungs-Drill ✓ · Spezifikation ✓ · Kreuzverhör ✓ · Freigabe durch den User ✓
> Gebaut: Fundament ✓ · Design-Prototyp ✓ · Datenmodell ✓ · Modellanbindung ✓ · Skill-Maschinerie ✓
> · Verfassen Deutsch ✓ · Maschinelle Prüfungen ✓ — als Nächstes Phase 7
> (Übersetzung & Rückübersetzung).
>
> **Offen aus Phase 6:** Die Glossarprüfung aus `MODELL.md` §4 ist noch nicht gebaut.
> Sie vergleicht Begriffe zwischen zwei Sprachen und hat im deutschen Verfassen nichts
> zu prüfen — sie entsteht mit Phase 7. Die anderen fünf Prüfungen laufen.
>
> **Empfohlen vor Phase 7:** zehn Minuten Draufschauen durch die Mutter (PLAN.md §6, §9).
> Repo: https://github.com/simonbraendle16-ai/e-mail-app (privat)
> Dieses Dokument ist die verbindliche Projekt-Referenz. Was hier steht, ist entschieden.

**Begleitdokumente — ebenfalls verbindlich:**

| Datei | Inhalt |
|---|---|
| [`PLAN.md`](PLAN.md) | Architektur, Datenmodell, Verarbeitungsweg, Umsetzungsphasen |
| [`SKILLS.md`](SKILLS.md) | Fach- und System-Skills, Auswahlverfahren, Kontextbudget |
| [`MODELL.md`](MODELL.md) | Wortlaut der Modell-Anweisungen, maschinelle Prüfungen, Qualitätsmessung |
| [`DESIGN.md`](DESIGN.md) | Farben, Schrift, Maße, Bausteine, alle fünf Bildschirme |

---

## 1. Ziel

Eine **DSGVO-konforme Web-App**, mit der die Mutter des Users (Büro / Kundenbetreuung bei einem
deutschen Käsereiunternehmen) ihre tägliche Kundenkorrespondenz bewältigt. Ihr Arbeitstag besteht
zum größten Teil aus dem Verfassen von E-Mails und deren Übertragung ins Englische.

### Das eigentliche Problem (im Kreuzverhör geschärft)

**Sie verkopft sich beim deutschen Schreiben.** Nicht das Tippen kostet Zeit, sondern das Grübeln
vor dem leeren Feld: wie formuliere ich das, ist das zu hart, ist das zu weich. Eine Mail kann so
eine Viertelstunde verschlingen.

Daraus folgen zwei Dinge, die den ganzen Bau prägen:

- **Der deutsche Teil ist der Kern der App**, nicht das Beiwerk. Das Übersetzen hat sie mit einem
  Übersetzungsdienst bereits halbwegs gelöst — es bleibt im Funktionsumfang, ist aber nicht der Engpass.
- **Es zählt, wie schnell ein Vorschlag dasteht**, nicht wie perfekt er ist. Ein Startpunkt bricht
  die Grübelschleife. Deshalb: Text läuft beim Entstehen ein statt fertig aufzuploppen, und es
  erscheinen **zwei Fassungen** (knapp und ausführlicher) — auswählen ist für einen verkopften Kopf
  leichter als bewerten.

Zwei Kernschritte:

1. **Verfassen** — aus der eingegangenen Kundenmail plus ein paar Stichworten eine fertig
   formulierte deutsche E-Mail im richtigen Ton und Wortlaut.
2. **Übersetzen** — fachlich korrekte englische Fassung (Käserei-, Lebensmittel-, Export-,
   Qualitätsterminologie), keine Wort-für-Wort-Übersetzung. Dazu die **Rückübersetzung** als
   Kontrolle (siehe §5.2).

**Leitsatz des Users:** *"Interface soll stehen, soll Zeit ersparen und nicht kosten und kein
zusätzlicher Klotz an ihrem Bein sein."* — Jede Designentscheidung wird daran gemessen.
Konkret: keine Pflegearbeit, keine Konfiguration, kein Lernaufwand, kein Tool das man "bedienen" muss.

## 2. Nutzerin

- **Primärnutzerin:** Mutter des Users. Büro / Kundenbetreuung, deutsches Käsereiunternehmen.
- **Muttersprache:** Deutsch. Zielsprache: **Englisch**.
- **Technikaffinität:** gering anzunehmen → deutsche Oberfläche, extrem einfach, fehlerverzeihend,
  selbsterklärend. Kein KI-Jargon, keine Einstellungsdialoge, keine Fehlermeldungen mit Codes.
- **User (Sohn):** baut, betreibt und wartet die App. Zweites Konto zu Wartungszwecken.

## 3. Entschiedene Randbedingungen

| Thema | Entscheidung | Begründung / verworfene Alternative |
|---|---|---|
| Mail-Ein/Ausgabe | **Copy & Paste** neben Outlook | Kein Zugriff aufs Firmenpostfach → keine IT-Freigabe, kein IMAP/Exchange-Risiko. Verworfen: Postfach-Anbindung, Outlook-Add-in (beide brauchen Firmen-IT). |
| Rechtsrahmen | **Privates Werkzeug** für sie | Kein Firmen-Rollout. Konsequenz: Kundendaten werden pseudonymisiert gespeichert, technisch fahren wir trotzdem die DSGVO-Maximalvariante. |
| Datenhaltung | **Supabase, EU-Region Frankfurt** | pgvector für RAG, Auth, Backups, Updates ohne Zugriff auf ihren Rechner. Preis: US-Konzern → CLOUD-Act-Restrisiko, abgefedert durch Pseudonymisierung. Verworfen: lokales SQLite (kein Fernupdate), eigener Hetzner-Server (Admin-Aufwand). |
| Auslieferung | **Gehostete Web-App**, sie öffnet eine URL und ist eingeloggt | Kein Start, kein Terminal, keine Installation. |
| App-Hosting | **Cloudflare Workers** (`@opennextjs/cloudflare`) | Dauerhaft kostenlos ohne Grauzone bei beruflicher Nutzung. Verworfen: Vercel — dessen Hobby-Tarif ist formal nicht für kommerzielle Nutzung gedacht, und sie setzt die App im Job ein. Die App selbst speichert nichts, alle Daten liegen in Supabase Frankfurt. *In Phase 0 von Pages auf Workers gewechselt* — Cloudflare hat Next.js-Deployments umgestellt, siehe `PLAN.md` §1. |
| Modellzugang | **Start mit dem Mistral-Konto des Users, eigenes Konto für sie später** | Der Wechsel ist eine Umgebungsvariable. Getrennte Kosten und saubere Zuordnung, sobald sie ein eigenes Konto hat. |
| Schriften | **Selbst ausgeliefert** (`next/font`), kein Google-CDN | Ein CDN-Aufruf überträgt ihre IP-Adresse an Google — vom LG München I 2022 abgemahnt (Az. 3 O 17493/20). Selbst ausgeliefert entsteht die Verbindung gar nicht erst. |
| Nutzerkreis | **Nur sie** (+ Wartungskonto), aber **Row-Level-Security von Anfang an** | Kolleginnen später ohne Umbau möglich. Kostet jetzt fast nichts. *Phase 2:* Das Wartungskonto sieht ihre Daten **nicht** — die Regel bleibt überall derselbe Einzeiler und ist nachweislich dicht. Später aufweichen geht jederzeit, eine Ausnahme wieder zumachen ist deutlich schwerer. |
| LLM | **Mistral, EU-Endpunkt**, Provider hinter austauschbarem Interface | Siehe §4. Lokales Modell (Ollama, OpenAI-kompatibel) bleibt jederzeit anschließbar. |
| Eingabe | **Tippen in v1**, Diktat später | Windows-Bordmittel `Win+H` deckt Diktat vorerst ab. Whisper-Anbindung ist ein eigener Brocken. |
| Wissensaufbau | **Automatisch aus ihren Mails**; User liefert bei Gelegenheit zusätzlichen Kontext nach | Sie pflegt nichts, sie schreibt nur — die App lernt nebenbei. |
| Auslieferungsreife | **Erst komplett, dann übergeben** | Ein halbfertiger erster Eindruck würde sie abschrecken. Alle vier Kernfeatures fertig, bevor sie es sieht. |

## 4. DSGVO — die tatsächliche Lage

DSGVO-Konformität ist kein Siegel, das ein Anbieter besitzt. Sie hängt an fünf Dingen:
Rechtsgrundlage, Auftragsverarbeitungsvertrag (Art. 28), Ort der Verarbeitung, technische
Schutzmaßnahmen, Lösch- und Auskunftskonzept.

**Mistral** ist deshalb die stärkste realistische Wahl am Markt:
- Unternehmenssitz Paris, La Plateforme verarbeitet standardmäßig in der EU
- Inputs werden bei API-Nutzung **nicht** für Modelltraining verwendet, 30 Tage Audit-Log-Retention
- DPA ist Vertragsbestandteil, mit der DSGVO als Grundlage geschrieben — nicht als Anhang
- Kein US-Konzern dahinter → **US CLOUD Act greift nicht**

**Grundsatz des Users, wörtlich: „wir nehmen IMMER den sauberen".**
Wo eine datenschutzrechtlich saubere und eine bequeme Variante zur Wahl stehen, gilt die saubere —
auch wenn sie mehr Aufwand kostet. Grauzonen werden nicht stillschweigend eingegangen, sondern
offengelegt und entschieden.

**Zusätzliche Maßnahmen im Projekt:**
- **Datensparsamkeit durch Verdichtung.** *Im Kreuzverhör aufgedeckter Widerspruch:* „Rohtexte
  werden gelöscht" und „die App lernt aus früheren Mails" schließen einander aus — und die
  RAG-Abschnitte *sind* der Rohtext, nur zerteilt. Sie mitzulöschen nimmt der App das Gedächtnis,
  sie zu behalten macht die Löschung zur Kosmetik.
  **Auflösung:** Nach Ablauf der Frist wird jede Mail durch eine Verdichtung ersetzt — Anliegen,
  Tonfall, verwendete Formulierungen, gelernte Fakten; ohne Originalwortlaut, ohne Beträge, ohne
  Namen. Das Gedächtnis bleibt, der Rohtext geht. Kostet einen zusätzlichen Verarbeitungsschritt.

  **In Phase 2 konkretisiert (Entscheidung des Users):**
  - **Die Frist beträgt 100 Tage.**
  - Der Wortlaut wird nicht gelöscht, sondern **archiviert**: Er bleibt in der Mailzeile stehen und
    ist nachschlagbar, wenn ein Kunde nach Monaten auf eine Zusage zurückkommt.
  - **Entscheidend ist, was das Modell sieht:** Die RAG-Abschnitte aus dem Wortlaut werden als
    `aus_archiv` markiert und fallen aus der normalen Suche heraus. Ab dann arbeitet das Modell
    mit der Verdichtung — an Mistral geht der Wortlaut also nicht mehr.
  - **Sie kann das Archiv bewusst dazunehmen**, per Schalter, für eine einzelne Anfrage. Die
    Ausnahme ist sichtbar und gewollt, nicht der Normalfall.

  *Ehrlich eingeordnet:* Das ist weniger streng als „der Rohtext geht". Der Gewinn liegt darin,
  dass der Wortlaut standardmäßig den Server nicht mehr verlässt — und genau dort saß das Risiko.
- Kundennamen, Firmen und Ansprechpartner verschlüsselt; Schlüssel außerhalb der Datenbank.
  *Folge, die im Kreuzverhör auffiel:* Verschlüsselte Spalten sind nicht durchsuchbar — die
  Kundensuche braucht einen zusätzlichen Suchindex über Hashwerte. Mehrarbeit, eingeplant.

  **In Phase 2 entschieden: verschlüsselt wird in der App, nicht in der Datenbank.** Bei pgcrypto
  müsste der Schlüssel bei jeder Abfrage mitgeschickt werden und stünde damit in Supabases
  Anfrageprotokollen — also genau dort, wovor die Verschlüsselung schützen soll. Jetzt sieht
  Supabase nur Bytes (AES-256-GCM). Der Suchindex ist ein HMAC mit eigenem, getrenntem Schlüssel;
  ohne den könnte jeder mit Datenbankzugriff einen Namen raten, hashen und vergleichen.
  Preis: Teilwortsuche und Sortierung müssen nach dem Entschlüsseln im Server passieren.
- Gegenüber Mistral durchgehend pseudonymisiert (`[KUNDE_1]`), Rückersetzung erst serverseitig.
  *Ehrlich eingeordnet:* Das senkt das Risiko, beseitigt es nicht. „200 Laib Bergkäse für die
  Filiale in Rotterdam" identifiziert den Kunden für jeden, der die Branche kennt; dazu kommen
  Adressen, Bestell- und Telefonnummern im Fließtext. Namensersetzung ist eine Schutzschicht,
  kein Schutzwall.
- Row-Level-Security in Supabase, niemand außer ihr sieht ihre Daten
- Löschfunktion pro Kunde und pro Mail, vollständiger Datenexport
- Schriften selbst ausgeliefert, keine Verbindung zu fremden Servern aus ihrem Browser
- Provider-Interface: Wechsel auf ein lokal laufendes Modell ist jederzeit ohne Umbau möglich

**Bewusst getragenes Restrisiko:** Supabase ist ein US-Konzern. EU-Region, Auftragsverarbeitungs-
vertrag und Verschlüsselung federn das ab; ein CLOUD-Act-Zugriff auf die Mailhistorie einer
Käserei-Kundenbetreuung ist theoretisch. Das reale Thema ist ein anderes und vom Hoster unabhängig:
Es sind Daten ihres Arbeitgebers auf einem privat betriebenen Dienst. Ein Wechsel zu einem
deutschen Anbieter würde daran nichts ändern — deshalb liegt der Hebel bei der Datensparsamkeit,
nicht beim Serverstandort. Entscheidung des Users nach ausdrücklicher Risikoabwägung.

*Hinweis: keine Rechtsberatung. Bei einem späteren Firmen-Rollout kommen AVV, Verzeichnis der
Verarbeitungstätigkeiten und Löschkonzept als formale Schritte dazu.*

## 5. Funktionsumfang v1 (alle vier vor Übergabe fertig)

### 5.1 Verfassen — Hauptfluss "Antworten"

Der Hauptbildschirm bildet ab, was sie am häufigsten tut: **auf Kundenmails antworten**.

- Oben: eingegangene Kundenmail einfügen
- Darunter: zwei Sätze, was sie sagen will
- Unten: fertige Antwort, im richtigen Ton, mit dem Kundenkontext im Rücken

Zweiter Einstieg für selbst initiierte Mails vorhanden, aber nicht der Standardweg.

### 5.2 Übersetzen

- **Sprache hängt am Kunden**: deutsche Kunden bekommen Deutsch, ausländische Englisch.
  Die Kundenakte merkt sich die Sprache, sie muss nichts umschalten.
- Fachterminologie verbindlich über das Glossar (§5.4).
- **Rückübersetzung ist in v1 dabei** — als Sicherheitsnetz, nicht als Komfort. Begründung aus dem
  Kreuzverhör: Sie braucht die App, *weil* sie das Fach-Englisch nicht sicher beurteilen kann.
  Damit kann sie das Ergebnis auch nicht prüfen, und die Terminologiekontrolle prüft nur Begriffe,
  nicht Sinn. Eine falsch übertragene Zusage („we can" statt „we could") rutscht sonst durch.
  Die englische Fassung wird deshalb ins Deutsche zurückübersetzt und danebengestellt: Steht dort,
  was sie sagen wollte, stimmt es.
- Englische Mails eingehend zu *verstehen* ist weiterhin nicht v1 — die Maschinerie dafür entsteht
  mit der Rückübersetzung aber ohnehin.

### 5.3 Korrekturschleife — Kernfeature

Beide Wege sind gebaut, sie kann wählen:

1. **Sagen, was stört** — Freitextfeld ("zu förmlich", "das Wort nie") → sofort neue Fassung.
   Daneben ein Haken: *"Das merken — für diesen Kunden / für immer."*
2. **Text direkt überschreiben** — sie bearbeitet die Mail wie in Word. Die App vergleicht
   vorher/nachher und **schlägt** eine Regel vor ("Du hast 'mit freundlichen Grüßen' dreimal
   durch 'Viele Grüße' ersetzt — soll ich mir das merken?"). Abgeleitete Regeln werden immer
   nur vorgeschlagen, nie stillschweigend übernommen.

Gelernte Regeln wirken **global** (allgemeiner Schreibstil) oder **kundenspezifisch**.
Abgelehnte Formulierungen kommen nicht wieder — das ist die Kernzusage der App.

### 5.4 Kundenkontext & Fachglossar

- **Kundenakte** pro Empfänger: Sprache, Ansprechpartner, Branche, Tonalität, Besonderheiten,
  Mailhistorie, kundenspezifische Regeln. Wächst automatisch mit jeder Mail.
- **Fachglossar DE→EN**: Käse-, Lebensmittel-, Export-, Zoll-, Qualitätsbegriffe mit
  verbindlicher Übersetzung.

  **Korrektur aus dem Kreuzverhör:** Ein Glossareintrag ist ein *Paar* (`Reifegrad → maturity level`).
  Aus einer einsprachigen Mail lässt sich kein Paar gewinnen — „wächst automatisch mit" war hier
  schlicht falsch. Es gibt weder einen Mailexport noch eine Terminologieliste der Firma; der User
  kommt an keins von beidem heran und kann nur seine Mutter fragen.

  **Deshalb der einzige gangbare Weg:** Aufbau durch Bestätigung im Arbeitsablauf. Beim Übersetzen
  markiert die App die Fachbegriffe, die sie verwendet hat, und fragt einmal nach: „Heißt das bei
  euch so?" Ein Klick, und der Begriff ist verbindlich. Danach wird nie wieder gefragt.
  Das Glossar startet leer und füllt sich in den ersten Wochen — langsamer als erhofft, aber
  ohne Vorarbeit, die niemand leisten kann. Der User kann jederzeit Begriffe nachliefern,
  wenn er sie von ihr erfährt.
- **Zielbild des Users:** *"über Zeit ist für jeden Kunden so viel Kontext da, dass das Modell
  weiß, was der Kunde möchte — und dann viel besser und personalisierter helfen kann."*

### 5.5 RAG-Quellen

- Ihre bisherigen und künftigen Mails (Kernquelle)
- Firmen-Standardformulierungen: Signaturen, Textbausteine, feste Absichtserklärungen
- PDFs (Angebote, Preislisten, Lieferscheine) über Dokumenten-Parsing — Mistral OCR
- Produkt-/Sortimentsdaten: vom User nachzuliefern, Struktur wird vorgesehen

### 5.6 Skills

Zwei Klassen, vollständig spezifiziert in **`SKILLS.md`**:

- **Fach-Skills** — bestimmen Aufbau und Ton je Mailart: `anfrage-angebot`, `liefertermin`,
  `auftrag-bestellung`, dazu `allgemein` als Rückfallebene. (`reklamation` ist vorgesehen,
  aber vom User nicht ausgewählt.)
- **System-Skills** — Fähigkeiten quer zu jeder Mail: `uebersetzer`, `wissensabruf`,
  `selbstverbesserung`.

Jeder Skill liegt als Datei unter `skills/<name>.md` mit Signalwörtern, Kontextbedarf und
Modellstufe. Ausgewählt wird zweistufig: deterministischer Signalwort-Abgleich, dann ein günstiger
Einordnungsschritt. **Sie sieht immer, welcher Skill greift, und kann mit einem Klick umschalten.**
Neue Skills sind eine neue Datei, kein Codeeingriff.

### 5.7 Qualitätssicherung

Vollständig in **`MODELL.md`**. Kern: Ein Prüfsatz muss nicht vorab beschafft werden — er wächst
aus ihrer alltäglichen Bewertung (Daumen hoch/runter unter jeder Mail). Dazu kommen maschinelle
Prüfungen, die nichts kosten und immer laufen: verbotene Formulierungen, **erfundene Zahlen und
Termine**, Glossartreue, Vollständigkeit. Die Zahlenprüfung ist die wichtigste — ein falscher Preis
in einer Kundenmail ist der einzige Fehler hier, der echten Schaden anrichtet.

## 6. Ausdrücklich nicht dabei

- Kein Zugriff aufs Firmenpostfach (kein IMAP, kein Exchange, kein Graph)
- Kein Outlook-Add-in
- Kein Mailversand aus der App heraus
- Kein Diktat in v1
- Kein EN→DE-Verstehensmodus für *eingehende* Mails in v1 (die Rückübersetzung der eigenen Mails
  ist dagegen v1, siehe §5.2)
- **DeepL wird noch nicht eingesetzt.** Festgehalten als beste Alternative fürs Übersetzen: Kölner
  Unternehmen, Referenzqualität im Paar Deutsch-Englisch, Glossarfunktion mit grammatischer
  Anpassung statt stumpfem Ersetzen. Haken: Bei der kostenlosen API-Stufe dürfen die Texte zur
  Verbesserung der Dienste verwendet werden — nach dem Grundsatz „immer der saubere Weg" käme nur
  DeepL API Pro in Frage (rund 5 € Grundgebühr im Monat). Entscheidung vertagt, nicht verworfen.
- Keine Team-/Mehrbenutzerfunktion in v1 (nur technisch vorbereitet)
- Keine mobile App

## 7. Kosten — Klarstellung

- **Mistral:** Es gibt einen kostenlosen *Experiment*-Tier mit Rate Limits — der ist zum
  Prototyping gedacht, **nicht für den täglichen Produktivbetrieb**. Bezahlt liegt Mistral Large 3
  bei rund $2 / $6 pro 1 Mio. Token (Input/Output), Medium 3 bei $1 / $3, Small 3.1 bei $0.20 / $0.60.
  Bei realistisch rund 30 Mails am Tag inklusive Übersetzung und Korrekturläufen landet man mit
  Large grob bei **10–20 € im Monat**, mit Medium etwa der Hälfte.
- **Supabase:** Free-Tier reicht (500 MB, pgvector inklusive). Pausiert erst nach einer Woche
  Inaktivität — bei täglicher Nutzung irrelevant.
- **Hosting:** kostenlos. Achtung: Vercels Hobby-Tarif ist formal nicht für kommerzielle Nutzung
  vorgesehen; Cloudflare Workers hat diese Einschränkung nicht und ist daher die sicherere Wahl.
- **Kostenbremse in der App:** Modellwahl pro Aufgabe (kleines Modell für Routine, großes für
  die finale Formulierung), Prompt-Caching, Nutzungsanzeige für den User.

## 8. Arbeitsweise in diesem Projekt

- **Sprache:** Deutsch, korrekte Umlaute (ä, ö, ü, ß).
- **Plan-Modus:** Plan immer erst per `ExitPlanMode` bestätigen lassen — nie eigenständig umsetzen.
- **Reihenfolge:** Drill ✓ → CLAUDE.md ✓ → Repo ✓ → Plan ✓ → Spezifikationen ✓ → Kreuzverhör ✓
  → **Bau (hier stehen wir)** → nach jeder Phase Commit und kurze Meldung an den User
  → nach Phase 5 zehn Minuten Draufschauen durch die Mutter → `validierung`-Skill zum Abschluss.
- **Phasenweise arbeiten:** Eine Phase aus `PLAN.md` §6 nach der anderen. Am Ende jeder Phase
  Commit mit sauberer Nachricht, Push, kurze Zusammenfassung. Keine Phase überspringen,
  keine zwei Phasen gleichzeitig.
- **Was hier steht, ist entschieden.** Weicht die Umsetzung von den Dokumenten ab, ist das eine
  Änderung, die begründet und dem User vorgelegt wird — nicht eine, die stillschweigend passiert.
- **Read-Effizienz:** Grep zum Lokalisieren, dann Read mit offset+limit. Keine Komplett-Reads
  über 100 Zeilen.
- **Subagenten:** nur nach expliziter User-Bestätigung.
- **Sichtprüfung:** alles Sichtbare im echten Browser über den `claude-in-chrome`-MCP prüfen,
  kein Headless-Ersatzskript.

## 9. Offene Annahmen & Risiken

| Annahme / Risiko | Wenn es falsch ist |
|---|---|
| Copy & Paste ist im Alltag schnell genug | Sie nutzt es nicht, weil der Medienbruch nervt → Outlook-Add-in wird doch nötig (großer Umbau). Entschärft dadurch, dass ihr Engpass Grübelzeit ist, nicht Tippzeit — dagegen wiegt ein Medienbruch leicht |
| ~~**Supabase pausiert nach einer Woche ohne Zugriff**~~ *(in Phase 2 entschärft)* | Zeitplan bei GitHub Actions, montags und donnerstags ein echter Schreibzugriff. Zweimal statt einmal, damit ein ausgefallener Lauf noch Puffer bis zur Wochenfrist lässt. Läuft bewusst nicht bei Cloudflare — sonst fiele der Weckruf zusammen mit der App aus. Dass GitHub Zeitpläne in ruhenden Repos nach 60 Tagen abschaltet, fängt ein monatliches Lebenszeichen ab |
| **Kundenerkennung schlägt fehl** | Kopiert sie nur den Mailtext ohne Kopfzeilen, steht der Absender bestenfalls in der Signatur; bei Erstkontakt gibt es gar keinen Kunden. Der Fehlschlag wird als Normalfall behandelt, nicht als Ausnahme — die App fragt dann schlicht nach |
| **Bus-Faktor eins** | Nur der User baut und wartet. Fällt er aus, während Mistral, Cloudflare oder Supabase etwas umstellen, steht sie ohne Werkzeug da. Entschärfend: Sie kann jederzeit wieder ohne App arbeiten — und das muss so bleiben. Die App darf nie der einzige Weg werden |
| Vierzehn Phasen ohne einen Blick von ihr | Der Ton entscheidet über den Erfolg und lässt sich erst beurteilen, wenn sie draufschaut. Empfehlung trotz „erst komplett, dann übergeben": zehn Minuten Draufschauen nach Phase 5 — das ist keine Übergabe |
| Pseudonymisierung reicht als Schutz für Firmenkundendaten | Bei einem Firmen-Rollout wird ein AVV mit Supabase und Mistral nötig |
| Mistral Large trifft ihren Ton und das Fach-Englisch | Qualität enttäuscht → Modellwechsel nötig, deshalb das Provider-Interface |
| Regelableitung aus Textdiffs liefert brauchbare Vorschläge | Zu viele Fehlvorschläge nerven → auf Weg 1 (explizit sagen) zurückfallen |
| Automatischer Wissensaufbau reicht ohne Altmail-Import | Erste Wochen bleiben generisch → User liefert Kontext nach (hat er zugesagt) |
| EN→DE wird nicht gebraucht | Nachrüsten, Datenmodell trägt es bereits |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
