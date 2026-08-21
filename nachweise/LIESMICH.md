# Nachweise

Belege für Prüfungen, die die Dokumente ausdrücklich verlangen. Sie stehen hier,
damit später nachvollziehbar ist, **dass** geprüft wurde und **was dabei
herauskam** — nicht nur, dass jemand es behauptet hat.

| Datei | Prüft | Anforderung aus |
|---|---|---|
| `pseudonymisierung-vorher.md` | Verschlechtert die Pseudonymisierung die Qualität? | `PLAN.md` §8, terminiert auf Phase 3 |
| `pseudonymisierung-nachher.md` | Dasselbe, nach den Korrekturen | ebenda |

## Was die Pseudonymisierungs-Prüfung ergab

**Ja, sie verschlechterte die Qualität — messbar und systematisch.**
Vier Fälle, jeder zweimal formuliert (mit Klarnamen gegen pseudonymisiert),
alles andere gleich: Modell, Anweisungen, Streuung.

Zwei Fehler, beide in mehreren Fällen:

1. **Doppelte Anrede** in drei von vier Fällen — „Hallo Herr Herr Meier".
   Ursache: War „Herr Meier" komplett ein Platzhalter, sah das Modell dort
   keine Anrede und setzte selbst eine davor.

2. **Falscher Adressat** in Fall 2 — die Antwort ging an „Frau Brändle",
   also an *sie selbst* statt an die Kundin. Ursache: Ihr Name stand im
   Klartext in der eingegangenen Mail. War der Kundenname ersetzt, griff das
   Modell nach dem einzigen Namen, den es noch sah. Dieser Fehler wäre in
   einer Mail an einen Kunden peinlich und wäre niemandem aufgefallen, der
   nicht genau hinschaut.

**Beide Ursachen waren behebbar**, ohne die Pseudonymisierung enger zu machen:

- Anrede abtrennen, nur den Namen ersetzen
- Ihren eigenen Namen mitpseudonymisieren

Nach den Korrekturen: **alle vier Fälle sauber**, korrekte Anrede, richtiger
Empfänger, keine übrigen Platzhalter.

`PLAN.md` §8 sah für den Fall spürbarer Verschlechterung vor, „nur die engste
Variante" zu behalten. Das war nicht nötig — die Verschlechterung lag nicht am
Verfahren, sondern an zwei Fehlern darin.

Kosten der Prüfung: rund 2 Cent.
