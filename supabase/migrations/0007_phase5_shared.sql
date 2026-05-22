-- =====================================================================
-- Phase 5 — Shared layer (Bible §8 + §7.11)
-- events, bucket_items, recurring_dates, decisions, memories,
-- gift_ideas, posts (+ reactions + comments).
-- =====================================================================

-- ----- events --------------------------------------------------------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples(id) on delete cascade,
  title       text not null,
  datetime    timestamptz not null,
  location    text,
  notes       text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists events_couple_dt_idx on public.events(couple_id, datetime);

-- ----- bucket_items --------------------------------------------------
create table if not exists public.bucket_items (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples(id) on delete cascade,
  title        text not null,
  description  text,
  category     text,
  status       text not null default 'dream' check (status in ('dream','planning','done')),
  photo_url    text,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists bucket_couple_idx on public.bucket_items(couple_id, status);

-- ----- recurring_dates -----------------------------------------------
create table if not exists public.recurring_dates (
  id                   uuid primary key default gen_random_uuid(),
  couple_id            uuid not null references public.couples(id) on delete cascade,
  title                text not null,
  anchor_date          date not null,
  type                 text not null default 'anniversary'
                       check (type in ('anniversary','birthday','monthly','custom')),
  reminder_days_before int not null default 1,
  created_at           timestamptz not null default now()
);
create index if not exists recurring_couple_idx on public.recurring_dates(couple_id, anchor_date);

-- ----- decisions -----------------------------------------------------
create table if not exists public.decisions (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples(id) on delete cascade,
  decision_text text not null,
  context       text,
  tags          text[],
  decided_at    date not null default current_date,
  project_id    uuid references public.projects(id) on delete set null,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists decisions_couple_idx on public.decisions(couple_id, decided_at desc);

-- ----- memories ------------------------------------------------------
create table if not exists public.memories (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references public.couples(id) on delete cascade,
  photo_url       text not null,
  caption         text,
  date_of_memory  date not null default current_date,
  uploaded_by     uuid references public.profiles(id) on delete set null,
  uploaded_at     timestamptz not null default now()
);
create index if not exists memories_couple_idx on public.memories(couple_id, date_of_memory desc);

-- ----- gift_ideas (private to giver) ---------------------------------
create table if not exists public.gift_ideas (
  id          uuid primary key default gen_random_uuid(),
  for_user_id uuid not null references public.profiles(id) on delete cascade,
  by_user_id  uuid not null references public.profiles(id) on delete cascade,
  idea_text   text not null,
  link_url    text,
  status      text not null default 'idea' check (status in ('idea','bought','given','dismissed')),
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists gift_ideas_by_idx on public.gift_ideas(by_user_id, status);

-- ----- posts + reactions + comments (Bible §7.11) --------------------
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  content     text,
  media_urls  text[],
  project_id  uuid references public.projects(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists posts_user_idx on public.posts(user_id, created_at desc);
create index if not exists posts_project_idx on public.posts(project_id, created_at desc) where project_id is not null;

create table if not exists public.post_reactions (
  id        uuid primary key default gen_random_uuid(),
  post_id   uuid not null references public.posts(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  emoji     text not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id, emoji)
);

create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx on public.post_comments(post_id, created_at);

-- ----- RLS ----------------------------------------------------------
alter table public.events           enable row level security;
alter table public.bucket_items     enable row level security;
alter table public.recurring_dates  enable row level security;
alter table public.decisions        enable row level security;
alter table public.memories         enable row level security;
alter table public.gift_ideas       enable row level security;
alter table public.posts            enable row level security;
alter table public.post_reactions   enable row level security;
alter table public.post_comments    enable row level security;

-- Couple-scoped tables (events, bucket, recurring_dates, decisions, memories):
-- both partners can read + write.
do $$
declare
  t text;
  ts text[] := array['events','bucket_items','recurring_dates','decisions','memories'];
begin
  foreach t in array ts loop
    execute format('drop policy if exists "%s_select" on public.%I', t, t);
    execute format($f$
      create policy "%s_select" on public.%I
        for select using (couple_id = public.my_couple_id())
    $f$, t, t);
    execute format('drop policy if exists "%s_cud" on public.%I', t, t);
    execute format($f$
      create policy "%s_cud" on public.%I
        for all using (couple_id = public.my_couple_id())
                with check (couple_id = public.my_couple_id())
    $f$, t, t);
  end loop;
end $$;

-- gift_ideas: visible ONLY to the giver. Never to recipient.
drop policy if exists "gift_ideas_select" on public.gift_ideas;
create policy "gift_ideas_select" on public.gift_ideas
  for select using (by_user_id = auth.uid());
drop policy if exists "gift_ideas_cud" on public.gift_ideas;
create policy "gift_ideas_cud" on public.gift_ideas
  for all using (by_user_id = auth.uid()) with check (by_user_id = auth.uid());

-- posts: both partners read; only author mutates
drop policy if exists "posts_select" on public.posts;
create policy "posts_select" on public.posts
  for select using (public.is_self_or_partner(user_id));
drop policy if exists "posts_cud_own" on public.posts;
create policy "posts_cud_own" on public.posts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- post_reactions / post_comments: visible if the post is visible; only author mutates
drop policy if exists "reactions_select" on public.post_reactions;
create policy "reactions_select" on public.post_reactions
  for select using (
    post_id in (select id from public.posts where public.is_self_or_partner(user_id))
  );
drop policy if exists "reactions_cud_own" on public.post_reactions;
create policy "reactions_cud_own" on public.post_reactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "comments_select" on public.post_comments;
create policy "comments_select" on public.post_comments
  for select using (
    post_id in (select id from public.posts where public.is_self_or_partner(user_id))
  );
drop policy if exists "comments_cud_own" on public.post_comments;
create policy "comments_cud_own" on public.post_comments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- realtime
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.events;          exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.bucket_items;    exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.recurring_dates; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.decisions;       exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.memories;        exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.gift_ideas;      exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.posts;           exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.post_reactions;  exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.post_comments;   exception when duplicate_object then null; end;
  end if;
end $$;
