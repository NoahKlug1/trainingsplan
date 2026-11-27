-- Einmal im Supabase-Dashboard unter "SQL Editor" ausführen.
-- Pro Konto eine Zeile mit dem kompletten App-Stand als JSON.

create table if not exists public.user_state (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

-- Jede:r sieht und ändert nur die eigene Zeile
drop policy if exists "eigene Daten lesen" on public.user_state;
drop policy if exists "eigene Daten anlegen" on public.user_state;
drop policy if exists "eigene Daten ändern" on public.user_state;
drop policy if exists "eigene Daten löschen" on public.user_state;

create policy "eigene Daten lesen" on public.user_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "eigene Daten anlegen" on public.user_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "eigene Daten ändern" on public.user_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "eigene Daten löschen" on public.user_state
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.user_state to authenticated;
revoke all on public.user_state from anon;
