-- =====================================================================
-- Phase 4 — Integrations & data ingest
-- save_later, documents, leetcode_profiles, github_profiles, steps_entries
-- =====================================================================

-- ----- SAVE LATER ---------------------------------------------------
create table if not exists public.save_later (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  url           text not null,
  title         text,
  thumbnail_url text,
  description   text,
  bucket        text not null default 'read'
                check (bucket in ('read','watch','try','build','other')),
  status        text not null default 'pending'
                check (status in ('pending','done','archived')),
  tags          text[],
  notes         text,
  project_id    uuid references public.projects(id) on delete set null,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index if not exists save_later_user_idx on public.save_later(user_id, status, bucket);

-- ----- DOCUMENTS ----------------------------------------------------
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  name         text not null,
  storage_path text not null,
  mime_type    text,
  size_bytes   bigint,
  folder       text,
  project_id   uuid references public.projects(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists documents_user_idx on public.documents(user_id, folder);

-- ----- INTEGRATION PROFILES -----------------------------------------
create table if not exists public.leetcode_profiles (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  username       text not null,
  last_synced    timestamptz,
  total_solved   int,
  easy           int,
  medium         int,
  hard           int,
  ranking        int,
  current_streak int,
  calendar       jsonb
);

create table if not exists public.github_profiles (
  user_id              uuid primary key references public.profiles(id) on delete cascade,
  username             text not null,
  token_encrypted      text,
  last_synced          timestamptz,
  contributions_year   int,
  current_streak       int,
  pinned_repos         jsonb,
  calendar             jsonb
);

create table if not exists public.steps_entries (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  date     date not null,
  count    int not null,
  source   text not null check (source in ('google_fit','health_connect','manual','shortcut')),
  primary key (user_id, date)
);

-- ----- RLS ----------------------------------------------------------
alter table public.save_later         enable row level security;
alter table public.documents          enable row level security;
alter table public.leetcode_profiles  enable row level security;
alter table public.github_profiles    enable row level security;
alter table public.steps_entries      enable row level security;

-- save_later: self + partner read; self mutates
drop policy if exists "save_later_select" on public.save_later;
create policy "save_later_select" on public.save_later
  for select using (public.is_self_or_partner(user_id));
drop policy if exists "save_later_cud_own" on public.save_later;
create policy "save_later_cud_own" on public.save_later
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- documents: same
drop policy if exists "documents_select" on public.documents;
create policy "documents_select" on public.documents
  for select using (public.is_self_or_partner(user_id));
drop policy if exists "documents_cud_own" on public.documents;
create policy "documents_cud_own" on public.documents
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- leetcode_profiles: visible to self + partner; only self mutates (sync writes use service role anyway)
drop policy if exists "leetcode_select" on public.leetcode_profiles;
create policy "leetcode_select" on public.leetcode_profiles
  for select using (public.is_self_or_partner(user_id));
drop policy if exists "leetcode_cud_own" on public.leetcode_profiles;
create policy "leetcode_cud_own" on public.leetcode_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- github_profiles: same; token_encrypted only visible to self via policy split
drop policy if exists "github_select" on public.github_profiles;
create policy "github_select" on public.github_profiles
  for select using (public.is_self_or_partner(user_id));
drop policy if exists "github_cud_own" on public.github_profiles;
create policy "github_cud_own" on public.github_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- steps_entries: same
drop policy if exists "steps_select" on public.steps_entries;
create policy "steps_select" on public.steps_entries
  for select using (public.is_self_or_partner(user_id));
drop policy if exists "steps_cud_own" on public.steps_entries;
create policy "steps_cud_own" on public.steps_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- realtime
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.save_later;        exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.documents;         exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.leetcode_profiles; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.github_profiles;   exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.steps_entries;     exception when duplicate_object then null; end;
  end if;
end $$;
