# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## The Bible is the source of truth

`THE_BIBLE.pdf` (v2.0, lives at `C:\Users\Rayyan Shaikh\Desktop\THE_BIBLE.pdf`, sections §0–§18 + appendices) is the spec. Read it before making architectural decisions. Section references throughout this file (e.g. "Bible §9") point there.

This is a **two-person private app** — Rayyan (Shadow Monarch / `jinwoo` theme) and Harshita (S-Rank Hunter / `chahaein` theme). Codename **The System** (Bible §0, Appendix A). Repo: `github.com/TheClazer/Duo-leveling`.

**Build phase-by-phase per Bible §15.** Each phase has a "Done when" criterion — do not skip ahead. Current state: Phase 2 (Core personal trackers) just landed; Phase 3 (Projects, the centerpiece — §9) is next.

## Commands

```powershell
# Install / update deps (use npm, not pnpm — packageManager hint is ignored)
npm install

# Dev (Next.js + Supabase from .env.local)
npm run dev

# Production build
npm run build
npm start

# Lint + typecheck
npm run lint
npm run typecheck
```

There are **no tests in this repo** (Phase 6 may add some). Verification is manual: walk through the user flow in the browser after each change.

**Never run `npm audit fix --force`** — it would upgrade Next to v16 and break the App Router conventions everything is built on. The remaining audit warnings are acceptable for a private 2-user app; see `memory/feedback_npm_audit.md` for full reasoning.

## Architecture — big picture

**Stack (Bible §11, locked):** Next.js 14 App Router + TypeScript strict, Tailwind w/ CSS-variable themes, shadcn-style primitives, Framer Motion, react-grid-layout (desktop bento), @dnd-kit (mobile reorder, Phase 2+), Supabase (Postgres + Auth + Storage + Realtime + RLS), next-pwa, deployed on Vercel.

### Theming system (Bible §5)

Three themes — `jinwoo`, `chahaein`, `shared` — defined as CSS custom properties in `app/globals.css` under `[data-theme="..."]` selectors. The `<html>` tag carries the active theme attribute. Tailwind reads them via `rgb(var(--accent-primary) / <alpha-value>)` patterns in `tailwind.config.ts`.

- Root layout (`app/layout.tsx`) sets `data-theme="jinwoo"` as the SSR default to avoid flash.
- `(app)/layout.tsx` reads the user's `profiles.theme` and passes it to `<ThemeProvider initial={...}>`.
- The `/them` and `/shared` pages use `<ThemeSwap theme="...">` to switch on mount and **restore on unmount** so theme stays correct as the user navigates back.

### Server / Client / Service Supabase clients

Three flavors of Supabase client, each for a specific context:

| Helper | When | Why |
|---|---|---|
| `lib/supabase/client.ts` → `createClient()` | Client components (`"use client"`) | Browser-side, uses anon key, RLS enforced |
| `lib/supabase/server.ts` → `createClient()` | Server components, server actions, API routes | Server-side with cookie-based session, RLS enforced |
| `lib/supabase/server.ts` → `createServiceClient()` | API routes that need to bypass RLS (e.g. `/api/invites/accept` reading invites the accepter can't normally see) | Uses `SUPABASE_SERVICE_ROLE_KEY` — **never expose to the browser** |

The middleware (`middleware.ts` → `lib/supabase/middleware.ts`) refreshes the session on every request and redirects unauthenticated users to `/login` or authenticated-but-no-profile users to `/onboarding`.

### Widget pattern — Server + Client pair

Every dashboard widget is split into two files to balance SSR perf with interactivity:

- `components/widgets/Foo.tsx` — server component. Fetches initial data via the server Supabase client, passes to the client wrapper.
- `components/widgets/Foo.client.tsx` — `"use client"` component. Renders, handles user interaction with **optimistic updates** (update state immediately, send DB call in background, revert on error).

Examples: `HabitsHeatmap` / `HabitsHeatmap.client`, `Goals` / `Goals.client`, `DailyChecklist` / `DailyChecklist.client`, `Journal` / `Journal.client`. **Follow this pattern for all new widgets.**

### Bento dashboard (`components/layout/BentoGrid.tsx`)

Widgets on `/you` and `/them` are wrapped in a `<BentoGrid>` that uses `react-grid-layout` on desktop (drag + resize, layout persisted to `dashboard_layouts.layout` JSONB column with a 600ms debounce) and a simple vertical stack on mobile (mobile reorder is Phase 6 polish).

Each widget gets an `id` (e.g. `"habits"`) and a `defaultLayout` (`{x, y, w, h}` in 6-column grid units). When `readOnly` (i.e. viewing partner via `/them`), drag/resize is disabled.

### Row Level Security (critical)

Every table has RLS enabled. Two helper functions power the partner-visibility rules without recursion:

- `public.my_couple_id()` (introduced in `0002_fix_profiles_rls_recursion.sql`) — `security definer`, returns the caller's `couple_id`. Bypasses RLS internally to avoid the profiles policy recursing on itself.
- `public.is_self_or_partner(uid)` (introduced in `0003_phase2_trackers.sql`) — returns true if `uid` is the caller or the caller's partner. Used by `habits_select`, `goals_select`, `checklist_select`, etc.

**When adding a new table that should be visible to both partners but writable only by the owner**, follow the pattern:

```sql
alter table public.foo enable row level security;
create policy "foo_select" on public.foo
  for select using (public.is_self_or_partner(user_id));
create policy "foo_cud_own" on public.foo
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

For tables that join through a parent (e.g. `habit_entries → habits`), check the parent's `user_id` via subquery.

### Migrations (`supabase/migrations/`)

Numbered SQL files run in order via the Supabase SQL Editor (or `supabase db push` if the CLI is set up). **Migrations are idempotent** — they use `if not exists`, `drop policy if exists`, and `do $$ ... exception when duplicate_object then null; end $$` for publication adds. Safe to re-run.

- `0001_init.sql` — profiles, couples, couple_invites + the original (broken) RLS, now fixed inline.
- `0002_fix_profiles_rls_recursion.sql` — adds `my_couple_id()`, replaces the recursive policy.
- `0003_phase2_trackers.sql` — habits, habit_entries, goals, milestones, checklist_items, notes, dashboard_layouts + `is_self_or_partner()`.

**Don't edit a migration after it's been run in production.** Add a new numbered file. (For dev-only fixes when the user is the sole user, editing inline is acceptable and was done for 0001.)

### Auth + onboarding flow

1. `/login` — magic link or Google OAuth via `supabase.auth.signInWithOtp` / `signInWithOAuth`.
2. `/auth/callback` — server route that exchanges the code for a session.
3. Middleware sees authed user with no `profiles` row → redirects to `/onboarding`.
4. Onboarding form **upserts** the profile (idempotent — handles accidental double-submits) and uploads avatar to the `avatars` storage bucket if provided.
5. If `?invite=<token>` was in the URL chain, the form also POSTs to `/api/invites/accept` which uses the service client to read the invite, create a `couples` row, and link both profiles.
6. Successful onboarding does `window.location.href = "/you"` (full reload, NOT `router.push`) so the new auth cookies and freshly-created profile are picked up by middleware on the next request.

### Phase-1 decisions (locked) — see `memory/decisions_phase1.md`

- **No QOTD** (Question of the Day) tables/widget — deferred from Phase 5.
- **Both Android** — no iOS Shortcut webhook needed for Phase 4 steps integration.
- **Personal projects partner-read-only** — no `is_hidden` flag.
- **Task assignment notifications**: on, but per-project mute setting.

If revisiting any of these, update the memory file rather than silently changing behavior.

## Common gotchas

- **`useSearchParams()` requires a Suspense boundary.** Pattern: split the client logic into a `Foo.tsx` (default export wraps `<Suspense><FooInner/></Suspense>`) + `FooInner.tsx` (the `"use client"` body). See `app/(auth)/login/page.tsx` + `LoginForm.tsx`.
- **`router.push` vs `window.location.href`**: after a mutation that changes auth state or creates a profile row, prefer `window.location.href` to force a full reload — `router.push` doesn't always refresh middleware-read cookies in time.
- **Server Component data fetching**: every `app/(app)/.../page.tsx` calls `supabase.from(...)` directly via the server client. No client-side data libraries (no SWR, no React Query) — RLS makes direct queries safe and avoids extra plumbing. This may change in Phase 4 when sync data gets complex.
- **Hard-navigate after a sign-in flow change** (onboarding completion, invite acceptance) to avoid stale cookies.
- **`@dnd-kit` is installed but not yet wired** — Phase 2 only ships the desktop drag (`react-grid-layout`) and a static mobile stack. Mobile long-press reorder is Phase 6 polish per Bible §10.5.

## Memory system

`C:\Users\Rayyan Shaikh\.claude\projects\C--Users-Rayyan-Shaikh-Desktop-Duo-leveling-Duo-leveling\memory\` holds persistent context (user profile, locked decisions, feedback). `MEMORY.md` is the index — read it first. Key entries:

- `decisions_phase1.md` — locked answers to Bible §17 open questions.
- `build_approach.md` — phased build is mandatory; don't skip ahead.
- `feedback_teaching_mode.md` — explain every new technical term inline; the user is learning full-stack as we build.
- `feedback_npm_audit.md` — do not run `audit fix --force`.
- `feedback_visual_ambition.md` — push polish proactively; YouLeft-tier typography + Solo Leveling RPG-UI feel.
