-- ============================================================================
--  0009 · Ablage fuer Unterlagen (Phase 10)
--
--  Angebote, Preislisten, Lieferscheine als PDF oder Bild. Mistral OCR liest
--  den Text heraus, der Text wird indexiert -- die Datei selbst bleibt liegen,
--  damit sie sie nachschlagen kann.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Der Eimer ist PRIVAT.
--
-- Bei einem oeffentlichen Eimer waere jede hochgeladene Preisliste und jedes
-- Kundenangebot unter einer erratbaren Adresse abrufbar -- ohne Anmeldung,
-- ohne Spur im Protokoll. Gelesen wird deshalb nur ueber kurzlebige signierte
-- Adressen (siehe lib/wissen/dokumente.ts), und auch Mistral bekommt beim
-- Texterkennen nur eine solche, die nach zehn Minuten verfaellt.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'unterlagen',
  'unterlagen',
  false,
  20971520,  -- 20 MB
  array['application/pdf','image/png','image/jpeg','image/webp']
)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Zugriff: jede sieht nur ihren eigenen Ordner.
--
-- Der Pfad beginnt mit der Nutzerkennung; storage.foldername() liest sie
-- heraus. Ohne diese Regeln waere der Eimer zwar nicht oeffentlich, aber
-- jede angemeldete Nutzerin kaeme an die Dateien jeder anderen -- und
-- "niemand ausser ihr sieht ihre Daten" ist eine entschiedene Randbedingung
-- des Projekts (CLAUDE.md 3), nicht eine Frage der Bequemlichkeit.
-- ----------------------------------------------------------------------------
create policy "eigene unterlagen lesen"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'unterlagen'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "eigene unterlagen ablegen"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'unterlagen'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "eigene unterlagen aendern"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'unterlagen'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "eigene unterlagen loeschen"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'unterlagen'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
