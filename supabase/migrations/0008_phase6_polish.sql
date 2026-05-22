-- =====================================================================
-- Phase 6 — Polish & Surprise Layer (Bible §7.10, §8.8, §10.3)
-- achievements, surprises, push_subscriptions
-- =====================================================================

-- ----- achievements --------------------------------------------------
create table if not exists public.achievements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  code        text not null,
  unlocked_at timestamptz not null default now(),
  data        jsonb,
  pinned      boolean not null default false,
  unique (user_id, code)
);
create index if not exists achievements_user_idx on public.achievements(user_id, unlocked_at desc);

-- ----- surprises (scheduled future-delivery notes) -------------------
create table if not exists public.surprises (
  id           uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id   uuid not null references public.profiles(id) on delete cascade,
  content      text,
  media_url    text,
  deliver_at   timestamptz not null,
  delivered    boolean not null default false,
  opened_at    timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists surprises_deliver_idx on public.surprises(deliver_at, delivered);
create index if not exists surprises_to_idx on public.surprises(to_user_id, delivered);

-- ----- push subscriptions --------------------------------------------
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists push_subs_user_idx on public.push_subscriptions(user_id);

-- ----- RLS ----------------------------------------------------------
alter table public.achievements        enable row level security;
alter table public.surprises           enable row level security;
alter table public.push_subscriptions  enable row level security;

-- achievements: self + partner read; self mutates (sync engine writes via service role)
drop policy if exists "achievements_select" on public.achievements;
create policy "achievements_select" on public.achievements
  for select using (public.is_self_or_partner(user_id));
drop policy if exists "achievements_cud_own" on public.achievements;
create policy "achievements_cud_own" on public.achievements
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- surprises: sender always sees own; recipient sees only AFTER deliver_at
drop policy if exists "surprises_select" on public.surprises;
create policy "surprises_select" on public.surprises
  for select using (
    from_user_id = auth.uid()
    or (to_user_id = auth.uid() and deliver_at <= now() and delivered = true)
  );
drop policy if exists "surprises_insert_sender" on public.surprises;
create policy "surprises_insert_sender" on public.surprises
  for insert with check (from_user_id = auth.uid());
drop policy if exists "surprises_update_sender" on public.surprises;
create policy "surprises_update_sender" on public.surprises
  for update using (from_user_id = auth.uid());
drop policy if exists "surprises_delete_sender" on public.surprises;
create policy "surprises_delete_sender" on public.surprises
  for delete using (from_user_id = auth.uid());

-- push_subscriptions: self only
drop policy if exists "push_subs_select_own" on public.push_subscriptions;
create policy "push_subs_select_own" on public.push_subscriptions
  for select using (user_id = auth.uid());
drop policy if exists "push_subs_cud_own" on public.push_subscriptions;
create policy "push_subs_cud_own" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- realtime
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.achievements; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.surprises;    exception when duplicate_object then null; end;
  end if;
end $$;
