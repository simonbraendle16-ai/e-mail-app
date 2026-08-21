# Umsetzungsplan — E-Mail-App

> Stand: 2026-08-21 · Grundlage: `CLAUDE.md` (Anforderungen nach Drill)
> Status: **wartet auf Freigabe**. Vor Freigabe wird kein Code geschrieben.

---

## 1. Architektur auf einer Seite

```
        Ihr Rechner (Browser)
                 │
                 ▼
   ┌─────────────────────────────┐
   │  Next.js Web-App            │   Deutsche Oberfläche, keine Installation.
   │  (TypeScript, Tailwind)     │   Speichert selbst nichts.
   └──────────┬──────────────────┘
              │  Server Actions / Route Handlers (Region EU)
              ▼
   ┌──────────────────────┐      ┌───────────────────────────┐
   │  Supabase Frankfurt  │      │  Mistral La Plateforme    │
   │  Postgres + pgvector │      │  EU, kein Training        │
   │  Auth + Storage      │      │  Large 3 / Small 3.1 / OCR│
   │  Row-Level-Security  │      │  + mistral-embed          │
   └──────────────────────┘      └───────────────────────────┘
```

**Grundregel:** Der LLM-Aufruf passiert **immer serverseitig**. Der API-Key erreicht den Browser nie.

### Technologiewahl und Begründung

| Baustein | Wahl | Warum, und was verworfen wurde |
|---|---|---|
| Framework | **Next.js 15, App Router, TypeScript** | Server Actions halten den API-Key serverseitig, ein Deployment für UI und Backend. Verworfen: getrenntes Frontend + eigene API (doppelter Betriebsaufwand ohne Nutzen bei einer Nutzerin). |
| UI | **Tailwind + shadcn/ui**, eigenes ruhiges Theme | Große Schrift, hoher Kontrast, wenige Elemente. Nicht: Material/Bootstrap-Look, der nach Verwaltungssoftware aussieht. |
| Datenbank | **Supabase Postgres, Region eu-central-1 (Frankfurt)** | pgvector, Volltextsuche, Auth und RLS in einem. |
| Auth | **Magic Link per E-Mail** | Kein Passwort, das sie sich merken oder zurücksetzen muss. Sie klickt einmal im Monat einen Link. |
| Vektoren | **pgvector**, Modell `mistral-embed` (1024 Dimensionen) | Bleibt im selben EU-Stack, keine zusätzliche Vektordatenbank. |
| LLM | **Mistral hinter einem Provider-Interface** | Wechsel auf ein lokales Modell (Ollama, OpenAI-kompatibel) ist eine Konfigurationszeile. |
| Diff | **`diff` (jsdiff)** auf Satzebene | Grundlage der Regelableitung aus manuellen Bearbeitungen. |
| Tests | **Vitest** für Kernlogik, kein E2E-Framework | Getestet wird, was still kaputtgehen kann: Regel-Anwendung, Glossar-Erzwingung, RAG-Auswahl, Diff-Ableitung. UI wird im echten Browser sichtgeprüft. |

### Entschieden

1. **Deployment: Cloudflare Pages.** Kostenlos ohne Grauzone bei beruflicher Nutzung.
   Vercel verworfen, weil dessen Hobby-Tarif formal nicht für kommerzielle Nutzung gedacht ist.
2. **Mistral-Konto: Start mit dem Key des Users**, eigenes Konto für sie, sobald sie eines hat.
   Der Wechsel ist eine Umgebungsvariable, kein Umbau.
3. **Schriften selbst ausgeliefert.** Kein Google-CDN — siehe `CLAUDE.md` §4.
4. **Design vor Code.** `DESIGN.md` ist verbindlich; die fünf Bildschirme werden als klickbarer
   Prototyp gebaut und freigegeben, bevor Funktionslogik entsteht. Figma verworfen: Schreibzugriff
   hängt an einem bezahlten Sitz, und der Schritt Entwurf → Code ist genau die Stelle, an der
   Gestaltung verwässert.

---

## 2. Datenmodell

Alle Tabellen tragen `user_id` und stehen unter Row-Level-Security (`user_id = auth.uid()`).

### Kern

**`customers`** — die Kundenakte
`id`, `user_id`, `display_name`, `company`, `country`, `language` (`de`|`en`), `industry`,
`contact_person`, `tone` (Freitext: wie schreibt man diesem Kunden), `notes`, `created_at`, `last_contact_at`

**`customer_facts`** — das Gedächtnis pro Kunde, wächst automatisch
`id`, `customer_id`, `fact` (ein Satz), `category` (`preference`|`history`|`product`|`condition`|`person`),
`source_email_id`, `confidence`, `confirmed_by_user`, `created_at`
→ Das ist die Umsetzung deines Zielbilds: „über Zeit weiß das Modell, was der Kunde möchte".

**`emails`**
`id`, `user_id`, `customer_id`, `subject`, `incoming_text` (die eingefügte Kundenmail),
`user_notes` (ihre Stichworte), `body_de`, `body_en`, `status` (`draft`|`used`|`discarded`), `created_at`

**`email_versions`** — jede Fassung wird aufbewahrt
`id`, `email_id`, `version_no`, `body_de`, `body_en`,
`trigger` (`initial`|`instruction`|`manual_edit`), `instruction_text`, `created_at`
→ Ermöglicht „eine Fassung zurück" und ist die Datengrundlage der Regelableitung.

### Lernen

**`style_rules`** — das Herz der Korrekturschleife
`id`, `user_id`, `customer_id` (NULL = gilt global), `rule_text`,
`kind` (`avoid`|`prefer`|`tone`|`structure`), `source` (`explicit`|`derived`),
`status` (`active`|`proposed`|`rejected`), `pattern` (optionaler Regex für die harte Prüfung),
`evidence_count`, `created_at`

**`glossary`** — verbindliche Fachterminologie
`id`, `user_id`, `term_de`, `term_en`, `domain` (`kaese`|`export`|`qualitaet`|`allgemein`),
`notes`, `source` (`extracted`|`manual`), `is_binding`, `confidence`

**`boilerplates`** — Firmen-Standardformulierungen
`id`, `user_id`, `label`, `text_de`, `text_en`, `category` (`signature`|`opening`|`closing`|`legal`|`standard`)

### Wissen und Abruf

**`documents`**
`id`, `user_id`, `customer_id` (nullable), `title`, `type` (`offer`|`pricelist`|`delivery_note`|`product_data`|`other`),
`storage_path`, `extracted_text`, `processed_at`

**`chunks`** — die RAG-Basis
`id`, `user_id`, `source_type` (`email`|`document`|`boilerplate`), `source_id`, `customer_id`,
`content`, `embedding vector(1024)`, `tsv tsvector` (Deutsch), `metadata jsonb`
Indizes: HNSW auf `embedding`, GIN auf `tsv`, B-Tree auf `customer_id`.

**`usage_log`** — Kostenkontrolle
`id`, `user_id`, `model`, `purpose`, `tokens_in`, `tokens_out`, `cost_estimate_eur`, `created_at`

### Datenschutz-Maßnahmen im Modell
- `display_name`, `company`, `contact_person` werden mit `pgcrypto` verschlüsselt abgelegt;
  der Schlüssel liegt in der Server-Umgebung, nicht in der Datenbank.
- An Mistral gehen Kundennamen **pseudonymisiert** (`[Kunde]`, `[Ansprechpartner]`), Rückersetzung
  passiert erst im Server nach der Antwort. Kostet nichts an Qualität, nimmt aber das meiste Risiko raus.
- Löschfunktion pro Kunde und pro Mail, kaskadierend inklusive Chunks. Vollständiger Datenexport als JSON.

---

## 3. Der Verarbeitungsweg einer Mail

```
1  Eingehende Mail einfügen
        └─► Analyse (Small 3.1, günstig): Anliegen, Ton, Dringlichkeit, Kundenerkennung
              └─► Kundenvorschlag: „Ist das Meier & Co.?"  (sie bestätigt mit einem Klick)

2  Kontext zusammenstellen (kein LLM, reine Datenbankarbeit)
        ├─ Kundenakte + alle bestätigten customer_facts
        ├─ aktive style_rules: global + für diesen Kunden
        ├─ 6 ähnlichste frühere Mails an diesen Kunden  (hybride Suche)
        ├─ 4 ähnlichste Mails insgesamt, falls der Kunde neu ist
        ├─ passende Textbausteine
        └─ Glossartreffer per exaktem Begriffsabgleich (nicht per Embedding — Terminologie muss exakt sein)

3  Entwurf Deutsch (Large 3)
        System-Prompt = Stilprofil + Regeln als harte Vorgaben + Kundenkontext + Beispiele
        User-Prompt   = eingehende Mail + ihre Stichworte

4  Regelprüfung (kein LLM)
        Jede `avoid`-Regel mit Muster wird per Regex geprüft.
        Verstoß → genau ein automatischer Neuversuch mit explizitem Hinweis. Danach Warnhinweis für sie.

5  Übersetzung Englisch (Large 3) — nur wenn die Kundensprache Englisch ist
        Glossar geht als verbindliche Begriffsliste mit: diese Begriffe genau so, keine Synonyme.

6  Terminologie-Kontrolle (Small 3.1)
        Prüft, ob jeder Glossarbegriff korrekt übersetzt wurde. Abweichung → gezielte Nachbesserung.

7  Ausgabe an sie
        Eine Sprache, die des Kunden. Kopier-Knopf. Direkt bearbeitbar.

8  Nach Übernahme, im Hintergrund (sie wartet auf nichts)
        ├─ Mail einbetten und indexieren
        ├─ neue Fakten über den Kunden extrahieren
        └─ Glossarkandidaten vorschlagen
```

**Modellzuordnung:** Small 3.1 für Analyse, Prüfungen und Extraktion; Large 3 nur für Formulierung
und Übersetzung. Das ist der Hebel, der die Kosten im niedrigen zweistelligen Bereich hält, ohne
dass die Qualität dort leidet, wo sie zählt.

---

## 4. Die Korrekturschleife im Detail

### Weg 1 — sie sagt, was stört
Unter der fertigen Mail steht ein Feld: *„Passt was nicht? Sag es einfach."*
Sie schreibt „zu förmlich" oder „das Wort mag ich nicht" → neue Fassung in wenigen Sekunden.
Daneben zwei Haken:

- ☐ **Für diesen Kunden merken** → `style_rules` mit `customer_id`, `source='explicit'`, `status='active'`
- ☐ **Immer so machen** → `style_rules` mit `customer_id = NULL`

Explizit gesetzte Regeln sind sofort aktiv. Kein Rateschritt dazwischen.

### Weg 2 — sie überschreibt den Text
Sie bearbeitet die Mail direkt im Feld, wie in Word. Beim Übernehmen:

1. Satzweiser Vergleich alte gegen neue Fassung.
2. Änderungen werden gesammelt, nicht sofort gedeutet.
3. Ein günstiger Modellaufruf prüft: steckt darin eine wiederkehrende Regel?
4. Erst wenn dasselbe Muster **mindestens zweimal** auftrat oder das Modell sich sicher ist,
   erscheint ein ruhiger Hinweis: *„Du hast ‚mit freundlichen Grüßen' dreimal durch ‚Viele Grüße'
   ersetzt. Soll ich mir das merken?"* → Ja / Nein / Nur bei diesem Kunden.
5. Bis zu ihrer Bestätigung steht die Regel auf `proposed` und wirkt nicht.

**Warum so:** Ableitung aus Textänderungen rät zwangsläufig. Wenn die App still das Falsche lernt,
verschlechtert sie sich mit jedem Tag und die Nutzerin versteht nicht, warum. Deshalb: ableiten ja,
stillschweigend übernehmen nie. Das ist die Absicherung für den Fall, dass Weg 2 sich als
zu fehleranfällig erweist — Weg 1 trägt die Funktion dann allein.

### Wie Regeln wirken
Aktive Regeln stehen im System-Prompt als nummerierte, nicht verhandelbare Vorgaben, kundenspezifische
zuletzt (sie überschreiben globale). Zusätzlich prüft Schritt 4 der Pipeline `avoid`-Regeln mechanisch.
Doppelte Absicherung, weil „das kommt nie wieder vor" die zentrale Zusage der App ist.

---

## 5. Oberfläche

Fünf Bildschirme, mehr nicht. Deutsch, große Schrift, viel Weißraum, keine Symbolleisten.

**1 · Start**
Zwei Flächen: **„Auf eine Mail antworten"** (groß, der Normalfall) und „Neue Mail schreiben".
Darunter die letzten fünf Mails zum Weiterarbeiten.

**2 · Antworten** — der Bildschirm, auf dem sie den Tag verbringt
Drei Bereiche untereinander: Kundenmail einfügen · was sie sagen will · fertige Antwort.
Kunde wird automatisch erkannt und oben angezeigt, mit einem Klick korrigierbar.
Ein Knopf: **„Antwort schreiben"**. Während es läuft, ein ruhiger Fortschrittstext,
keine Prozentzahlen, kein Zappeln.

**3 · Ergebnis**
Die Mail in der Sprache des Kunden. Groß, lesbar, direkt bearbeitbar.
Knöpfe: **Kopieren** · **Passt nicht?** · **Fassung zurück**.
Bei englischen Mails auf Wunsch die deutsche Fassung darunter zum Gegenlesen — eingeklappt,
damit sie nicht im Weg ist.

**4 · Kunden**
Liste, Suche, Akte pro Kunde: Sprache, Ansprechpartner, was die App über ihn gelernt hat,
gemerkte Regeln, letzte Mails. Alles änder- und löschbar, nichts davon ist Pflicht.

**5 · Wissen**
Glossar, Textbausteine, Dokumente. Vorschläge der App stehen oben und werden mit einem Klick
angenommen oder verworfen. Auch dieser Bildschirm ist optional — die App funktioniert, wenn
sie ihn nie öffnet.

**Verhalten bei Störungen:** Ihr Text geht nie verloren (Zwischenspeicherung im Browser).
Mistral nicht erreichbar → *„Die Verbindung klemmt gerade. Dein Text ist gespeichert,
probier es in einer Minute nochmal."* Keine Fehlercodes, kein Englisch, keine Stacktraces.

---

## 6. Umsetzung in Phasen

Übergeben wird erst, wenn alles steht — so hast du entschieden. Die Phasen sind trotzdem einzeln
lauffähig, damit du jederzeit reinschauen kannst.

| # | Phase | Inhalt | Ergebnis |
|---|---|---|---|
| 0 | **Fundament** | Next.js, TypeScript, Tailwind mit den Tokens aus `DESIGN.md`, selbst ausgelieferte Schriften, Verzeichnisstruktur, Supabase-Projekt in Frankfurt, Magic-Link-Anmeldung, Cloudflare-Deployment | Leere App unter einer URL, Anmeldung funktioniert |
| 1 | **Design-Prototyp** | Alle fünf Bildschirme aus `DESIGN.md` als klickbare Seiten mit Beispieldaten, alle Zustände (Laden, Fehler, leer). **Freigabe durch dich, bevor Logik entsteht.** | Du siehst die App, bevor sie etwas kann |
| 2 | **Datenmodell** | Alle Tabellen als Migrationen, RLS-Richtlinien, pgvector, Indizes, Feldverschlüsselung, Löschfristen für Rohtexte, TypeScript-Typen | Datenbank steht, RLS nachweislich dicht |
| 3 | **Modellanbindung** | Provider-Interface, Mistral-Adapter, Pseudonymisierung rein/raus, Wiederholung mit Backoff, Kostenprotokoll, lokaler Adapter als Nachweis der Austauschbarkeit | Modellaufrufe laufen, Kosten sichtbar |
| 4 | **Skill-Maschinerie** | Skill-Dateien unter `skills/`, Einlesen, Signalwort-Abgleich, Einordnungsschritt, Anzeige und Umschaltung für sie | Die App weiß, was für eine Mail das ist |
| 5 | **Verfassen Deutsch** | Antwort-Bildschirm, Analyse eingehender Mails, Kundenerkennung, Kontextzusammenstellung nach `SKILLS.md` §6, Entwurf, Versionierung | Erste echte Mail entsteht |
| 6 | **Maschinelle Prüfungen** | Regelprüfung, **Zahlen- und Terminprüfung**, Vollständigkeit, Lückenmarkierung, gezielte Neuversuche | Keine erfundenen Preise, keine verbotenen Formulierungen |
| 7 | **Übersetzung** | Englische Fassung, exakter Glossarabgleich, Terminologie-Nachkontrolle, Sprachsteuerung über die Kundenakte | Fachlich korrektes Englisch |
| 8 | **Korrekturschleife** | Beide Wege, Regelverwaltung, Ableitung mit Bestätigung, Konflikterkennung, Daumen-Bewertung | Abgelehntes kommt nicht wieder |
| 9 | **Kundengedächtnis** | Kundenakte, automatische Faktenextraktion, Kundenbildschirm | Mails werden mit der Zeit persönlicher |
| 10 | **Wissensbasis** | Einbettung und Indexierung, Dokument-Upload, Mistral OCR, hybride Suche, Textbausteine, Glossarvorschläge | Wissen wächst von allein |
| 11 | **Rückschrittsprüfung** | Gesammelte bewertete Fälle als Prüfsatz, automatischer Durchlauf bei jeder Änderung an Anweisungen oder Modell | Verbesserungen verschlechtern nichts still |
| 12 | **Politur** | Fehlerbehandlung durchgängig, Zwischenspeicherung, Ladezustände, Barrierefreiheit, deutsche Texte überall, Kostenwarnung | Nichts fühlt sich mehr nach Baustelle an |
| 13 | **Abnahme** | Sichtprüfung im echten Browser, realistische Testmails, Kosten-Hochrechnung, Kurzanleitung für sie, `validierung`-Skill gegen alle vier Dokumente | Übergabereif |

**Am Ende jeder Phase:** Commit mit sauberer Nachricht, Push, kurze Zusammenfassung an dich.
Vor der Übergabe läuft der `validierung`-Skill gegen `CLAUDE.md`, Anforderung für Anforderung.

---

## 7. Was du beisteuern musst

Nichts davon blockiert den Start — es macht das Ergebnis nur besser.

- **Mistral-API-Key** (deiner oder ein neuer für sie) — vor Phase 2
- **Supabase-Projekt** in Frankfurt — vor Phase 1, ich sage dir die Schritte
- **Beispielmails**, gern anonymisiert, 10 bis 20 Stück — je früher, desto besser trifft der Ton.
  Ohne sie starten die ersten Wochen generisch.
- **Fachbegriffe**, falls greifbar: Sortenliste, Spezifikationen, feste Formulierungen der Firma
- **Ihre Signatur** und was am Ende jeder Mail steht

## 8. Womit wir uns bewusst Risiken einkaufen

| Risiko | Umgang |
|---|---|
| Regelableitung aus Textänderungen rät falsch | Regeln wirken erst nach ihrer Bestätigung; im Zweifel trägt Weg 1 die Funktion allein |
| Pseudonymisierung verschlechtert die Qualität der Formulierung | Wird in Phase 3 an echten Beispielen gegengeprüft; falls spürbar, wird nur die engste Variante beibehalten |
| Kosten laufen weg | Kleine Modelle für alles außer Formulierung, Kostenprotokoll ab Phase 2, Warnung bei Überschreitung |
| Copy & Paste nervt im Alltag | Zeigt sich erst im Echtbetrieb. Ein Outlook-Add-in bliebe der Ausweg, wäre aber ein großer Umbau |
| Supabase ist ein US-Konzern | EU-Region, Verschlüsselung sensibler Felder, Pseudonymisierung gegenüber dem Modell |
