# Startpunkt für den Bau

> Diese Datei ist der Übergabepunkt zwischen Planung und Umsetzung.
> Stand: 2026-08-21 · Planung abgeschlossen, freigegeben, im Kreuzverhör geprüft.

---

## Wo wir stehen

| | |
|---|---|
| Repo | https://github.com/simonbraendle16-ai/e-mail-app (privat) |
| Lokal | `C:\Users\sabin\Downloads\Agentic Coding\Apps\E-Mail App für meine Mutter` |
| Code | noch keiner |
| Nächster Schritt | **Phase 0 — Fundament**, danach Phase 1 — Design-Prototyp |

## Die fünf verbindlichen Dokumente

| Datei | Rolle beim Bau |
|---|---|
| `CLAUDE.md` | Anforderungen, DSGVO-Grundsätze, Scope-Grenzen. Wird automatisch geladen. |
| `PLAN.md` | Architektur, Datenmodell, Verarbeitungsweg, **die 14 Phasen** |
| `SKILLS.md` | Fach- und System-Skills, Auswahlverfahren, Kontextbudget |
| `MODELL.md` | Wortlaut der Modell-Anweisungen, maschinelle Prüfungen, Qualitätsmessung |
| `DESIGN.md` | Farben, Schrift, Maße, Bausteine, alle fünf Bildschirme |

## Was der User bereitstellen muss

- **Supabase-Projekt**, Region `eu-central-1` (Frankfurt) — Projekt-URL und Schlüssel
- **Mistral-API-Key** — trägt der User selbst in `.env.local` ein, muss nicht sichtbar werden

Beides wird in Phase 0 gebraucht. Bis dahin kann ohne beides begonnen werden.

## Regeln für den Bau

1. **Phasenweise.** Eine Phase aus `PLAN.md` §6 nach der anderen. Am Ende: Commit, Push,
   kurze Meldung. Keine Phase überspringen, keine zwei gleichzeitig.
2. **Die Dokumente sind verbindlich.** Jeder Farbwert stammt aus `DESIGN.md`, jede Anweisung aus
   `MODELL.md`, jeder Skill aus `SKILLS.md`. Abweichungen werden vorgelegt, nicht stillschweigend
   vorgenommen.
3. **Phase 1 braucht Freigabe.** Der Design-Prototyp wird dem User gezeigt, bevor Funktionslogik
   entsteht.
4. **Nach Phase 5:** zehn Minuten Draufschauen durch die Mutter. Keine Übergabe, nur ein Blick —
   ob der Ton nach ihr klingt, weiß niemand sonst.
5. **Sichtprüfung im echten Browser** über den `claude-in-chrome`-MCP, kein Headless-Ersatzskript.
6. **Immer der saubere Weg** bei Datenschutzfragen, auch wenn er aufwendiger ist.

## Die vier Zusagen, an denen sich alles messen lassen muss

1. **Sie verkopft sich beim deutschen Schreiben** — dagegen hilft, dass schnell ein Vorschlag
   dasteht: laufender Text, zwei Fassungen zur Auswahl.
2. **Was sie einmal abgelehnt hat, kommt nicht wieder** — die Korrekturschleife ist die Kernzusage.
3. **Nichts wird erfunden** — keine Zahl, kein Datum, keine Zusage ohne Beleg. Maschinell geprüft.
4. **Kein Klotz am Bein** — keine Pflegearbeit, keine Konfiguration, kein Bildschirm, den sie
   öffnen *muss*.
