-- =====================================================================
-- Phase 3 — Projects (Bible §9)
-- projects + tasks + milestones + notes + resources + time_logs +
-- updates + activity, plus RLS for personal-vs-shared visibility.
-- =====================================================================

-- ----- projects ------------------------------------------------------
create table if not exists public.projects (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  couple_id       uuid references public.couples(id) on delete set null,
  is_shared       boolean not null default false,
  title           text not null,
  description     text,
  cover_image_url text,
  status          text not null default 'idea'
                  check (status in ('idea','active','paused','done','archived')),
  progress_pct    int  not null default 0 check (progress_pct between 0 and 100),
  category        text,
  tags            text[],
  target_date     date,
  github_repo     text,
  linked_goal_id  uuid references public.goals(id) on delete set null,
  pinned          boolean not null default false,
  notify_on_assign boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  completed_at    timestamptz
);
create index if not exists projects_owner_idx on public.projects(owner_id, status);
create index if not exists projects_couple_idx on public.projects(couple_id, status) where is_shared;
create index if not exists projects_pinned_idx on public.projects(pinned, updated_at desc);

-- Back-link goals.promoted_to_project now that projects exists.
-- Add the column first (separate statement so it works in plain SQL),
-- then add the FK constraint inside a DO block so we can ignore duplicate-object on re-run.
alter table public.goals
  add column if not exists promoted_to_project uuid;

do $$
begin
  begin
    alter table public.goals
      add constraint goals_promoted_to_project_fk
      foreign key (promoted_to_project) references public.projects(id) on delete set null;
  exception when duplicate_object then null;
  end;
end $$;

-- Back-link checklist_items.project_id and notes.project_id
alter table public.checklist_items
  add column if not exists project_id uuid references public.projects(id) on delete set null;

alter table public.notes
  add column if not exists project_id uuid references public.projects(id) on delete set null;

-- ----- project_tasks -------------------------------------------------
create table if not exists public.project_tasks (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  title           text not null,
  description     text,
  done            boolean not null default false,
  assigned_to     uuid references public.profiles(id) on delete set null,
  due_date        date,
  priority        text check (priority in ('low','med','high')),
  status          text not null default 'todo' check (status in ('todo','doing','done')),
  order_idx       int  not null default 0,
  parent_task_id  uuid references public.project_tasks(id) on delete cascade,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);
create index if not exists project_tasks_project_idx on public.project_tasks(project_id, status, order_idx);
create index if not exists project_tasks_parent_idx on public.project_tasks(parent_task_id);

-- ----- project_milestones --------------------------------------------
create table if not exists public.project_milestones (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  title        text not null,
  description  text,
  target_date  date,
  done         boolean not null default false,
  completed_at timestamptz,
  order_idx    int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists project_milestones_project_idx on public.project_milestones(project_id, target_date);

-- ----- project_notes -------------------------------------------------
create table if not exists public.project_notes (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  title           text,
  content         text not null default '',
  pinned          boolean not null default false,
  created_by      uuid references public.profiles(id) on delete set null,
  last_edited_by  uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists project_notes_project_idx on public.project_notes(project_id, pinned desc, updated_at desc);

-- ----- project_resources ---------------------------------------------
create table if not exists public.project_resources (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  type           text not null check (type in ('link','file','image','embed')),
  url            text not null,
  title          text,
  description    text,
  thumbnail_url  text,
  category       text,
  added_by       uuid references public.profiles(id) on delete set null,
  added_at       timestamptz not null default now()
);
create index if not exists project_resources_project_idx on public.project_resources(project_id, added_at desc);

-- ----- project_time_logs ---------------------------------------------
create table if not exists public.project_time_logs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  started_at  timestamptz not null,
  ended_at    timestamptz,
  minutes     int,
  summary     text,
  source      text not null default 'timer' check (source in ('timer','manual'))
);
create index if not exists project_time_logs_project_idx on public.project_time_logs(project_id, started_at desc);
create index if not exists project_time_logs_running_idx on public.project_time_logs(user_id, ended_at) where ended_at is null;

-- ----- project_updates -----------------------------------------------
create table if not exists public.project_updates (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  media_urls  text[],
  created_at  timestamptz not null default now()
);
create index if not exists project_updates_project_idx on public.project_updates(project_id, created_at desc);

-- ----- project_activity ----------------------------------------------
create table if not exists public.project_activity (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  action      text not null,
  target_id   uuid,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists project_activity_project_idx on public.project_activity(project_id, created_at desc);

-- ----- updated_at triggers ------------------------------------------
drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists project_notes_touch on public.project_notes;
create trigger project_notes_touch before update on public.project_notes
  for each row execute function public.touch_updated_at();

-- ----- Helpers for project access -----------------------------------
-- Can the caller READ this project? (owner, shared partner, or shared via couple)
create or replace function public.can_read_project(p_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_id
      and (
        p.owner_id = auth.uid()
        or (p.is_shared and p.couple_id is not null and p.couple_id = public.my_couple_id())
        or (not p.is_shared and exists (
              select 1 from public.profiles me
              join public.profiles ow on ow.id = p.owner_id
              where me.id = auth.uid()
                and me.couple_id is not null
                and me.couple_id = ow.couple_id
        ))
      )
  )
$$;
grant execute on function public.can_read_project(uuid) to authenticated;

-- Can the caller WRITE this project's contents?
-- (owner always; partner only if shared)
create or replace function public.can_write_project(p_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_id
      and (
        p.owner_id = auth.uid()
        or (p.is_shared and p.couple_id is not null and p.couple_id = public.my_couple_id())
      )
  )
$$;
grant execute on function public.can_write_project(uuid) to authenticated;

-- ----- RLS ----------------------------------------------------------
alter table public.projects           enable row level security;
alter table public.project_tasks      enable row level security;
alter table public.project_milestones enable row level security;
alter table public.project_notes      enable row level security;
alter table public.project_resources  enable row level security;
alter table public.project_time_logs  enable row level security;
alter table public.project_updates    enable row level security;
alter table public.project_activity   enable row level security;

-- projects: select per access rules above; write per write rule
drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects
  for select using (
    owner_id = auth.uid()
    or (is_shared and couple_id is not null and couple_id = public.my_couple_id())
    or (not is_shared and exists (
          select 1 from public.profiles me
          join public.profiles ow on ow.id = projects.owner_id
          where me.id = auth.uid()
            and me.couple_id is not null
            and me.couple_id = ow.couple_id
       ))
  );

drop policy if exists "projects_insert_self" on public.projects;
create policy "projects_insert_self" on public.projects
  for insert with check (owner_id = auth.uid());

drop policy if exists "projects_update_writer" on public.projects;
create policy "projects_update_writer" on public.projects
  for update using (
    owner_id = auth.uid()
    or (is_shared and couple_id is not null and couple_id = public.my_couple_id())
  );

drop policy if exists "projects_delete_owner" on public.projects;
create policy "projects_delete_owner" on public.projects
  for delete using (owner_id = auth.uid());

-- child tables: same read/write rules via project_id
-- helper macro implemented as repeated policies
do $$
declare
  child_table text;
  children text[] := array[
    'project_tasks','project_milestones','project_notes','project_resources',
    'project_time_logs','project_updates','project_activity'
  ];
begin
  foreach child_table in array children
  loop
    execute format('drop policy if exists "%s_select" on public.%I', child_table, child_table);
    execute format($f$
      create policy "%s_select" on public.%I
        for select using (public.can_read_project(project_id))
    $f$, child_table, child_table);

    execute format('drop policy if exists "%s_cud" on public.%I', child_table, child_table);
    execute format($f$
      create policy "%s_cud" on public.%I
        for all using (public.can_write_project(project_id))
                with check (public.can_write_project(project_id))
    $f$, child_table, child_table);
  end loop;
end $$;

-- ----- Realtime publication (idempotent) ----------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.projects;           exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.project_tasks;      exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.project_milestones; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.project_notes;      exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.project_resources;  exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.project_time_logs;  exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.project_updates;    exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.project_activity;   exception when duplicate_object then null; end;
  end if;
end $$;
