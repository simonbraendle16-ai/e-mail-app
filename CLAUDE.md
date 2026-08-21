# CLAUDE.md — E-Mail-Assistent (Arbeitstitel)

> Stand: 2026-08-21 · Status: **Anforderungsphase (drill läuft)** — noch kein Code, noch kein finaler Plan.
> Dieses Dokument ist die verbindliche Projekt-Referenz. Alles, was hier steht, ist geklärt.
> Offene Punkte stehen unter „Offen / zu klären" und werden erst nach dem Drill hierher übernommen.

---

## 1. Ziel

Eine **DSGVO-konforme Web-App**, die einer Büro-/Kundenbetreuungs-Mitarbeiterin eines deutschen
Käsereiunternehmens (der Mutter des Users) hilft, ihren Arbeitsalltag zu bewältigen. Ihr Tag besteht
zum größten Teil aus dem Verfassen von E-Mails und deren Übertragung ins Englische.

Zwei Kernschritte:

1. **Verfassen** — aus Stichworten / Diktat / Rohtext eine fertig formulierte deutsche E-Mail
   im richtigen Ton und Wortlaut.
2. **Übersetzen** — die deutsche Mail fachlich korrekt ins Englische übertragen
   (Käserei-/Lebensmittel-/Export-Fachterminologie, keine Wort-für-Wort-Übersetzung).

## 2. Nutzerin

- **Primärnutzerin:** Mutter des Users, Büro / Kundenbetreuung, deutsches Käsereiunternehmen.
- **Muttersprache:** Deutsch. Zielsprache der Übersetzung: **Englisch**.
- **Technikaffinität:** eher gering anzunehmen → UI muss extrem einfach, fehlerverzeihend und
  selbsterklärend sein. Deutsche Oberfläche. Keine Fachbegriffe, keine KI-Jargon.
- Der User (Sohn) baut und betreibt die App, ist aber nicht der Nutzer im Alltag.

## 3. Nicht verhandelbare Anforderungen

### 3.1 DSGVO / Datenschutz
- Keine Verarbeitung von E-Mail-Inhalten durch US-Anbieter ohne Rechtsgrundlage.
- Präferenz: **europäisches LLM-Hosting** (z. B. Mistral / Mistral AI in der EU) oder
  Self-Hosting. Endgültige Modellwahl ist noch offen (siehe Offen).
- Kundendaten (Namen, Firmen, Konditionen, Preise) sind personenbezogene bzw.
  geschäftskritische Daten → Speicherort, Verschlüsselung, Löschkonzept, AVV nötig.
- Kein Training auf Nutzerdaten durch den Modellanbieter (opt-out / vertraglich ausgeschlossen).

### 3.2 Korrekturschleife (Kernfeature)
- Jede erzeugte Mail kann von der Nutzerin **korrigiert / kommentiert** werden
  („so nicht", „das Wort will ich nicht", „zu förmlich").
- Diese Korrekturen sind **persistent**: Was einmal abgelehnt wurde, soll nicht wieder vorkommen.
- Korrekturen wirken sowohl **global** (allgemeiner Schreibstil) als auch
  **kundenspezifisch** (siehe 3.3).

### 3.3 Kundenkontext
- Jede Mail wird einem **Kunden / Empfängerkontext** zugeordnet.
- Pro Kunde wird Kontext gesammelt (Branche, Ansprechpartner, Tonalität, Historie, Besonderheiten,
  bevorzugte Begriffe), damit spätere Mails den Sinn und die Beziehung besser treffen.

### 3.4 Skills & RAG
- **Skills:** wiederverwendbare, benannte Anweisungsbausteine (z. B. „Reklamation beantworten",
  „Angebot nachfassen", „Liefertermin verschieben") — von der Nutzerin auswählbar.
- **RAG:** Abruf von relevantem Wissen (frühere Mails, Kundenkontext, Fachglossar Käserei/Export,
  abgelehnte Formulierungen) als Kontext für die Generierung.
- Ein **Fachglossar DE→EN** (Käse-, Lebensmittel-, Export-, Zoll-, Qualitätsterminologie) ist
  zentraler Baustein der Übersetzungsqualität.

## 4. Arbeitsweise in diesem Projekt

- **Sprache:** Deutsch, korrekte Umlaute (ä, ö, ü, ß).
- **Plan-Modus:** Plan immer erst per ExitPlanMode bestätigen lassen — nie eigenständig umsetzen.
- **Reihenfolge:** Anforderungen (drill) → CLAUDE.md finalisieren → GitHub-Repo → detaillierter
  Plan → Approval → Umsetzung → `validierung`-Skill (Soll-Ist).
- **Read-Effizienz:** Grep zum Lokalisieren, dann Read mit offset+limit. Keine Komplett-Reads.
- **Subagenten:** nur nach expliziter User-Bestätigung.

## 5. Offen / zu klären (Drill-Themen)

- Projekt- und Repo-Name, Sichtbarkeit (privat/öffentlich), Lizenz
- Plattform: Web-App / Desktop / lokal auf ihrem Arbeitsrechner? Wo läuft sie?
- Darf die App überhaupt aufs Firmen-Postfach zugreifen (IMAP/Exchange) oder ist es
  reines Copy-&-Paste / Diktat?
- Wer ist Verantwortlicher im Sinne der DSGVO — die Firma oder privat?
- LLM-Anbieter final (Mistral EU, Azure EU, self-hosted, …), Budget
- Tech-Stack, Datenbank, Auth, Hosting
- Spracheingabe (Diktat) ja/nein
- Umfang v1 vs. später

---

*Dieses Dokument wird nach dem Drill vollständig überarbeitet.*
