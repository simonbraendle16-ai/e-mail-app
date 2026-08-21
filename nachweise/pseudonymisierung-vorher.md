# Pseudonymisierung — Gegenprüfung

> Erzeugt am 21.8.2026, 16:11:31 · Modell `mistral-large-2512`, Streuung 0.3
> Anforderung: `PLAN.md` §8 — *„Wird in Phase 3 an echten Beispielen gegengeprüft;
> falls spürbar, wird nur die engste Variante beibehalten."*

**Wie zu lesen:** Für jeden Fall stehen zwei Mails nebeneinander. Beide entstanden
mit denselben Anweisungen, demselben Modell und derselben Streuung. Der **einzige**
Unterschied: Bei A sah das Modell die echten Namen, bei B nur `[KUNDE_1]` und
`[PERSON_1]` — B ist danach zurückersetzt, also genau das, was sie sähe.

**Die Frage:** Ist B spürbar schlechter als A? Wenn nein, bleibt die
Pseudonymisierung wie sie ist. Wenn ja, bleibt laut `PLAN.md` nur die engste Variante.

---

## 1 · Liefertermin

*Stichworte:* Lieferung geht Freitag raus, Spedition wie immer

### A — mit Klarnamen

Hallo Herr Meier,

die Nachlieferung Bergkäse geht am Freitag raus. Die Spedition ist dieselbe wie immer.

Mit freundlichen Grüßen

### B — pseudonymisiert, dann zurückersetzt

Hallo Herr Herr Meier,

die Nachlieferung Bergkäse geht am Freitag raus. Die Spedition ist dieselbe wie immer.

Mit freundlichen Grüßen

**Prüfpunkte:** Platzhalter übrig: keine ·
Länge A/B: 130/135 Zeichen ·
Name richtig eingesetzt: ja

---

## 2 · Verzögerung (heikel)

*Stichworte:* Spedition hatte Ausfall, Ware geht morgen früh raus, kommt Freitag an, tut mir leid

### A — mit Klarnamen

**Betreff:** Lieferung für dieses Wochenende

Hallo Frau Gruber,

die Lieferung verzögert sich wegen eines Speditionsausfalls. Die Ware geht morgen früh raus und kommt voraussichtlich Freitag bei Ihnen an.

Wir bedauern die Unannehmlichkeiten.

Mit freundlichen Grüßen
[Ihr Name]
[Käserei Name]

### B — pseudonymisiert, dann zurückersetzt

**Betreff:** Lieferverzug – Ware kommt Freitag an

Hallo Frau Brändle,

die Lieferung hatte sich wegen eines Speditionsausfalls verzögert. Die Ware geht morgen früh raus und trifft voraussichtlich am Freitag bei Ihnen ein.

Wir bedauern die Unannehmlichkeiten.

Mit freundlichen Grüßen
[Ihr Name]
[Käserei-Name]

**Prüfpunkte:** Platzhalter übrig: keine ·
Länge A/B: 294/311 Zeichen ·
Name richtig eingesetzt: ⚠️ nein

---

## 3 · Anfrage mit fehlenden Zahlen

*Stichworte:* Können wir liefern, Preis muss ich noch klären, Lieferzeit zehn Werktage

### A — mit Klarnamen

**Betreff:** Angebot für Bergkäse – 500 kg monatlich

Sehr geehrter Herr Sørensen,

wir können 500 kg Bergkäse monatlich liefern. Die Lieferzeit beträgt zehn Werktage nach Auftragseingang.

Den Preis kläre ich für Sie und sende ihn bis [Datum eintragen] nach.

Mit freundlichen Grüßen
[Ihr Name]
[Ihre Position]
[Käserei Name]
[Kontaktdaten]

### B — pseudonymisiert, dann zurückersetzt

**Betreff:** Angebot für Bergkäse – 500 kg monatlich

Sehr geehrter Herr Herr Sørensen,

vielen Dank für Ihre Anfrage. Wir können 500 kg Bergkäse monatlich liefern.

Der Preis beträgt [Preis eintragen] pro kg. Die Lieferzeit beträgt zehn Werktage ab Bestellung.

Mit freundlichen Grüßen
[Ihr Name]
[Ihre Position]
[Käserei-Name]

**Prüfpunkte:** Platzhalter übrig: keine ·
Länge A/B: 341/328 Zeichen ·
Name richtig eingesetzt: ja

---

## 4 · Zwei Namen in einer Mail

*Stichworte:* Alles klar, schicke Unterlagen an Herrn Bakker, freue mich auf Zusammenarbeit

### A — mit Klarnamen

**Betreff:** Unterlagen für Herrn Bakker

Sehr geehrte Frau de Vries,

vielen Dank für Ihre Nachricht. Die Unterlagen sende ich heute an Herrn Bakker.

Ich freue mich auf die weitere Zusammenarbeit.

Mit freundlichen Grüßen
[Ihr Name]
[Ihre Position]
[Käserei Name]

### B — pseudonymisiert, dann zurückersetzt

**Betreff:** Unterlagen für Herrn Bakker

Sehr geehrte Frau Frau de Vries,

vielen Dank für Ihre Nachricht. Die Unterlagen gehen heute an Herrn Bakker.

Ich wünsche ihm eine gute Einarbeitung und freue mich auf die weitere Zusammenarbeit.

Mit freundlichen Grüßen
[Ihr Name]

**Prüfpunkte:** Platzhalter übrig: keine ·
Länge A/B: 265/274 Zeichen ·
Name richtig eingesetzt: ja

---

## Kosten dieser Prüfung

0.0100 € für 8 Aufrufe.
