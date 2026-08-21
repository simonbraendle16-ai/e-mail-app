-- ============================================================================
--  0004 · Lernen — Stilregeln, Glossar, Textbausteine
--  Das Herz der Korrekturschleife (PLAN.md 4, SKILLS.md 7).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- style_rules
--
-- "Abgelehntes kommt nicht wieder" ist die Kernzusage der App. Deshalb zwei
-- Dinge, die hier festgeschrieben sind:
--
-- 1. status: eine abgeleitete Regel steht auf 'vorgeschlagen' und wirkt NICHT,
--    bis sie bestaetigt ist. Eine still gelernte falsche Regel verschlechtert
--    jede folgende Mail, und sie haette keine Moeglichkeit zu verstehen, warum.
-- 2. muster: optionaler regulaerer Ausdruck fuer die maschinelle Pruefung.
--    Doppelte Absicherung neben der Anweisung an das Modell (MODELL.md 4).
-- ----------------------------------------------------------------------------
create table public.style_rules (
  id            uuid primary key default gen_random_uuid(),
  nutzer_id     uuid not null references auth.users(id) on delete cascade,
  kunde_id      uuid references public.customers(id) on delete cascade,
                -- NULL bedeutet: gilt global

  regel         text not null,
  art           text not null default 'vermeiden'
                check (art in ('vermeiden','bevorzugen','ton','aufbau')),
  herkunft      text not null default 'ausdruecklich'
                check (herkunft in ('ausdruecklich','abgeleitet')),
  status        text not null default 'aktiv'
                check (status in ('aktiv','vorgeschlagen','abgelehnt')),
  muster        text,
  belege        integer not null default 1,

  erstellt_am   timestamptz not null default now(),
  aktualisiert_am timestamptz not null default now()
);

comment on column public.style_rules.kunde_id is
  'NULL = gilt global. Kundenspezifische Regeln stehen im Prompt zuletzt und ueberstimmen damit globale.';
comment on column public.style_rules.status is
  'Nur "aktiv" wirkt. Abgeleitete Regeln starten als "vorgeschlagen" und werden nie still uebernommen.';
comment on column public.style_rules.belege is
  'Wie oft dasselbe Muster beobachtet wurde. Ein Vorschlag erscheint erst ab zwei Beobachtungen oder bei hoher Sicherheit.';

create index style_rules_aktiv_idx on public.style_rules (nutzer_id, status)
  where status = 'aktiv';
create index style_rules_kunde_idx on public.style_rules (kunde_id)
  where kunde_id is not null;

create trigger style_rules_aktualisiert
  before update on public.style_rules
  for each row execute function public.setze_aktualisiert_am();

-- ----------------------------------------------------------------------------
-- glossary · verbindliche Fachterminologie DE -> EN
--
-- Startet leer und waechst durch Bestaetigung im Arbeitsablauf: Beim
-- Uebersetzen markiert die App die Fachbegriffe und fragt einmal nach
-- ("Heisst das bei euch so?"). Hoechstens drei Nachfragen pro Mail.
-- Es gibt weder Mailexport noch Terminologieliste der Firma -- das ist der
-- einzige Weg, der ohne Vorarbeit funktioniert (SKILLS.md 5).
-- ----------------------------------------------------------------------------
create table public.glossary (
  id            uuid primary key default gen_random_uuid(),
  nutzer_id     uuid not null references auth.users(id) on delete cascade,

  begriff_de    text not null,
  begriff_en    text not null,
  bereich       text not null default 'allgemein'
                check (bereich in ('kaese','export','qualitaet','allgemein')),
  notiz         text,
  herkunft      text not null default 'vorgeschlagen'
                check (herkunft in ('vorgeschlagen','bestaetigt','eingetragen')),
  verbindlich   boolean not null default false,
  sicherheit    real not null default 0.5 check (sicherheit between 0 and 1),

  erstellt_am   timestamptz not null default now(),

  unique (nutzer_id, begriff_de)
);

comment on column public.glossary.verbindlich is
  'Nur bestaetigte Begriffe werden dem Modell als unverhandelbar vorgegeben. Was sie nicht bestaetigt, bleibt Vorschlag.';

-- Fuer den exakten Zeichenkettenabgleich beim Uebersetzen. Kleingeschrieben,
-- weil Terminologie nicht geraten werden darf, aber Gross-/Kleinschreibung
-- am Satzanfang nicht zaehlt.
create index glossary_begriff_idx on public.glossary (nutzer_id, lower(begriff_de));
create index glossary_verbindlich_idx on public.glossary (nutzer_id)
  where verbindlich = true;

-- ----------------------------------------------------------------------------
-- boilerplates · Firmen-Standardformulierungen
-- ----------------------------------------------------------------------------
create table public.boilerplates (
  id            uuid primary key default gen_random_uuid(),
  nutzer_id     uuid not null references auth.users(id) on delete cascade,

  name          text not null,
  text_de       text not null,
  text_en       text,
  kategorie     text not null default 'standard'
                check (kategorie in ('signatur','anrede','abschluss','rechtliches','standard')),

  erstellt_am   timestamptz not null default now()
);

create index boilerplates_nutzer_idx on public.boilerplates (nutzer_id, kategorie);

-- ============================================================================
--  Row-Level-Security
-- ============================================================================

alter table public.style_rules  enable row level security;
alter table public.glossary     enable row level security;
alter table public.boilerplates enable row level security;

create policy "eigene regeln" on public.style_rules
  for all to authenticated
  using (nutzer_id = (select auth.uid()))
  with check (nutzer_id = (select auth.uid()));

create policy "eigenes glossar" on public.glossary
  for all to authenticated
  using (nutzer_id = (select auth.uid()))
  with check (nutzer_id = (select auth.uid()));

create policy "eigene bausteine" on public.boilerplates
  for all to authenticated
  using (nutzer_id = (select auth.uid()))
  with check (nutzer_id = (select auth.uid()));
