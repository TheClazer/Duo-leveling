-- =====================================================================
-- Phase 2 — Core personal trackers
-- habits, habit_entries, goals, milestones, checklist_items, notes,
-- dashboard_layouts + RLS for all.
-- =====================================================================

-- ----- HABITS --------------------------------------------------------
create table if not exists public.habits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  color           text default 'accent',
  icon            text,
  target_per_week int  not null default 7 check (target_per_week between 1 and 7),
  archived        boolean not null default false,
  order_idx       int  not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists habits_user_idx on public.habits(user_id, archived, order_idx);

create table if not exists public.habit_entries (
  id        uuid primary key default gen_random_uuid(),
  habit_id  uuid not null references public.habits(id) on delete cascade,
  date      date not null,
  value     numeric not null default 1,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);
create index if not exists habit_entries_habit_date_idx on public.habit_entries(habit_id, date);

-- ----- GOALS + MILESTONES -------------------------------------------
create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text,
  deadline      date,
  category      text,
  progress      int  not null default 0 check (progress between 0 and 100),
  is_shared     boolean not null default false,
  -- promoted_to_project FK added in Phase 3 when projects table exists
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists goals_user_idx on public.goals(user_id, completed_at);

create table if not exists public.milestones (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references public.goals(id) on delete cascade,
  title      text not null,
  done       boolean not null default false,
  order_idx  int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists milestones_goal_idx on public.milestones(goal_id, order_idx);

-- ----- CHECKLIST -----------------------------------------------------
create table if not exists public.checklist_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  date        date not null,
  recurring   text not null default 'none'
              check (recurring in ('none','daily','weekdays','weekly','custom')),
  done        boolean not null default false,
  carry_over  boolean not null default true,
  -- project_id FK added in Phase 3
  order_idx   int not null default 0,
  created_at  timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists checklist_user_date_idx on public.checklist_items(user_id, date, done);

-- ----- NOTES / JOURNAL ----------------------------------------------
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  date        date not null default current_date,
  tags        text[],
  is_private  boolean not null default false,
  -- project_id FK added in Phase 3
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists notes_user_date_idx on public.notes(user_id, date desc);

-- ----- DASHBOARD LAYOUTS --------------------------------------------
create table if not exists public.dashboard_layouts (
  user_id   uuid primary key references public.profiles(id) on delete cascade,
  layout    jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ----- updated_at triggers ------------------------------------------
drop trigger if exists goals_touch on public.goals;
create trigger goals_touch before update on public.goals
  for each row execute function public.touch_updated_at();

drop trigger if exists notes_touch on public.notes;
create trigger notes_touch before update on public.notes
  for each row execute function public.touch_updated_at();

drop trigger if exists dashboard_layouts_touch on public.dashboard_layouts;
create trigger dashboard_layouts_touch before update on public.dashboard_layouts
  for each row execute function public.touch_updated_at();

-- ----- RLS ----------------------------------------------------------
alter table public.habits            enable row level security;
alter table public.habit_entries     enable row level security;
alter table public.goals             enable row level security;
alter table public.milestones        enable row level security;
alter table public.checklist_items   enable row level security;
alter table public.notes             enable row level security;
alter table public.dashboard_layouts enable row level security;

-- helper: is the given user_id either me or my partner?
create or replace function public.is_self_or_partner(uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select uid = auth.uid()
      or exists (
        select 1 from public.profiles p
        where p.id = uid
          and p.couple_id is not null
          and p.couple_id = public.my_couple_id()
      )
$$;
grant execute on function public.is_self_or_partner(uuid) to authenticated;

-- habits
drop policy if exists "habits_select" on public.habits;
create policy "habits_select" on public.habits
  for select using (public.is_self_or_partner(user_id));
drop policy if exists "habits_cud_own" on public.habits;
create policy "habits_cud_own" on public.habits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- habit_entries (visible if their habit is visible; mutable only if mine)
drop policy if exists "habit_entries_select" on public.habit_entries;
create policy "habit_entries_select" on public.habit_entries
  for select using (
    habit_id in (select id from public.habits where public.is_self_or_partner(user_id))
  );
drop policy if exists "habit_entries_cud_own" on public.habit_entries;
create policy "habit_entries_cud_own" on public.habit_entries
  for all using (
    habit_id in (select id from public.habits where user_id = auth.uid())
  ) with check (
    habit_id in (select id from public.habits where user_id = auth.uid())
  );

-- goals + milestones
drop policy if exists "goals_select" on public.goals;
create policy "goals_select" on public.goals
  for select using (public.is_self_or_partner(user_id));
drop policy if exists "goals_cud_own" on public.goals;
create policy "goals_cud_own" on public.goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "milestones_select" on public.milestones;
create policy "milestones_select" on public.milestones
  for select using (
    goal_id in (select id from public.goals where public.is_self_or_partner(user_id))
  );
drop policy if exists "milestones_cud_own" on public.milestones;
create policy "milestones_cud_own" on public.milestones
  for all using (
    goal_id in (select id from public.goals where user_id = auth.uid())
  ) with check (
    goal_id in (select id from public.goals where user_id = auth.uid())
  );

-- checklist
drop policy if exists "checklist_select" on public.checklist_items;
create policy "checklist_select" on public.checklist_items
  for select using (public.is_self_or_partner(user_id));
drop policy if exists "checklist_cud_own" on public.checklist_items;
create policy "checklist_cud_own" on public.checklist_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notes: owner sees all; partner sees only non-private
drop policy if exists "notes_select" on public.notes;
create policy "notes_select" on public.notes
  for select using (
    user_id = auth.uid()
    or (is_private = false and public.is_self_or_partner(user_id))
  );
drop policy if exists "notes_cud_own" on public.notes;
create policy "notes_cud_own" on public.notes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- dashboard_layouts: each user owns their own
drop policy if exists "layouts_select" on public.dashboard_layouts;
create policy "layouts_select" on public.dashboard_layouts
  for select using (user_id = auth.uid());
drop policy if exists "layouts_cud_own" on public.dashboard_layouts;
create policy "layouts_cud_own" on public.dashboard_layouts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----- Realtime publication (best-effort, idempotent) ----------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.habits;          exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.habit_entries;   exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.goals;           exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.milestones;      exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.checklist_items; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.notes;           exception when duplicate_object then null; end;
  end if;
end $$;
