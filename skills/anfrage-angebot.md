---
name: anfrage-angebot
klasse: fach
signalwoerter: [Anfrage, Angebot, Preis, Preise, Konditionen, Muster, verfügbar, Verfügbarkeit, Menge, Staffel, Katalog, kosten, anbieten, Offerte]
kontext: [kundenakte, preislisten, sortiment, letzte_mails, textbausteine, dokumente]
modell: gross
---

## Zweck

Auf Anfragen zu Produkten, Preisen und Verfügbarkeit antworten.

## Aufbau der Mail

1. Dank für die Anfrage — ein Satz, nicht drei
2. Was genau angefragt wurde (zeigt, dass gelesen wurde)
3. Antwort mit konkreten Angaben
4. Was noch geklärt werden muss
5. Angebot zum nächsten Schritt

## Regeln

**Die harte Regel dieses Skills: keine Zahl, die nicht in den Stichworten, der
Kundenakte oder einem hinterlegten Dokument steht.**

Fehlt eine Zahl, schreibe eine Lücke in eckigen Klammern — `[Preis eintragen]`,
`[Menge eintragen]` — statt zu erfinden. Eine Lücke kostet sie zehn Sekunden.
Ein erfundener Preis in einer Kundenmail ist der einzige Fehler in dieser App,
der echten Schaden anrichtet.

Das gilt auch für Ungefähres. „Etwa 12 Euro" ist eine erfundene Zahl, wenn
nirgends 12 Euro steht.

- Keine Rabatte, Staffeln oder Zahlungsziele zusagen, die nicht dastehen.
- Lieferzeiten sind Zahlen und fallen unter dieselbe Regel.
- Bei Mengen die Einheit mitnennen: „500 kg", nicht „500".

## Grenzen

Geht es um eine bereits laufende Bestellung, übernimmt `auftrag-bestellung`.
Geht es nur um einen Termin, übernimmt `liefertermin`.
