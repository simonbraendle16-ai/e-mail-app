-- ============================================================================
--  0006 · Hybride Suche und Verdichtung
-- ============================================================================

-- ----------------------------------------------------------------------------
-- abschnitte_suchen · Aehnlichkeit UND Volltext, zusammengefuehrt
--
-- Warum beides (SKILLS.md 6): Reine Aehnlichkeitssuche uebersieht exakte
-- Begriffe wie Artikelnummern, reine Volltextsuche uebersieht sinnverwandte
-- Formulierungen. Beides zusammen deckt beides ab.
--
-- Zusammengefuehrt wird mit Reciprocal Rank Fusion: jeder Treffer bekommt
-- 1/(k + Rang) aus beiden Listen. Das braucht keine Normalisierung der
-- Punktzahlen -- Kosinus-Abstand und ts_rank sind nicht vergleichbar, ihre
-- Raenge schon.
--
-- archiv_einbeziehen: standardmaessig false. Dann bleiben Abschnitte aus dem
-- Wortlaut verdichteter Mails aussen vor und gehen nicht an Mistral. Setzt sie
-- den Schalter, kommen sie wieder in Frage (Entscheidung des Users, Phase 2).
--
-- SECURITY INVOKER: die Funktion laeuft mit den Rechten der Aufruferin,
-- die RLS-Regeln greifen also unveraendert. Bei SECURITY DEFINER waere die
-- Trennung zwischen Nutzern hier aufgehoben.
-- ----------------------------------------------------------------------------
create or replace function public.abschnitte_suchen(
  frage_einbettung  extensions.vector(1024),
  frage_text        text,
  nur_kunde         uuid    default null,
  anzahl            integer default 6,
  archiv_einbeziehen boolean default false
)
returns table (
  id          uuid,
  inhalt      text,
  quelle_art  text,
  quelle_id   uuid,
  kunde_id    uuid,
  aus_archiv  boolean,
  punkte      double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with kandidaten as (
    select c.*
    from public.chunks c
    where (nur_kunde is null or c.kunde_id = nur_kunde)
      and (archiv_einbeziehen or c.aus_archiv = false)
  ),
  nach_aehnlichkeit as (
    select k.id,
           row_number() over (order by k.einbettung <=> frage_einbettung) as rang
    from kandidaten k
    where k.einbettung is not null
    limit greatest(anzahl * 4, 20)
  ),
  nach_volltext as (
    select k.id,
           row_number() over (
             order by ts_rank_cd(k.tsv, websearch_to_tsquery('public.deutsch_unaccent', frage_text)) desc
           ) as rang
    from kandidaten k
    where frage_text is not null
      and frage_text <> ''
      and k.tsv @@ websearch_to_tsquery('public.deutsch_unaccent', frage_text)
    limit greatest(anzahl * 4, 20)
  ),
  zusammengefuehrt as (
    select coalesce(a.id, v.id) as id,
           coalesce(1.0 / (60 + a.rang), 0.0)
         + coalesce(1.0 / (60 + v.rang), 0.0) as punkte
    from nach_aehnlichkeit a
    full outer join nach_volltext v on v.id = a.id
  )
  select c.id, c.inhalt, c.quelle_art, c.quelle_id, c.kunde_id, c.aus_archiv, z.punkte
  from zusammengefuehrt z
  join public.chunks c on c.id = z.id
  order by z.punkte desc
  limit anzahl;
$$;

comment on function public.abschnitte_suchen is
  'Hybride Suche: Aehnlichkeit und deutsche Volltextsuche, zusammengefuehrt per Reciprocal Rank Fusion. Archivierte Abschnitte bleiben aussen vor, solange archiv_einbeziehen nicht gesetzt ist.';

-- ----------------------------------------------------------------------------
-- kunde_finden · exakte Suche ueber den HMAC-Suchwert
--
-- Der im Kreuzverhoer aufgedeckte Haken: verschluesselte Spalten sind nicht
-- durchsuchbar. Die App bildet den Suchwert in lib/verschluesselung.ts und
-- vergleicht hier -- die Datenbank sieht dabei weder Klartext noch Schluessel.
-- ----------------------------------------------------------------------------
create or replace function public.kunde_finden(such_wert text)
returns setof public.customers
language sql
stable
security invoker
set search_path = public
as $$
  select * from public.customers
  where anzeigename_such = such_wert
     or firma_such = such_wert
  limit 5;
$$;

-- ----------------------------------------------------------------------------
-- faellige_verdichtungen · was aelter als 100 Tage ist
--
-- Die Verdichtung selbst braucht ein Modell (Anliegen, Ton, gelernte Fakten
-- zusammenfassen) und passiert deshalb in der App, nicht hier. Diese Funktion
-- sagt nur, was ansteht.
-- ----------------------------------------------------------------------------
create or replace function public.faellige_verdichtungen(hoechstens integer default 20)
returns setof public.emails
language sql
stable
security invoker
set search_path = public
as $$
  select * from public.emails
  where verdichtet_am is null
    and erstellt_am < now() - interval '100 days'
  order by erstellt_am asc
  limit hoechstens;
$$;

comment on function public.faellige_verdichtungen is
  'Mails aelter als 100 Tage, die noch nicht verdichtet wurden. Frist entschieden vom User in Phase 2.';

-- ----------------------------------------------------------------------------
-- mail_verdichten · setzt die Verdichtung und stellt das RAG um
--
-- Der Wortlaut bleibt in der Zeile stehen -- sie soll ihn nachschlagen koennen,
-- wenn ein Kunde nach Monaten auf eine Zusage zurueckkommt. Aber die Abschnitte
-- aus dem Wortlaut werden als aus_archiv markiert und fallen damit aus der
-- normalen Suche heraus. Ab jetzt arbeitet das Modell mit der Verdichtung.
-- ----------------------------------------------------------------------------
create or replace function public.mail_verdichten(
  ziel_mail_id uuid,
  text_verdichtung text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.emails
     set verdichtung   = text_verdichtung,
         verdichtet_am = now()
   where id = ziel_mail_id
     and verdichtet_am is null;

  if not found then
    return;   -- schon verdichtet oder nicht sichtbar -- beides kein Fehler
  end if;

  -- Der Wortlaut verlaesst die normale Suche.
  update public.chunks
     set aus_archiv = true
   where quelle_art = 'mail'
     and quelle_id  = ziel_mail_id;
end;
$$;

comment on function public.mail_verdichten is
  'Setzt die Verdichtung und nimmt die Wortlaut-Abschnitte aus der normalen Suche. Der Wortlaut selbst bleibt im Archiv nachschlagbar.';
