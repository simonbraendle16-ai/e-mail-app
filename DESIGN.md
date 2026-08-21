# Designsystem

> Stand: 2026-08-21 · Verbindlich. Jeder Wert im Code stammt aus diesem Dokument.
> Keine improvisierten Farben, keine Zwischengrößen, keine Ausnahmen „nur hier einmal".

---

## Die Leitidee: Werkzeug und Werkstück

Die Oberfläche ist das **Werkzeug** — beige, flach, ruhig, in einer serifenlosen Schrift.
Die fertige Mail ist das **Werkstück** — sie liegt auf einer hellen Papierfläche, in einer
Serifenschrift gesetzt, mit einem weichen Schatten darunter.

Dieser eine Wechsel ist das gesamte gestalterische Wagnis dieses Projekts, und er hat einen Grund:
Was am Ende beim Kunden ankommt, ist ein Brief. Es soll auch aussehen wie einer — sichtbar
unterschieden von den Schaltern und Feldern, mit denen er entstanden ist. Sie erkennt an einem
Blick, was ihre Arbeitsfläche ist und was das Ergebnis.

Alles andere bleibt zurückhaltend. Ein Akzent, eine Aktionsfarbe, keine Verzierung.

---

## 1. Farben

Beige als Grundton, Dunkelgrün als Sekundärfarbe. Das Beige ist bewusst kein Creme-Ton, sondern
leicht ins Graugrüne gezogen, damit es mit dem Grün eine Familie bildet statt daneben zu stehen.

```css
:root {
  /* Grundflächen — Beige */
  --grund:        #EDE7DA;   /* Hintergrund der gesamten App */
  --grund-tief:   #E2DACB;   /* Eingabefelder, inaktive Flächen */
  --linie:        #CFC5B2;   /* Trennlinien, Feldränder */

  /* Das Werkstück */
  --papier:       #FCFBF8;   /* Fläche, auf der die fertige Mail liegt */

  /* Dunkelgrün — Sekundärfarbe, alle Aktionen */
  --gruen:        #2F5B42;   /* Knöpfe, aktive Zustände */
  --gruen-tief:   #23472F;   /* gedrückt, überfahren */
  --gruen-hell:   #4F7A5F;   /* Fokusrahmen, sekundäre Akzente */

  /* Schrift */
  --text:         #241F19;   /* Fließtext, warmes Fast-Schwarz */
  --text-leise:   #6B6055;   /* Beschriftungen, Hilfstexte */

  /* Hinweise — gedeckt, nie grell */
  --hinweis:      #8A5A2B;   /* Platzhalter, Warnungen */
  --hinweis-flae: #F2E6D4;   /* Fläche dazu */
  --fehler:       #8C3A2E;
}
```

**Aufgehellt in Phase 1.** Die erste Fassung (`#23402F`) kam auf 11,4:1 gegen Weiß und wurde
schlicht als Schwarz gelesen — womit die Regel „was grün ist, kann man anklicken" ins Leere lief.
Die jetzige Fassung liegt bei 7,8:1 auf Weiß und 6,3:1 auf dem Grund, bleibt also deutlich über
der Anforderung, ist aber als Grün erkennbar. Entscheidung des Users nach der Sichtprüfung.

**Regeln**
- Dunkelgrün ist die **einzige** Aktionsfarbe. Was grün ist, kann man anklicken.
- Rot erscheint ausschließlich bei echten Fehlern, nie für Hinweise.
- Kein Farbverlauf. Nirgends.
- Kontrast: Fließtext auf Grund erreicht 12:1, Beschriftungen 5,4:1 — beides über der Anforderung.

**Kein dunkler Modus.** Sie arbeitet tagsüber im Büro an einem festen Rechner. Ein zweites
Farbschema wäre Aufwand ohne Nutzen und eine zweite Fehlerquelle.

---

## 2. Schrift

Beide Schriften werden **selbst ausgeliefert** (`next/font`, zur Bauzeit heruntergeladen).
Kein Aufruf an Google-Server — siehe `CLAUDE.md` §4.

| Rolle | Schrift | Wo |
|---|---|---|
| Oberfläche | **Source Sans 3** | Beschriftungen, Knöpfe, Navigation, Eingabefelder |
| Werkstück | **Source Serif 4** | Der Mailtext selbst, deutsch wie englisch |

Beide stammen aus derselben Familie: Sie harmonieren in Grauwert und Proportion, bleiben aber
klar unterscheidbar. Die Umlaute sind in beiden sauber gezeichnet — bei deutschen Texten kein
selbstverständlicher Punkt.

```css
--schrift-ui:    "Source Sans 3", system-ui, sans-serif;
--schrift-mail:  "Source Serif 4", Georgia, serif;
```

**Größen.** Grundgröße ist 18 px, nicht 16 — sie liest den ganzen Tag.

| Marke | Größe / Zeilenhöhe | Verwendung |
|---|---|---|
| `xs` | 13 / 18 | Zeitangaben, Zähler |
| `s` | 15 / 22 | Beschriftungen über Feldern |
| `m` | 18 / 28 | Grundtext der Oberfläche |
| `l` | 21 / 32 | **Der Mailtext** (Serif) |
| `xl` | 26 / 34 | Bildschirmüberschrift |
| `2xl` | 34 / 42 | Startseite |

**Stärken:** 400 für Text, 600 für Beschriftungen und Knöpfe. Kein 700, kein Kursiv außer im
Zitat einer eingegangenen Mail. Keine Großbuchstaben-Sperrungen.

---

## 3. Maße

```css
--abstand-1: 4px;    --abstand-5: 32px;
--abstand-2: 8px;    --abstand-6: 48px;
--abstand-3: 16px;   --abstand-7: 64px;
--abstand-4: 24px;   --abstand-8: 96px;

--radius-feld:  6px;
--radius-knopf: 8px;
--radius-karte: 10px;

--schatten-papier: 0 1px 2px rgba(36,31,25,.04), 0 8px 24px rgba(36,31,25,.06);

--breite-inhalt: 720px;   /* Textspalte — bewährte Lesebreite */
--breite-seite: 1080px;
```

Zwischenwerte sind nicht erlaubt. Wenn 24 px zu wenig und 32 px zu viel wirken, ist die Struktur
falsch, nicht der Abstand.

Ein einziger Schatten im ganzen System, und er gehört dem Papier. Nichts sonst schwebt.

---

## 4. Bausteine

**Knopf, Hauptaktion** — Grün, weiße Schrift, `--radius-knopf`, Innenabstand 14/28 px, Größe `m`,
Stärke 600. Es gibt pro Bildschirm **genau einen**.

**Knopf, Nebenaktion** — Transparent, grüne Schrift, 1 px grüner Rand.

**Textknopf** — Nur Schrift in Grün, unterstrichen beim Überfahren. Für alles Untergeordnete.

**Eingabefeld** — Fläche `--grund-tief`, 1 px `--linie`, `--radius-feld`, Innenabstand 14/16 px,
Schriftgröße `m`. Beschriftung darüber in `s`, Farbe `--text-leise`, Abstand 8 px.
Im Fokus: 2 px Rahmen in `--gruen-hell`, versetzt um 2 px. Nie den Fokusrahmen entfernen.

**Papierfläche** — Hintergrund `--papier`, `--radius-karte`, `--schatten-papier`,
Innenabstand 32/40 px, Text in `--schrift-mail`, Größe `l`. Der einzige Ort im System mit Schatten.

**Kundenmarke** — Name, dahinter die Sprache als Kürzel („DE" / „EN") in `xs` auf `--grund-tief`.
Keine Flaggen: Sprache ist nicht dasselbe wie Nationalität, und ein Kunde in der Schweiz, dem man
auf Englisch schreibt, macht die Flagge zur Falschaussage.

**Hinweisstreifen** — Fläche `--hinweis-flae`, linke Kante 3 px `--hinweis`, kein Symbol,
kein Rahmen. Text erklärt, was zu tun ist, nicht was passiert ist.

**Lückenmarkierung** — `[Preis eintragen]` erscheint auf `--hinweis-flae` mit Schrift in
`--hinweis`. Sie soll ins Auge springen, ohne nach Fehler auszusehen — es ist eine Aufgabe, kein Mangel.

---

## 5. Die fünf Bildschirme

### Start

```
┌────────────────────────────────────────────────────┐
│  E-Mail                          Kunden   Wissen   │
│                                                    │
│                                                    │
│     Guten Morgen.                                  │
│                                                    │
│   ┌──────────────────────┐  ┌──────────────────┐   │
│   │                      │  │                  │   │
│   │  Auf eine Mail       │  │  Neue Mail       │   │
│   │  antworten           │  │  schreiben       │   │
│   │                      │  │                  │   │
│   └──────────────────────┘  └──────────────────┘   │
│                                                    │
│   Zuletzt                                          │
│   Meier & Co.  ·  Liefertermin        gestern      │
│   Van Dijk BV  ·  Angebot             gestern      │
│   Alpenhof     ·  Bestellung          Montag       │
│                                                    │
└────────────────────────────────────────────────────┘
```

Die linke Fläche ist deutlich größer — sie ist der Normalfall. Die Begrüßung wechselt mit der
Tageszeit, sonst passiert hier nichts.

**Randbündig (Phase 1).** Kopfzeile und die beiden Flächen laufen bis an den Seitenrand statt in
`--breite-seite` zu stehen. Sie sind das Erste, was sie morgens sieht, und sollen als Fläche
wirken, nicht als Kästchen in der Bildschirmmitte. Die Liste „Zuletzt" darunter bleibt auf
`--breite-seite`: über die volle Fensterbreite gespreizt fielen Kunde und Datum so weit
auseinander, dass man die Zeile zweimal lesen müsste.

**Die Begrüßung wird im Browser bestimmt**, nicht im Server. Der Server steht bei Cloudflare
irgendwo im Netz und rechnet in UTC — serverseitig stünde morgens um neun „Guten Abend."

### Antworten — der Bildschirm, auf dem sie den Tag verbringt

```
┌────────────────────────────────────────────────────┐
│  ← Zurück                                          │
│                                                    │
│  Antwort schreiben                                 │
│                                                    │
│  Kunde    Meier & Co.  DE   ändern                 │
│                                                    │
│  Mail vom Kunden                                   │
│  ┌──────────────────────────────────────────────┐  │
│  │ Sehr geehrte Frau …                          │  │
│  │                                              │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  Was möchtest du sagen?                            │
│  ┌──────────────────────────────────────────────┐  │
│  │ Lieferung geht Freitag raus                  │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│                      ┌────────────────────────┐    │
│                      │   Antwort schreiben    │    │
│                      └────────────────────────┘    │
└────────────────────────────────────────────────────┘
```

Der Kunde wird beim Einfügen automatisch erkannt und angezeigt — nicht als Auswahlliste, die sie
bedienen muss, sondern als Feststellung mit der Möglichkeit zu widersprechen.

**Während gearbeitet wird:** kein Ladekreis, kein Fortschrittsbalken. Eine Zeile Text, die sagt,
was gerade passiert: „Ich schaue nach, was wir Meier & Co. zuletzt geschrieben haben." Dann:
„Ich formuliere." Ehrlich, ruhig, ohne Zahlen, die niemand prüfen kann.

### Ergebnis

```
┌────────────────────────────────────────────────────┐
│  Als Liefertermin-Mail behandelt.   anders?        │
│                                                    │
│   ┌────────────────────────────────────────────┐   │
│   │                                            │   │
│   │   Sehr geehrter Herr Meier,                │   │
│   │                                            │   │
│   │   vielen Dank für Ihre Nachricht. Die      │   │
│   │   Lieferung verlässt unser Haus am         │   │
│   │   Freitag, den [Datum eintragen].          │   │
│   │                                            │   │
│   │   Mit freundlichen Grüßen                  │   │
│   │                                            │   │
│   └────────────────────────────────────────────┘   │
│                                                    │
│   ┌──────────┐   Passt nicht?   Fassung zurück     │
│   │ Kopieren │                          👍  👎     │
│   └──────────┘                                     │
│                                                    │
│   Passt nicht?                                     │
│   ┌──────────────────────────────────────────────┐ │
│   │ Sag einfach, was stören soll                 │ │
│   └──────────────────────────────────────────────┘ │
│   ☐ Für Meier & Co. merken    ☐ Immer so machen    │
└────────────────────────────────────────────────────┘
```

Der Mailtext steht in der Serifenschrift auf `--papier` und ist direkt bearbeitbar — kein
Umschalten in einen Bearbeitungsmodus, sie klickt hinein und tippt. Das Korrekturfeld ist
eingeklappt, bis sie „Passt nicht?" anklickt.

Bei englischen Kunden erscheint die englische Fassung. Die deutsche steht darunter, eingeklappt,
mit der Zeile „Deutsche Fassung ansehen" — zum Gegenlesen, wenn sie will.

### Kunden

Liste in einer Spalte: Name, Sprache, letzter Kontakt. Ein Klick öffnet die Akte:
Sprache, Ansprechpartner, was die App gelernt hat, gemerkte Regeln, letzte Mails.
Jeder gelernte Punkt hat ein kleines Kreuz zum Entfernen. Nichts hier ist Pflichtfeld,
nichts muss ausgefüllt werden, damit die App funktioniert.

### Wissen

Drei Abschnitte: Glossar, Textbausteine, Dokumente. Vorschläge der App stehen oben unter
„Ist das richtig?" mit Übernehmen und Verwerfen. Dieser Bildschirm darf nie geöffnet werden
müssen — er ist Angebot, nicht Aufgabe.

---

## 6. Bewegung

Eine einzige Animation im ganzen System: Die fertige Mail blendet über 200 ms ein und steigt
dabei 8 px auf. Sonst nichts — kein Aufklappen, kein Schweben, kein Verlauf.

Bei `prefers-reduced-motion: reduce` entfällt auch diese.

Was sich verbietet: Schreibmaschineneffekte beim Erscheinen des Textes. Das sieht nach
KI-Vorführung aus und hält sie beim Lesen auf.

---

## 7. Sprache in der Oberfläche

- **Du**, nicht Sie. Es ist ihr Werkzeug, nicht ihr Geschäftspartner.
- Knöpfe sagen, was passiert: „Antwort schreiben", nicht „Absenden". Der Knopf, der „Kopieren"
  heißt, erzeugt die Rückmeldung „Kopiert".
- Keine Fachbegriffe. Kein „Prompt", kein „Modell", kein „Token", kein „RAG", kein „KI".
- Fehler erklären, was zu tun ist: „Die Verbindung klemmt gerade. Dein Text ist gespeichert,
  probier es in einer Minute nochmal." Keine Entschuldigung, kein Code, kein Englisch.
- Leere Zustände laden ein: „Noch keine Kunden. Der erste entsteht, sobald du eine Mail schreibst."

---

## 8. Zugänglichkeit

Wird eingehalten, nicht angekündigt: sichtbarer Fokusrahmen überall, vollständige Bedienung per
Tastatur, Beschriftungen mit Feldern verknüpft, Statusänderungen für Vorleseprogramme angekündigt,
Grundgröße 18 px, Zoom bis 200 % ohne Umbruchschäden, Kontraste über der Anforderung.

Die App wird für 1280 px Breite gebaut und funktioniert bis 1024 px hinunter. Kein Mobilbetrieb —
sie arbeitet am Schreibtisch, und ein Handy-Layout wäre Aufwand für einen Fall, den es nicht gibt.
