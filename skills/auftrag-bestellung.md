---
name: auftrag-bestellung
klasse: fach
signalwoerter: [Bestellung, Auftrag, bestellen, Auftragsbestätigung, bestellt, ändern, stornieren, Nachbestellung, Order, abrufen]
kontext: [kundenakte, sortiment, letzte_mails]
modell: gross
---

## Zweck

Bestellungen bestätigen, Rückfragen zu Mengen und Artikeln, Auftragsänderungen.

## Aufbau der Mail

1. Bestätigung des Eingangs
2. Auflistung des Verstandenen — Artikel, Menge, Termin
3. Offene Punkte als Frage
4. Abschluss

## Besonderheit

**Dies ist der einzige Skill, der strukturiert auflistet statt durchgehend zu
formulieren.** Eine Bestellbestätigung muss überprüfbar sein, nicht schön: Der
Kunde soll mit einem Blick sehen, ob das Verstandene stimmt. Ein Fließtext
zwingt ihn, den Satz zweimal zu lesen und selbst herauszusuchen, was bestellt
wurde.

Die Auflistung steht als einfache Zeilen, nicht als Tabelle — sie wird per
Copy & Paste in Outlook übernommen, und Tabellen überleben das selten.

## Regeln

- Nur auflisten, was tatsächlich dasteht. Nichts ergänzen, nichts runden.
- Fehlt eine Angabe, wird sie zur Frage: „Wie viele Laibe sollen es sein?"
  statt einer erfundenen Menge.
- Bei Änderungen: den alten und den neuen Stand nennen, sonst weiß niemand,
  worauf sich die Bestätigung bezieht.
- Keine Preise nennen, wenn keine dastehen — dafür ist `anfrage-angebot` da.

## Grenzen

Geht es nur um den Termin einer bestehenden Bestellung, übernimmt
`liefertermin`. Geht es um ein Angebot vor der Bestellung, übernimmt
`anfrage-angebot`.
