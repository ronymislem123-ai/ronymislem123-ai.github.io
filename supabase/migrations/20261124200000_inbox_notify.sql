-- E-Mail-Benachrichtigung: Nach jeder neuen Anfrage ruft die Datenbank die Edge Function inbox-notify auf.
-- Asynchron über pg_net: Ein Fehler beim Versand blockiert das Speichern der Anfrage nie.
create extension if not exists pg_net with schema extensions;

create or replace function public.zentrale_inbox_notify()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  perform net.http_post(
    url := 'https://cypzmrogwltxksimadpn.supabase.co/functions/v1/inbox-notify',
    body := jsonb_build_object('id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 8000
  );
  return new;
end;
$$;

revoke all on function public.zentrale_inbox_notify() from public, anon, authenticated;

drop trigger if exists zentrale_inbox_notify on public.zentrale_inbox;
create trigger zentrale_inbox_notify
  after insert on public.zentrale_inbox
  for each row execute function public.zentrale_inbox_notify();
