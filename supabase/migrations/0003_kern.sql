-- ============================================================================
--  0003 · Kern — Kunden, Fakten, Mails, Fassungen
--  Datenmodell nach PLAN.md Abschnitt 2.
--
--  Alle Tabellen tragen nutzer_id und stehen unter Row-Level-Security.
--  Die Regel ist ueberall dieselbe und bewusst ein Einzeiler:
--  nutzer_id = auth.uid(). Keine Ausnahme fuer ein Wartungskonto --
--  Entscheidung des Users in Phase 2. Spaeter aufweichen geht jederzeit,
--  eine Ausnahme wieder zumachen ist deutlich schwerer.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- customers · die Kundenakte
--
-- Verschluesselte Felder tragen das Suffix _geheim und enthalten den von
-- lib/verschluesselung.ts erzeugten Text (v1:iv:anhang:geheimtext).
-- Danebe liegt jeweils _such: ein HMAC des normalisierten Klartexts.
-- Grund: Verschluesselte Spalten sind nicht durchsuchbar, weil jeder
-- Verschluesselungsvorgang wegen des zufaelligen IV ein anderes Ergebnis
-- liefert. Der Suchwert macht exakte Treffer wieder moeglich.
-- ----------------------------------------------------------------------------
create table public.customers (
  id                  uuid primary key default gen_random_uuid(),
  nutzer_id           uuid not null references auth.users(id) on delete cascade,

  -- verschluesselt (App-Ebene, Schluessel erreicht die Datenbank nie)
  anzeigename_geheim  text not null,
  anzeigename_such    text not null,
  firma_geheim        text,
  firma_such          text,
  ansprechpartner_geheim text,
  ansprechpartner_such   text,

  -- unverschluesselt: fuer sich genommen identifizieren diese Angaben niemanden
  land                text,
  sprache             text not null default 'de' check (sprache in ('de','en')),
  branche             text,
  tonalitaet          text,
  notizen             text,

  erstellt_am         timestamptz not null default now(),
  aktualisiert_am     timestamptz not null default now(),
  letzter_kontakt_am  timestamptz
);

comment on table public.customers is
  'Kundenakte. Name, Firma und Ansprechpartner liegen verschluesselt vor; daneben je ein HMAC-Suchwert fuer die exakte Suche.';

create index customers_nutzer_idx on public.customers (nutzer_id);
create index customers_such_idx   on public.customers (nutzer_id, anzeigename_such);
create index customers_kontakt_idx on public.customers (nutzer_id, letzter_kontakt_am desc nulls last);

create trigger customers_aktualisiert
  before update on public.customers
  for each row execute function public.setze_aktualisiert_am();

-- ----------------------------------------------------------------------------
-- customer_facts · das Gedaechtnis pro Kunde, waechst automatisch
-- Umsetzung des Zielbilds aus CLAUDE.md 5.4: "ueber Zeit ist fuer jeden Kunden
-- so viel Kontext da, dass das Modell weiss, was der Kunde moechte".
-- ----------------------------------------------------------------------------
create table public.customer_facts (
  id            uuid primary key default gen_random_uuid(),
  nutzer_id     uuid not null references auth.users(id) on delete cascade,
  kunde_id      uuid not null references public.customers(id) on delete cascade,

  fakt          text not null,
  kategorie     text not null default 'history'
                check (kategorie in ('preference','history','product','condition','person')),
  quelle_mail_id uuid,
  sicherheit    real not null default 0.5 check (sicherheit between 0 and 1),
  bestaetigt    boolean not null default false,

  erstellt_am   timestamptz not null default now()
);

comment on column public.customer_facts.bestaetigt is
  'Von ihr bestaetigt. Unbestaetigte Fakten gehen mit geringerem Gewicht in den Kontext.';

create index customer_facts_kunde_idx on public.customer_facts (kunde_id);
create index customer_facts_nutzer_idx on public.customer_facts (nutzer_id);

-- ----------------------------------------------------------------------------
-- emails
--
-- Aufbewahrung (Entscheidung des Users, Phase 2):
-- Nach 100 Tagen wird die Mail verdichtet. Der Wortlaut bleibt im Archiv --
-- sie kann ihn nachschlagen, wenn ein Kunde nach Monaten auf eine Zusage
-- zurueckkommt. Das Modell bekommt ihn aber nicht mehr automatisch: die
-- RAG-Abschnitte werden auf die Verdichtung umgestellt (siehe 0005, Spalte
-- chunks.aus_archiv). Nur wenn sie es ausdruecklich per Schalter erlaubt,
-- wird der Wortlaut wieder herangezogen.
-- ----------------------------------------------------------------------------
create table public.emails (
  id              uuid primary key default gen_random_uuid(),
  nutzer_id       uuid not null references auth.users(id) on delete cascade,
  kunde_id        uuid references public.customers(id) on delete set null,

  betreff         text,
  eingehender_text text,          -- die eingefuegte Kundenmail
  ihre_stichworte text,           -- was sie sagen wollte
  text_de         text,
  text_en         text,

  skill           text,           -- welcher Fach-Skill gegriffen hat
  status          text not null default 'entwurf'
                  check (status in ('entwurf','verwendet','verworfen')),
  bewertung       smallint check (bewertung in (-1, 1)),

  -- Verdichtung und Archiv
  verdichtung     text,           -- Anliegen, Ton, Formulierungen; ohne Wortlaut
  verdichtet_am   timestamptz,

  erstellt_am     timestamptz not null default now(),
  aktualisiert_am timestamptz not null default now()
);

comment on column public.emails.verdichtung is
  'Ersetzt den Wortlaut im RAG, sobald verdichtet_am gesetzt ist. Enthaelt Anliegen, Tonfall und gelernte Fakten -- keine Namen, keine Betraege, keinen Originalwortlaut.';
comment on column public.emails.verdichtet_am is
  'Gesetzt, sobald die Mail 100 Tage alt war. Der Wortlaut bleibt in dieser Zeile stehen (Archiv), geht aber nur noch auf ausdruecklichen Wunsch an das Modell.';

create index emails_nutzer_idx  on public.emails (nutzer_id, erstellt_am desc);
create index emails_kunde_idx   on public.emails (kunde_id, erstellt_am desc);
create index emails_offen_idx   on public.emails (nutzer_id, verdichtet_am)
  where verdichtet_am is null;
-- Die gesammelten Faelle mit Daumen hoch sind der Pruefsatz (MODELL.md 6).
create index emails_bewertung_idx on public.emails (nutzer_id, bewertung)
  where bewertung is not null;

create trigger emails_aktualisiert
  before update on public.emails
  for each row execute function public.setze_aktualisiert_am();

alter table public.customer_facts
  add constraint customer_facts_quelle_fk
  foreign key (quelle_mail_id) references public.emails(id) on delete set null;

-- ----------------------------------------------------------------------------
-- email_versions · jede Fassung wird aufbewahrt
-- Ermoeglicht "eine Fassung zurueck" und ist die Datengrundlage der
-- Regelableitung aus manuellen Bearbeitungen (PLAN.md 4).
-- ----------------------------------------------------------------------------
create table public.email_versions (
  id            uuid primary key default gen_random_uuid(),
  nutzer_id     uuid not null references auth.users(id) on delete cascade,
  mail_id       uuid not null references public.emails(id) on delete cascade,

  nummer        integer not null,
  text_de       text,
  text_en       text,
  ausloeser     text not null default 'erste'
                check (ausloeser in ('erste','anweisung','eigene_bearbeitung')),
  anweisung     text,

  erstellt_am   timestamptz not null default now(),

  unique (mail_id, nummer)
);

create index email_versions_mail_idx on public.email_versions (mail_id, nummer desc);

-- ============================================================================
--  Row-Level-Security
--  Ohne diese Zeilen waere jede Tabelle fuer jeden angemeldeten Nutzer offen.
-- ============================================================================

alter table public.customers      enable row level security;
alter table public.customer_facts enable row level security;
alter table public.emails         enable row level security;
alter table public.email_versions enable row level security;

create policy "eigene kunden" on public.customers
  for all to authenticated
  using (nutzer_id = (select auth.uid()))
  with check (nutzer_id = (select auth.uid()));

create policy "eigene kundenfakten" on public.customer_facts
  for all to authenticated
  using (nutzer_id = (select auth.uid()))
  with check (nutzer_id = (select auth.uid()));

create policy "eigene mails" on public.emails
  for all to authenticated
  using (nutzer_id = (select auth.uid()))
  with check (nutzer_id = (select auth.uid()));

create policy "eigene fassungen" on public.email_versions
  for all to authenticated
  using (nutzer_id = (select auth.uid()))
  with check (nutzer_id = (select auth.uid()));
