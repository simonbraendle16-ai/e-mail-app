-- ============================================================================
--  0008 · Loeschen raeumt die RAG-Abschnitte mit ab
--
--  In der Validierung aufgefallen: PLAN.md Abschnitt 2 verlangt eine
--  "Loeschfunktion pro Kunde und pro Mail, kaskadierend inklusive Chunks".
--  Die Kaskade fehlte fuer Mails.
--
--  Warum sie fehlte: chunks.quelle_id zeigt je nach quelle_art auf emails,
--  documents oder boilerplates. Ein solcher polymorpher Verweis laesst sich
--  nicht als Fremdschluessel abbilden, und damit kaskadiert Postgres nichts.
--
--  Warum das schwer wiegt: Sie loescht eine Mail, sieht sie verschwinden --
--  und der Text liegt weiter in den Abschnitten und geht weiter an Mistral.
--  Die App wuerde sich an etwas erinnern, das sie geloescht hat. Das ist das
--  Gegenteil der Zusage.
--
--  Loesung: Trigger statt Fremdschluessel. Sie greifen auch dann, wenn jemand
--  direkt in der Datenbank loescht -- eine Aufraeumfunktion in der App haette
--  diese Luecke gelassen.
-- ============================================================================

create or replace function public.abschnitte_zur_quelle_loeschen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.chunks
   where quelle_id = old.id
     and quelle_art = case tg_table_name
                        when 'emails'      then 'mail'
                        when 'documents'   then 'dokument'
                        when 'boilerplates' then 'baustein'
                      end;

  -- Bei Mails haengt ausserdem die Verdichtung an derselben Kennung.
  if tg_table_name = 'emails' then
    delete from public.chunks
     where quelle_id = old.id
       and quelle_art = 'verdichtung';
  end if;

  return old;
end;
$$;

comment on function public.abschnitte_zur_quelle_loeschen() is
  'Raeumt die RAG-Abschnitte einer geloeschten Quelle mit ab. Ersetzt den Fremdschluessel, den es wegen der polymorphen quelle_id nicht geben kann.';

-- SECURITY DEFINER ist hier noetig: der Trigger muss auch dann aufraeumen,
-- wenn die Loeschung ueber einen Weg kommt, der die chunks-Zeilen selbst nicht
-- sehen wuerde. Er loescht ausschliesslich Zeilen, die an der geloeschten
-- Quelle haengen -- mehr kann er nicht, und search_path ist festgenagelt.

create trigger emails_abschnitte_aufraeumen
  before delete on public.emails
  for each row execute function public.abschnitte_zur_quelle_loeschen();

create trigger documents_abschnitte_aufraeumen
  before delete on public.documents
  for each row execute function public.abschnitte_zur_quelle_loeschen();

create trigger boilerplates_abschnitte_aufraeumen
  before delete on public.boilerplates
  for each row execute function public.abschnitte_zur_quelle_loeschen();

-- ----------------------------------------------------------------------------
-- Beim Loeschen eines Kunden bleiben seine Mails stehen (on delete set null),
-- damit ihr nicht ungefragt Korrespondenz verschwindet. Deren Abschnitte
-- verlieren dabei aber nur den Kundenbezug -- der Inhalt bleibt.
-- Das ist gewollt und hier festgehalten, damit es niemand fuer ein Versehen
-- haelt: wer die Mails mitloeschen will, loescht sie ausdruecklich.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- mail_loeschen · loescht eine Mail mit allem, was daran haengt
-- Die Fassungen kaskadieren ueber den Fremdschluessel, die Abschnitte ueber
-- den Trigger oben, die abgeleiteten Kundenfakten verlieren ihre Quelle.
-- ----------------------------------------------------------------------------
create or replace function public.mail_loeschen(ziel_mail_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  geloescht integer;
begin
  delete from public.emails where id = ziel_mail_id;
  get diagnostics geloescht = row_count;
  return geloescht > 0;
end;
$$;

comment on function public.mail_loeschen is
  'Loescht eine Mail samt Fassungen und RAG-Abschnitten. Gibt false zurueck, wenn es die Mail nicht gibt oder sie nicht sichtbar ist.';
