# Supabase einrichten — Klickfolge

> Dauert rund fünf Minuten. Einmalig, vor Phase 0.
> **Der kritische Schritt ist die Region.** Sie lässt sich nachträglich nicht ändern —
> steht das Projekt in der falschen Region, muss es neu angelegt werden.

---

## 1 · Konto und Projekt

1. **supabase.com** öffnen → **Start your project**
   Anmeldung mit GitHub geht am schnellsten (du bist dort ohnehin eingeloggt).
2. Falls noch keine Organisation existiert: eine anlegen. Name egal, z. B. dein Name.
   Typ: *Personal*, Plan: **Free**.
3. **New project** klicken.

## 2 · Die vier Felder

| Feld | Eingabe |
|---|---|
| **Name** | `e-mail-app` |
| **Database Password** | Auf **Generate a password** klicken und den Wert **sofort in einen Passwortmanager kopieren**. Er wird nach dem Anlegen nicht mehr angezeigt. Gebraucht wird er für direkte Datenbankverbindungen und Migrationen. |
| **Region** | **Central EU (Frankfurt)** — in der Liste als `eu-central-1` geführt. ⚠️ **Nicht änderbar.** Genau hinschauen: Der Standardvorschlag ist oft eine US-Region. |
| **Pricing Plan** | **Free** |

**Create new project** klicken. Die Bereitstellung dauert ein bis zwei Minuten.

## 3 · Zugangsdaten holen

Nach dem Anlegen: **Project Settings** (Zahnrad links unten) → **API keys** bzw. **Data API**.

Drei Werte werden gebraucht:

| Wert | Wo | Wofür |
|---|---|---|
| **Project URL** | `https://<kennung>.supabase.co` | Adresse der Datenbank |
| **Publishable key** (früher `anon`) | beginnt mit `sb_publishable_…` bzw. `eyJ…` | Darf in den Browser, geschützt durch Row-Level-Security |
| **Secret key** (früher `service_role`) | beginnt mit `sb_secret_…` | **Nur serverseitig.** Umgeht jede Sicherheitsregel — darf niemals in den Browser und niemals ins Repo |

## 4 · pgvector einschalten

**Database** → **Extensions** → im Suchfeld `vector` eingeben → Schalter aktivieren.

Das ist die Grundlage für die Ähnlichkeitssuche (RAG). Lässt sich auch später per Migration
erledigen, aber hier ist es ein Klick.

## 5 · Anmeldung per Name und Passwort

**Authentication** → **Sign In / Providers** → **Email**:

- **Enable Email provider**: an
- **Confirm email**: aus (wichtig: die App verschickt keine Bestätigungs-Mails)
- **Secure email change**: an

Die App legt Konten automatisch beim ersten Login an. Die Nutzerin braucht nur ihren Namen und ein Passwort; E-Mail-Versand und Verifizierungslinks werden nicht verwendet.

Die **Site URL** und die **Redirect URLs** unter *Authentication → URL Configuration* bleiben
zunächst auf `http://localhost:3000`. Sobald die Cloudflare-Adresse steht, kommt sie dort dazu.

## 6 · Werte eintragen

In die Datei `.env.local` im Projektverzeichnis (steht in `.gitignore`, wird nie eingecheckt):

```
NEXT_PUBLIC_SUPABASE_URL=https://<kennung>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_DB_PASSWORD=<das generierte Passwort>
MISTRAL_API_KEY=<dein Mistral-Schlüssel>
```

---

## Drei Dinge, die man wissen sollte

**Das Projekt pausiert nach einer Woche ohne Zugriff.** Auf der kostenlosen Stufe schaltet Supabase
inaktive Projekte ab. Nach drei Wochen Urlaub stünde sie vor einer toten App, die sie nicht selbst
wecken kann. Gegenmaßnahme ist in Phase 2 eingeplant: ein wöchentlicher automatischer Zugriff.

**Der Secret Key umgeht jede Zugriffsregel.** Er gehört ausschließlich in serverseitige
Umgebungsvariablen — bei Cloudflare später als *Secret*, nicht als normale Variable. Landet er
im Browser, ist die gesamte Datenbank offen.

**Das Datenbank-Passwort wird nur einmal gezeigt.** Wenn es weg ist, lässt es sich unter
*Project Settings → Database* zurücksetzen — das ändert aber alle bestehenden Verbindungszeichenfolgen.
