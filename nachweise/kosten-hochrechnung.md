# Kosten-Hochrechnung (Phase 13)

Gerechnet auf dem, was tatsächlich gebaut ist — nicht auf der Planung.
Grundlage: die Modellzuordnung aus `lib/modell/index.ts` und die Preise aus
`lib/modell/preise.ts` (Kurs 0,92 $/€).

## Was eine Mail auslöst

Der teuerste Normalfall: eine Antwort an einen englischsprachigen Kunden.
Acht Aufrufe, davon **zwei** auf dem großen Modell.

| Aufruf | Stufe | Kosten |
|---|---|---|
| Skill einordnen | klein | 0,023 ct |
| **Formulieren (zwei Fassungen)** | **groß** | **1,141 ct** |
| Suchanfrage einbetten | einbetten | 0,003 ct |
| **Übersetzen** | **groß** | **0,497 ct** |
| Rückübersetzen | klein | 0,038 ct |
| Glossar-Nachfragen | klein | 0,030 ct |
| Fakten extrahieren | klein | 0,036 ct |
| Mail indexieren | einbetten | 0,006 ct |
| **Summe** | | **1,77 ct** |

Eine rein deutsche Mail kostet **1,21 ct**.

## Hochgerechnet

Bei 30 Mails am Tag und 21 Arbeitstagen:

| Fall | im Monat |
|---|---|
| alle Mails mit Übersetzung | **11,17 €** |
| nur deutsch | 7,61 € |
| realistischer Mix, mit Prompt-Caching | **rund 8 €** |

Dazu: Supabase Free-Tier (0 €), Cloudflare Workers (0 €).

## Einordnung

`CLAUDE.md` §7 hatte **10–20 €** im Monat veranschlagt. Die gebaute App liegt
darunter. Zwei Gründe:

1. **Die Modellzuordnung greift.** Von den acht Aufrufen laufen sechs auf dem
   kleinen Modell und kosten zusammen weniger als ein Zehntel des
   Formulierens. Das war die entscheidende Kostenbremse (`MODELL.md` §1) — sie
   ist nachweislich wirksam.
2. **Prompt-Caching** senkt die Anweisungsblöcke ab dem zweiten Aufruf mit
   demselben Skill auf rund ein Zehntel.

**Was die Rechnung nach oben treiben kann**, und wo es realistisch ist:

- **Korrekturschleife.** Jedes „Passt nicht?" ist ein weiterer großer Aufruf
  (+1,1 ct). Bei jeder dritten Mail wären das rund 2,50 € im Monat.
- **Automatischer Neuversuch** bei verletzten Regeln — derselbe Betrag, aber
  gedeckelt: höchstens einer pro Mail (`MODELL.md` §4).
- **Dokumentenerkennung.** Rechnet pro Seite ab, nicht pro Token. Eine
  Preisliste einmal im Quartal fällt nicht ins Gewicht.
- **Rückschrittsprüfung.** Ein großer Aufruf je Prüfall. Bei dreißig
  gesammelten Fällen rund 35 ct pro Durchlauf — läuft nur, wenn der User sie
  selbst startet.

Selbst mit allem zusammen bleibt es im niedrigen zweistelligen Bereich. Die
Warnschwelle steht auf 25 € (`MODELL.md` §7) und ist damit richtig gesetzt:
hoch genug, um im Normalbetrieb nie anzuschlagen, niedrig genug, um eine
Entgleisung zu bemerken.

## Was diese Rechnung nicht ist

Eine Schätzung auf angenommenen Token-Zahlen. Die verbindliche Zahl steht auf
der Mistral-Rechnung, und die App protokolliert jeden Aufruf mit — nach dem
ersten echten Monat lässt sich diese Hochrechnung gegen die Wirklichkeit
halten. Weicht sie spürbar ab, gehören die Werte in `lib/modell/preise.ts`
nachgezogen; sie stehen bewusst an einer Stelle.
