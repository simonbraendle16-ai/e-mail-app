-- ============================================================================
--  0005 · Wissen und Abruf — Dokumente, RAG-Abschnitte, Kostenprotokoll
-- ============================================================================

-- ----------------------------------------------------------------------------
-- documents · Angebote, Preislisten, Lieferscheine, Sortimentsdaten
-- ----------------------------------------------------------------------------
create table public.documents (
  id              uuid primary key default gen_random_uuid(),
  nutzer_id       uuid not null references auth.users(id) on delete cascade,
  kunde_id        uuid references public.customers(id) on delete set null,

  titel           text not null,
  art             text not null default 'sonstiges'
                  check (art in ('angebot','preisliste','lieferschein','sortiment','sonstiges')),
  ablage_pfad     text,           -- Supabase Storage
  erkannter_text  text,           -- Ergebnis von Mistral OCR
  verarbeitet_am  timestamptz,

  erstellt_am     timestamptz not null default now()
);

create index documents_nutzer_idx on public.documents (nutzer_id);
create index documents_kunde_idx  on public.documents (kunde_id)
  where kunde_id is not null;

-- ----------------------------------------------------------------------------
-- chunks · die RAG-Basis
--
-- Die Spalte aus_archiv setzt die Aufbewahrungsentscheidung um:
-- Abschnitte aus dem Wortlaut einer verdichteten Mail werden nicht geloescht,
-- sondern als aus_archiv = true markiert. Die normale Suche laesst sie aussen
-- vor -- der Wortlaut geht dann nicht mehr an Mistral. Erst wenn sie den
-- Schalter "Archiv mitnutzen" setzt, kommen sie wieder in Frage.
-- So bleibt die Mail nachschlagbar, ohne dass Datensparsamkeit zur Kosmetik
-- wird (CLAUDE.md 4).
-- ----------------------------------------------------------------------------
create table public.chunks (
  id            uuid primary key default gen_random_uuid(),
  nutzer_id     uuid not null references auth.users(id) on delete cascade,
  kunde_id      uuid references public.customers(id) on delete cascade,

  quelle_art    text not null
                check (quelle_art in ('mail','verdichtung','dokument','baustein')),
  quelle_id     uuid not null,

  inhalt        text not null,
  einbettung    extensions.vector(1024),   -- mistral-embed
  tsv           tsvector generated always as (
                  to_tsvector('public.deutsch_unaccent', inhalt)
                ) stored,
  merkmale      jsonb not null default '{}'::jsonb,

  aus_archiv    boolean not null default false,

  erstellt_am   timestamptz not null default now()
);

comment on column public.chunks.aus_archiv is
  'true = stammt aus dem Wortlaut einer bereits verdichteten Mail. Wird nur einbezogen, wenn sie das Archiv ausdruecklich dazunimmt.';
comment on column public.chunks.quelle_art is
  '"mail" = Wortlaut, "verdichtung" = das, was nach 100 Tagen an seine Stelle tritt.';

-- HNSW fuer die Aehnlichkeitssuche. Kosinus-Abstand passt zu mistral-embed.
create index chunks_einbettung_idx on public.chunks
  using hnsw (einbettung extensions.vector_cosine_ops);

-- GIN fuer die deutsche Volltextsuche. Reine Aehnlichkeitssuche uebersieht
-- exakte Begriffe wie Artikelnummern -- deshalb beides (SKILLS.md 6).
create index chunks_tsv_idx on public.chunks using gin (tsv);

create index chunks_kunde_idx  on public.chunks (kunde_id) where kunde_id is not null;
create index chunks_nutzer_idx on public.chunks (nutzer_id);
create index chunks_quelle_idx on public.chunks (quelle_art, quelle_id);

-- ----------------------------------------------------------------------------
-- usage_log · Kostenkontrolle (MODELL.md 7)
-- ----------------------------------------------------------------------------
create table public.usage_log (
  id              uuid primary key default gen_random_uuid(),
  nutzer_id       uuid not null references auth.users(id) on delete cascade,

  modell          text not null,
  zweck           text not null,
  token_ein       integer not null default 0,
  token_aus       integer not null default 0,
  kosten_eur      numeric(10,6) not null default 0,

  erstellt_am     timestamptz not null default now()
);

create index usage_log_monat_idx on public.usage_log (nutzer_id, erstellt_am desc);

-- ----------------------------------------------------------------------------
-- weckruf · gegen das Pausieren des Supabase-Projekts
--
-- Supabase schaltet Projekte auf der kostenlosen Stufe nach einer Woche ohne
-- Zugriff ab. Nach drei Wochen Urlaub staende sie vor einer toten App, die sie
-- nicht selbst wecken kann (CLAUDE.md 9). Ein Zeitplan bei GitHub Actions
-- schreibt hier zweimal die Woche eine Zeile -- ein echter Schreibzugriff,
-- kein blosses Lesen, damit das Projekt sicher als aktiv gilt.
--
-- Bewusst OHNE nutzer_id und ohne RLS-Freigabe fuer angemeldete Nutzer:
-- Der Weckruf laeuft mit dem geheimen Schluessel und geht niemanden sonst an.
-- ----------------------------------------------------------------------------
create table public.weckruf (
  id            bigint generated always as identity primary key,
  gelaufen_am   timestamptz not null default now(),
  quelle        text not null default 'github-actions'
);

comment on table public.weckruf is
  'Haelt das Projekt wach. Wird ausschliesslich vom Zeitplan mit dem geheimen Schluessel beschrieben.';

-- ============================================================================
--  Row-Level-Security
-- ============================================================================

alter table public.documents enable row level security;
alter table public.chunks    enable row level security;
alter table public.usage_log enable row level security;
alter table public.weckruf   enable row level security;

create policy "eigene dokumente" on public.documents
  for all to authenticated
  using (nutzer_id = (select auth.uid()))
  with check (nutzer_id = (select auth.uid()));

create policy "eigene abschnitte" on public.chunks
  for all to authenticated
  using (nutzer_id = (select auth.uid()))
  with check (nutzer_id = (select auth.uid()));

create policy "eigenes kostenprotokoll" on public.usage_log
  for all to authenticated
  using (nutzer_id = (select auth.uid()))
  with check (nutzer_id = (select auth.uid()));

-- weckruf: RLS ist an, aber es gibt bewusst KEINE Richtlinie fuer angemeldete
-- Nutzer. Damit kommt niemand ausser dem geheimen Schluessel heran, und der
-- umgeht RLS ohnehin. Kein Zugriff ist hier der richtige Zugriff.
