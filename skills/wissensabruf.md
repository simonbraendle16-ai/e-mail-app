---
name: wissensabruf
klasse: system
signalwoerter: [wie letztes Mal, wie besprochen, wie immer, damals, üblich, bekannt, unser Standard, wie gehabt, wie vereinbart]
kontext: [kundenakte, letzte_mails, dokumente, textbausteine]
modell: klein
laeuft: immer
---

## Zweck

Zusammenstellen, was die App über diesen Kunden und dieses Thema weiß.

## Signalwörter für gezielte Suche

Tauchen die oben genannten Wendungen auf, wird die Suche in der Mailhistorie
**vorrangig** und die Trefferzahl erhöht. Sie verweist dann ausdrücklich auf
etwas Früheres, und die App muss es finden — „wie besprochen" ohne den
besprochenen Inhalt ist schlimmer als gar kein Bezug.

## Zusammenstellung, in dieser Reihenfolge

| Quelle | Umfang | Warum begrenzt |
|---|---|---|
| Kundenakte + bestätigte Fakten | vollständig | Klein und immer relevant |
| Aktive Stilregeln (global + Kunde) | vollständig | Nicht verhandelbar, dürfen nie wegfallen |
| Frühere Mails an diesen Kunden | 6 | Genug für den Ton, ohne das Fenster zu fluten |
| Frühere Mails an andere Kunden | 4, nur wenn Kunde neu | Rückfall, damit auch der erste Kontakt sitzt |
| Passende Textbausteine | 3 | Mehr verwirrt mehr als es hilft |
| Glossartreffer | alle im Text vorkommenden | Exakter Abgleich, keine Auswahl |
| Dokumentauszüge | 3 Abschnitte | Nur bei `anfrage-angebot` |

Diese Obergrenzen sind die Kostenbremse gegen den Fall, dass ein Kunde mit
200 Mails plötzlich das Zehnfache kostet.

## Suchverfahren

Ähnlichkeitssuche über Vektoren **und** deutsche Volltextsuche, die Ergebnisse
werden zusammengeführt. Reine Ähnlichkeitssuche übersieht exakte Begriffe wie
Artikelnummern, reine Volltextsuche übersieht sinnverwandte Formulierungen.
Beides zusammen deckt beides ab.

## Archiv

Mails, die älter als 100 Tage sind, liegen als Verdichtung vor; ihr Wortlaut
bleibt außen vor. Nur wenn sie das Archiv ausdrücklich dazunimmt, wird auch der
Wortlaut durchsucht.

## Grenzen

Findet sich nichts, wird nichts erfunden — die App formuliert dann ohne Kontext
und sagt das auch: „Zu diesem Kunden weiß ich noch nichts."
