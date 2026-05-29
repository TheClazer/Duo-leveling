# DEPLOYMENT — go-live guide (read when you're ready to ship)

> **Deferred by choice (2026-05-29):** deploy only once the app feels smooth enough
> to daily-drive. This file is the condensed go-live checklist + a snapshot of what's
> built vs deferred. **`SETUP.md`** has the full per-phase detail — this complements it.

## TL;DR critical path
1. Run all DB migrations in order in the Supabase SQL editor — **including the new `0009`** (§A).
2. Create the Storage buckets (§B).
3. Fill env vars locally + on Vercel (§C).
4. Push `main` → import on Vercel → add the cron jobs (§D).
5. Install the PWA on both phones; run the smoke test (§E). ← this is your "is it smooth" gate.

---

## A. Migrations
Run in order (Supabase → SQL Editor), skipping any already applied:

`0001_init` · `0002_fix_profiles_rls_recursion` · `0003_phase2_trackers` ·
`0004_phase3_projects` · `0005_project_summary_rpc` · `0006_phase4_integrations` ·
`0007_phase5_shared` · `0008_phase6_polish` · `0009_fix_github_token_rls` ·
**`0010_mobile_order` ← NEW**

`0009` secures the GitHub token table (owner-only) — harmless even though the GitHub widget
is currently pulled. `0010` adds the `mobile_order` column that powers the mobile long-press
bento reorder; without it, reordering on mobile just won't persist (nothing else breaks).
All migrations are idempotent.

## B. Storage buckets
Create per `SETUP.md` policies: **avatars, memories, project-covers, project-resources**
(these are wired today). Add **posts / surprises** buckets only if you wire media upload,
and **documents** only once the Document Vault is built (see Deferred below).

## C. Environment variables
`.env.example` → `.env.local`, fill, and set the same on Vercel:
- **Required:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`
- **Optional:** `ANTHROPIC_API_KEY` (weekly digest; falls back to a template if absent).
  GitHub token is entered in-app per user, not via env.

Generate VAPID keys + `CRON_SECRET` per `SETUP.md` §6c / §6d.

## D. Vercel + cron
Import the repo, set env vars, deploy `main`. Update Supabase Auth redirect URLs to the
Vercel domain (`SETUP.md` §5). Confirm the crons in `vercel.json` register:
`daily-sync` (1 AM) · `deliver-surprises` (every 10 min) · `recurring-reminders` (8 AM) ·
`weekly-digest` (Sun 9 AM). Cron routes are protected by `CRON_SECRET`.

> **Note:** once deployed and in daily use, the Supabase project stops auto-pausing
> (the idle-pause only happens because today it's only hit from `npm run dev`).

## E. Post-deploy smoke test — the "is it smooth / doesn't kill my mood" gate
On **both phones**, installed as a PWA:
- [ ] Magic-link sign-in works and stays signed in.
- [ ] Invite flow: one invites → the other joins → both appear on `/them`.
- [ ] Quick-add **FAB** (+): checklist item / post / note / link — registers instantly.
- [ ] Habit tap fills instantly; streak correct; day rolls at **IST** midnight (not 5:30am).
- [ ] Create a project, add tasks + a milestone; completing the milestone fires the System Window popup.
- [ ] Feed: a post from one phone shows on the other in real time.
- [ ] A surprise / partner post fires a push notification.
- [ ] Particles stop animating when the app is backgrounded.
- [ ] Dashboards feel fast to open (no long blank wait).

If any of these feels janky, that's the punch-list before you commit to daily use.

---

## Completion snapshot (2026-05-29)
**Built & build-clean (Phases 1–6 minus the items below):** auth · onboarding · couple
linking · habits + heatmap · goals + milestones · daily checklist · journal · **all of
Projects (8 tabs)** · LeetCode + GitHub + Save-Later · full Shared layer (events, bucket,
anniversaries, decisions, memories, gifts, surprises) · posts/feed (realtime) · achievements
+ XP/rank · push · surprise + weekly-digest crons.
Plus the latest fixes branch: SSRF / timezone / optimistic-revert / RLS / achievement-scope
/ invite fixes · latency wins (grid code-split, particle battery, parallel fetches) ·
quick-add **FAB** · `/you` **stats strip** · **milestone celebration** · projects **category
filter** · **promote-goal → project**.

**Intentionally cut for v1:** Steps / Google Fit · Question of the Day · GitHub widget
(auto-sync; pulled 2026-05-29 — backend code left dormant, one-line restore) ·
Document Vault · GitHub commit-sync.

**Not yet built (optional):**
- Kanban drag-between-columns (touch uses the status menu instead) · "ask the system"
  decisions search · event `.ics` export.

**Polish landed 2026-05-29:** mobile hover-hidden row actions made touch-visible · themed
confirm dialogs (no native popups) · bigger tap targets · aria-labels · quick-add FAB ·
/you stats strip · milestone celebration · move-saved-link → project · mobile long-press
bento reorder.

**Not started by choice:** deployment (this guide).
