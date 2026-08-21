-- ============================================================================
--  0002 · Grundlagen
--  Erweiterungen und eine Hilfsfunktion, die alle folgenden Tabellen nutzen.
-- ============================================================================

-- Aehnlichkeitssuche (RAG). Siehe SUPABASE-SETUP.md Abschnitt 4.
create extension if not exists vector with schema extensions;

-- Fuer gen_random_uuid(). In Supabase meist schon aktiv.
create extension if not exists pgcrypto with schema extensions;

-- Unaccent macht die deutsche Volltextsuche unempfindlich gegen Umlaute:
-- "Kaese" findet dann auch "Käse". Bei deutschen Texten kein Luxus.
create extension if not exists unaccent with schema extensions;

-- ----------------------------------------------------------------------------
-- Deutsche Volltextsuche mit Umlaut-Toleranz.
-- Wird von der hybriden Suche in 0006 gebraucht.
-- ----------------------------------------------------------------------------
create text search configuration public.deutsch_unaccent ( copy = german );

alter text search configuration public.deutsch_unaccent
  alter mapping for hword, hword_part, word
  with unaccent, german_stem;

-- ----------------------------------------------------------------------------
-- Haelt `aktualisiert_am` aktuell, ohne dass die App daran denken muss.
-- ----------------------------------------------------------------------------
create or replace function public.setze_aktualisiert_am()
returns trigger
language plpgsql
as $$
begin
  new.aktualisiert_am = now();
  return new;
end;
$$;

comment on function public.setze_aktualisiert_am() is
  'Trigger-Funktion: setzt aktualisiert_am bei jedem UPDATE.';
