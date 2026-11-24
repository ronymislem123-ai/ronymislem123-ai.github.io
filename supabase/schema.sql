-- LINUA Agentur-Zentrale · Supabase-Projekt linua-zentrale (Frankfurt)
-- Rekonstruiert am 24.11.2026 aus der laufenden Datenbank (nur lesende Abfragen:
-- pg_class, pg_attribute, pg_constraint, pg_indexes, pg_policies, pg_proc,
-- information_schema.*). Ersetzt das verlorene supabase/setup.sql.
-- Nicht enthalten: Daten, Auth-Nutzer, Vault-Secrets, die nie eingerichtete
-- Postfach-Funktion (mail.sql, Edge Function zentrale-mail).
-- Nicht ungeprüft auf ein bestehendes Projekt anwenden: erst in einem leeren
-- Testprojekt ausführen und mit dem Live-Stand vergleichen.

create extension if not exists pgcrypto;

-- Sequenz für die Abgleich-Reihenfolge
create sequence if not exists public.zentrale_seq start 1 increment 1;

-- Tabellen --------------------------------------------------------------------
create table if not exists public.zentrale_admins (
  user_id uuid not null primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.zentrale_docs (
  path text not null primary key,
  ws text not null,
  col text not null,
  doc_id text not null,
  data jsonb not null,
  seq bigint not null default nextval('public.zentrale_seq'),
  updated_at timestamptz not null default now(),
  lease_holder text,
  lease_until timestamptz,
  constraint zentrale_docs_path_check check (char_length(path) <= 300 and path ~ '^ws/(live|demo)/[a-z]+/[A-Za-z0-9_.-]+$'),
  constraint zentrale_docs_size check (pg_column_size(data) < 1048576),
  constraint zentrale_docs_ws_check check (ws = any (array['live','demo']))
);
create index if not exists zentrale_docs_ws_seq on public.zentrale_docs (ws, seq);

create table if not exists public.zentrale_tombstones (
  seq bigint not null default nextval('public.zentrale_seq') primary key,
  ws text not null,
  path text not null,
  at timestamptz not null default now()
);
create index if not exists zentrale_tombstones_ws_seq on public.zentrale_tombstones (ws, seq);

create table if not exists public.zentrale_inbox (
  id uuid not null default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  subject text not null,
  body text not null,
  name text,
  email text not null,
  hp text,
  constraint zentrale_inbox_subject_check check (char_length(subject) between 1 and 200),
  constraint zentrale_inbox_body_check check (char_length(body) between 10 and 8000),
  constraint zentrale_inbox_email_check check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint zentrale_inbox_name_check check (name is null or char_length(name) <= 200),
  constraint zentrale_inbox_hp_check check (hp is null or hp = '')
);

-- Funktionen -----------------------------------------------------------------
create or replace function public.zentrale_is_admin()
returns boolean language sql stable security definer set search_path to 'public'
as $$ select exists (select 1 from public.zentrale_admins where user_id = auth.uid()) $$;

create or replace function public.zentrale_acquire(p_path text, p_holder text, p_ttl_ms integer)
returns boolean language plpgsql set search_path to 'public'
as $$
declare parts text[]; got integer;
begin
  if not public.zentrale_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  parts := string_to_array(p_path, '/');
  insert into public.zentrale_docs (path, ws, col, doc_id, data)
    values (p_path, parts[2], parts[3], parts[4], '{}'::jsonb) on conflict (path) do nothing;
  update public.zentrale_docs
     set lease_holder = p_holder,
         lease_until = now() + make_interval(secs => least(greatest(p_ttl_ms, 1000), 60000) / 1000.0)
   where path = p_path and (lease_until is null or lease_until < now() or lease_holder = p_holder);
  get diagnostics got = row_count;
  return got > 0;
end $$;

-- Hinweis Advisor (23.11.2026): ohne festen search_path
create or replace function public.zentrale_touch()
returns trigger language plpgsql
as $$
begin
  new.seq := nextval('public.zentrale_seq');
  new.updated_at := now();
  return new;
end $$;

create or replace function public.zentrale_tomb()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  insert into public.zentrale_tombstones (ws, path) values (old.ws, old.path);
  delete from public.zentrale_tombstones where at < now() - interval '90 days';
  return old;
end $$;

create or replace function public.zentrale_inbox_limit()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if (select count(*) from public.zentrale_inbox where created_at > now() - interval '10 minutes') >= 20
     or (select count(*) from public.zentrale_inbox where lower(email) = lower(new.email) and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  delete from public.zentrale_inbox where created_at < now() - interval '60 days';
  return new;
end $$;

-- Trigger --------------------------------------------------------------------
create trigger zentrale_docs_touch before insert or update on public.zentrale_docs
  for each row execute function public.zentrale_touch();
create trigger zentrale_docs_tomb after delete on public.zentrale_docs
  for each row execute function public.zentrale_tomb();
create trigger zentrale_inbox_limit before insert on public.zentrale_inbox
  for each row execute function public.zentrale_inbox_limit();

-- Row Level Security ---------------------------------------------------------
alter table public.zentrale_admins enable row level security;
alter table public.zentrale_docs enable row level security;
alter table public.zentrale_tombstones enable row level security;
alter table public.zentrale_inbox enable row level security;

create policy "admins lesen eigene Zeile" on public.zentrale_admins
  for select to authenticated using (user_id = auth.uid());
create policy "nur admins" on public.zentrale_docs
  for all to authenticated using (public.zentrale_is_admin()) with check (public.zentrale_is_admin());
create policy "nur admins lesen" on public.zentrale_tombstones
  for select to authenticated using (public.zentrale_is_admin());
create policy "admins verwalten eingang" on public.zentrale_inbox
  for all to authenticated using (public.zentrale_is_admin()) with check (public.zentrale_is_admin());
create policy "formular darf einfuegen" on public.zentrale_inbox
  for insert to anon, authenticated with check (hp is null or hp = '');

-- Rechte (Stand Live-Datenbank 24.11.2026) ------------------------------------
grant select on public.zentrale_admins to authenticated;
grant select, insert, update, delete on public.zentrale_docs to authenticated;
grant select on public.zentrale_tombstones to authenticated;
grant select, insert, update, delete on public.zentrale_inbox to authenticated;
grant insert (subject, body, name, email, hp) on public.zentrale_inbox to anon;
grant usage on sequence public.zentrale_seq to authenticated;
grant execute on function public.zentrale_is_admin() to authenticated;
grant execute on function public.zentrale_acquire(text, text, integer) to authenticated;
-- Live zusätzlich vorhanden (Supabase-Standard, über die REST-API nicht nutzbar):
-- TRUNCATE, REFERENCES, TRIGGER für anon auf zentrale_admins und für
-- authenticated auf allen vier Tabellen. Beim Bearbeiten der Advisor-Hinweise
-- mit entziehen.

-- Speicher -------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
  values ('zentrale-docs', 'zentrale-docs', false, 20971520)
  on conflict (id) do nothing;
create policy "zentrale dokumente nur admins" on storage.objects
  for all to authenticated
  using (bucket_id = 'zentrale-docs' and public.zentrale_is_admin())
  with check (bucket_id = 'zentrale-docs' and public.zentrale_is_admin());

-- Danach von Hand: Nutzer hallo@linua.de in Auth anlegen (Passwort trägt Rony
-- selbst ein), Registrierung abschalten, dann
-- insert into public.zentrale_admins (user_id) select id from auth.users where email = 'hallo@linua.de';
