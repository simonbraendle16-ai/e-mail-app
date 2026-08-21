-- ============================================================================
--  0007 · search_path der Trigger-Funktion festnageln
--
--  Von Supabases Sicherheitspruefung gemeldet. Ohne festen search_path koennte
--  ein Nutzer mit eigenem Schema die von der Funktion aufgerufenen Namen
--  umbiegen. Bei einer Funktion, die auf jeder Tabelle laeuft, ist das nichts,
--  was man offen laesst.
-- ============================================================================

create or replace function public.setze_aktualisiert_am()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.aktualisiert_am = now();
  return new;
end;
$$;

comment on function public.setze_aktualisiert_am() is
  'Trigger-Funktion: setzt aktualisiert_am bei jedem UPDATE. search_path fest, damit die Funktion nicht umgebogen werden kann.';

-- ----------------------------------------------------------------------------
-- Hinweis zur Tabelle weckruf:
-- Die Pruefung meldet "RLS enabled, no policy". Das ist hier kein Mangel,
-- sondern die Absicht: RLS ist an und es gibt bewusst KEINE Richtlinie fuer
-- angemeldete Nutzer. Damit kommt niemand ausser dem geheimen Schluessel
-- heran, und der umgeht RLS ohnehin. Kein Zugriff ist der richtige Zugriff.
-- ----------------------------------------------------------------------------
