# CLAUDE.md — E-Mail-App (DSGVO-konformer Mail-Assistent)

> Stand: 2026-08-21 · Status: **Anforderungen geklärt (Drill abgeschlossen)** — Plan folgt, noch kein Code.
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

Zwei Kernschritte:

1. **Verfassen** — aus der eingegangenen Kundenmail plus ein paar Stichworten eine fertig
   formulierte deutsche E-Mail im richtigen Ton und Wortlaut.
2. **Übersetzen** — fachlich korrekte englische Fassung (Käserei-, Lebensmittel-, Export-,
   Qualitätsterminologie), keine Wort-für-Wort-Übersetzung.

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
| App-Hosting | **Cloudflare Pages** | Dauerhaft kostenlos ohne Grauzone bei beruflicher Nutzung. Verworfen: Vercel — dessen Hobby-Tarif ist formal nicht für kommerzielle Nutzung gedacht, und sie setzt die App im Job ein. Die App selbst speichert nichts, alle Daten liegen in Supabase Frankfurt. |
| Modellzugang | **Start mit dem Mistral-Konto des Users, eigenes Konto für sie später** | Der Wechsel ist eine Umgebungsvariable. Getrennte Kosten und saubere Zuordnung, sobald sie ein eigenes Konto hat. |
| Schriften | **Selbst ausgeliefert** (`next/font`), kein Google-CDN | Ein CDN-Aufruf überträgt ihre IP-Adresse an Google — vom LG München I 2022 abgemahnt (Az. 3 O 17493/20). Selbst ausgeliefert entsteht die Verbindung gar nicht erst. |
| Nutzerkreis | **Nur sie** (+ Wartungskonto), aber **Row-Level-Security von Anfang an** | Kolleginnen später ohne Umbau möglich. Kostet jetzt fast nichts. |
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
- **Datensparsamkeit als Hauptschutz:** Rohe Kundenmails werden nicht dauerhaft aufbewahrt, nur
  das daraus Gelernte (Stilregeln, Fachbegriffe, verdichtete Fakten). Automatische Löschung der
  Rohtexte nach einstellbarer Frist. Was nicht gespeichert ist, kann nicht abfließen.
- Kundennamen, Firmen und Ansprechpartner verschlüsselt; Schlüssel außerhalb der Datenbank
- Gegenüber Mistral durchgehend pseudonymisiert (`[KUNDE_1]`), Rückersetzung erst serverseitig
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
- **EN→DE (englische Mail verstehen) ist in v1 nicht dabei**, das Datenmodell trägt es aber —
  Nachrüsten ohne Umbau möglich. Entscheidung des Users bleibt offen.

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
  verbindlicher Übersetzung. Wird aus ihren Mails extrahiert, vom User ergänzbar.
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
- Kein EN→DE-Verstehensmodus in v1
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
  vorgesehen; Cloudflare Pages hat diese Einschränkung nicht und ist daher die sicherere Wahl.
- **Kostenbremse in der App:** Modellwahl pro Aufgabe (kleines Modell für Routine, großes für
  die finale Formulierung), Prompt-Caching, Nutzungsanzeige für den User.

## 8. Arbeitsweise in diesem Projekt

- **Sprache:** Deutsch, korrekte Umlaute (ä, ö, ü, ß).
- **Plan-Modus:** Plan immer erst per `ExitPlanMode` bestätigen lassen — nie eigenständig umsetzen.
- **Reihenfolge:** Drill ✓ → CLAUDE.md ✓ → Repo ✓ → detaillierter Plan → Approval → Umsetzung
  → `validierung`-Skill (Soll-Ist-Abgleich).
- **Read-Effizienz:** Grep zum Lokalisieren, dann Read mit offset+limit. Keine Komplett-Reads
  über 100 Zeilen.
- **Subagenten:** nur nach expliziter User-Bestätigung.
- **Sichtprüfung:** alles Sichtbare im echten Browser über den `claude-in-chrome`-MCP prüfen,
  kein Headless-Ersatzskript.

## 9. Offene Annahmen & Risiken

| Annahme / Risiko | Wenn es falsch ist |
|---|---|
| Copy & Paste ist im Alltag schnell genug | Sie nutzt es nicht, weil der Medienbruch nervt → Outlook-Add-in wird doch nötig (großer Umbau) |
| Pseudonymisierung reicht als Schutz für Firmenkundendaten | Bei einem Firmen-Rollout wird ein AVV mit Supabase und Mistral nötig |
| Mistral Large trifft ihren Ton und das Fach-Englisch | Qualität enttäuscht → Modellwechsel nötig, deshalb das Provider-Interface |
| Regelableitung aus Textdiffs liefert brauchbare Vorschläge | Zu viele Fehlvorschläge nerven → auf Weg 1 (explizit sagen) zurückfallen |
| Automatischer Wissensaufbau reicht ohne Altmail-Import | Erste Wochen bleiben generisch → User liefert Kontext nach (hat er zugesagt) |
| EN→DE wird nicht gebraucht | Nachrüsten, Datenmodell trägt es bereits |
