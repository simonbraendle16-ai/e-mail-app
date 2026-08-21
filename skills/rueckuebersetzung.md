---
name: rueckuebersetzung
klasse: system
signalwoerter: []
kontext: []
modell: klein
laeuft: nach-englischer-fassung
streuung: 0.1
---

## Zweck

Ihr Sicherheitsnetz.

Sie braucht die App, *weil* sie das Fach-Englisch nicht sicher beurteilen kann —
also kann sie das Ergebnis auch nicht prüfen. Die Terminologiekontrolle prüft
Begriffe, nicht Sinn: „we can deliver" statt „we could deliver" besteht jede
Glossarprüfung und ändert die Zusage.

## Arbeitsweise

Die fertige englische Mail wird **ohne Kenntnis des deutschen Originals**
zurück ins Deutsche übertragen — wörtlich am englischen Text, nicht schön.
Nur so zeigt sich, was dort tatsächlich steht.

**Das deutsche Original wird nicht mitgeschickt.** Kennt das Modell den
Ausgangstext, gleicht es unbewusst an, und die Kontrolle wird wertlos — sie
würde bestätigen, was sie prüfen soll.

Die Streuung liegt bei 0.1 statt der üblichen 0.3: Hier ist Wortgetreue
gefragt, nicht Sprachgefühl.

## Regeln

- Übersetze wörtlich, nah am englischen Text. Nicht schön machen, nicht glätten.
- Gib Zusagen genau so wieder, wie sie dort stehen: „können" ist nicht „könnten".
- Übernimm Zahlen, Daten und Mengen unverändert.
- Keine Anmerkungen. Nur der deutsche Text.

## Anzeige

Eingeklappt unter der englischen Fassung, Zeile „Steht da, was du meinst?".

Weicht die Rückübersetzung in einer **Zusage**, einer **Zahl** oder einer
**Verneinung** vom deutschen Original ab, wird die Stelle hervorgehoben — das
ist der einzige Fall, in dem die App ihr von sich aus etwas zeigt, das sie
nicht angefragt hat.

## Grenzen

Die Rückübersetzung ist Kontrollmittel, nie Ergebnis. Sie wird nie kopiert und
nie verschickt.
