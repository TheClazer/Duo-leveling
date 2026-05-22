-- =====================================================================
-- The System / Duo Leveling — Phase 1 schema
-- profiles, couples, couple_invites + RLS
-- Subsequent phases add more tables via 0002+.sql
-- =====================================================================

create extension if not exists "pgcrypto";

-- ----- profiles -------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users on delete cascade,
  display_name    text not null,
  theme           text not null check (theme in ('jinwoo','chahaein')),
  avatar_url      text,
  tagline         text,
  about           text,
  couple_id       uuid,
  level           int  not null default 1,
  xp              int  not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ----- couples --------------------------------------------------------
create table if not exists public.couples (
  id            uuid primary key default gen_random_uuid(),
  user_a        uuid references public.profiles(id) on delete cascade,
  user_b        uuid references public.profiles(id) on delete cascade,
  started_date  date,
  created_at    timestamptz not null default now()
);

-- back-reference profiles.couple_id → couples.id (added after couples exists)
alter table public.profiles
  drop constraint if exists profiles_couple_fk,
  add  constraint profiles_couple_fk
    foreign key (couple_id) references public.couples(id) on delete set null;

create index if not exists profiles_couple_idx on public.profiles(couple_id);
create index if not exists couples_user_a_idx  on public.couples(user_a);
create index if not exists couples_user_b_idx  on public.couples(user_b);

-- ----- couple_invites -------------------------------------------------
create table if not exists public.couple_invites (
  id          uuid primary key default gen_random_uuid(),
  from_user   uuid not null references public.profiles(id) on delete cascade,
  token       text unique not null,
  used        boolean not null default false,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists couple_invites_token_idx on public.couple_invites(token);

-- ----- updated_at trigger ---------------------------------------------
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ----- RLS ------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.couples        enable row level security;
alter table public.couple_invites enable row level security;

-- Helper: returns caller's couple_id WITHOUT triggering RLS on profiles.
-- security definer runs as the function owner (postgres) so RLS is bypassed
-- for the single-row lookup. Without this, the partner-visibility policy
-- below would recurse (policy → subquery on profiles → policy → ...).
create or replace function public.my_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from public.profiles where id = auth.uid()
$$;
grant execute on function public.my_couple_id() to authenticated;

-- profiles: read self + partner; insert/update only self
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or (couple_id is not null and couple_id = public.my_couple_id())
  );

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- couples: read/update only if member
drop policy if exists "couples_select_member" on public.couples;
create policy "couples_select_member" on public.couples
  for select using (user_a = auth.uid() or user_b = auth.uid());

drop policy if exists "couples_insert_self" on public.couples;
create policy "couples_insert_self" on public.couples
  for insert with check (user_a = auth.uid() or user_b = auth.uid());

drop policy if exists "couples_update_member" on public.couples;
create policy "couples_update_member" on public.couples
  for update using (user_a = auth.uid() or user_b = auth.uid());

-- couple_invites: sender CRUD; partner accepts via server-side service-role route
drop policy if exists "invites_select_own" on public.couple_invites;
create policy "invites_select_own" on public.couple_invites
  for select using (from_user = auth.uid());

drop policy if exists "invites_insert_self" on public.couple_invites;
create policy "invites_insert_self" on public.couple_invites
  for insert with check (from_user = auth.uid());

drop policy if exists "invites_update_own" on public.couple_invites;
create policy "invites_update_own" on public.couple_invites
  for update using (from_user = auth.uid());

-- ----- Realtime publication (turn on for partner-aware views) ---------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.profiles;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.couples;
    exception when duplicate_object then null; end;
  end if;
end $$;
