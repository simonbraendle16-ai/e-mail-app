---
name: selbstverbesserung
klasse: system
signalwoerter: [zu förmlich, zu steif, zu lang, zu kurz, das Wort, nie wieder, immer, mag ich nicht, klingt nach, freundlicher, direkter, kürzer, weniger, mehr]
kontext: [stilregeln, letzte_fassungen]
modell: klein
laeuft: nach-korrektur
---

## Zweck

Aus ihren Korrekturen dauerhafte Regeln machen. Das ist die Korrekturschleife
aus `CLAUDE.md` §5.3 als Skill.

## Zwei Auslöser

### a) Sie sagt, was stört

Freitext im Korrekturfeld. Neue Fassung sofort. Setzt sie einen der beiden
Haken, wird daraus eine Regel mit Status `aktiv`.

**Kein Rateschritt: Was sie ausdrücklich sagt, gilt.**

### b) Sie überschreibt den Text

Ableitung in vier Schritten:

1. Satzweiser Vergleich alt gegen neu
2. Änderungen sammeln, nicht sofort deuten
3. Ein günstiger Modellaufruf prüft: Steckt darin eine wiederkehrende Regel?
4. **Nur wenn dasselbe Muster mindestens zweimal auftrat** oder das Modell
   sich sicher ist, erscheint ein Vorschlag. Bis zu ihrer Bestätigung steht
   die Regel auf `vorgeschlagen` und wirkt nicht.

## Was dieser Skill niemals tut

**Eine Regel stillschweigend aktivieren.**

Eine falsch gelernte Regel verschlechtert jede folgende Mail, und sie hätte
keine Möglichkeit zu verstehen, warum. Die App würde langsam schlechter, ohne
dass jemand den Grund fände. Deshalb: ableiten ja, vorschlagen ja, selbst
entscheiden nein.

## Bewertung als zweite Quelle

Unter jeder fertigen Mail stehen Daumen hoch und runter. Ein Daumen runter
erzeugt keine Regel, sondern eine Rückfrage: „Was hat nicht gepasst?" Ihre
Antwort läuft dann durch Auslöser (a).

So entsteht ohne Zusatzaufwand die Sammlung bewerteter Beispiele, die später
als Prüfsatz dient (`MODELL.md` §6).

## Grenzen

Regeln, die einander widersprechen, werden nicht beide aktiviert. Beim Anlegen
prüft der Skill gegen bestehende Regeln und legt den Konflikt ihr vor:
*„Neu: ‚kürzer fassen'. Bisher: ‚ausführlich begründen'. Was gilt?"*
