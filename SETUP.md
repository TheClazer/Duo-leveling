# SETUP — manual checklist

Things only you can do (Claude can't click buttons in your dashboards or generate raster PNGs).
This file grows as new phases land. Skim to the phase you're on; earlier sections are documented for reference + onboarding a new device.

**Current status** (update as you go):
- ✅ Phase 1 — Foundation
- ✅ Phase 2 — Core personal trackers
- ✅ Phase 3 — Projects
- ✅ Phase 4 — Integrations (LeetCode + GitHub + Save Later)
- ✅ Phase 5 — Shared layer (Events, Bucket, Memories, Anniversaries, Decisions, Gift Ideas, Surprises, Feed)
- ⏳ Phase 6 — Polish (Achievements engine, XP/Level, Surprise sender, Cron, Push notifications, Weekly digest)
- ⬜ Deploy to Vercel + install PWA on both phones

---

# Phase 1 — Foundation (done if you're already signed in)

> Done when: both partners sign in, see each other's empty themed dashboards on their phones (PWA installed).

## 1. Install pnpm + dependencies

If pnpm isn't installed yet:

```powershell
npm install -g pnpm
```

Then inside the project root:

```powershell
pnpm install
```

If pnpm complains about lockfile platform issues on Windows, run it from a normal PowerShell (not WSL).

---

## 2. Supabase project

1. Go to <https://supabase.com> → **New project**.
   - Name: `the-system` (or anything).
   - Region: closest to you (Mumbai/Singapore for IST users).
   - Database password: generate, store in a password manager.
2. Wait for provisioning (~2 min).
3. Open **Project Settings → API**:
   - Copy `Project URL` → that's `NEXT_PUBLIC_SUPABASE_URL`.
   - Copy `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Copy `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`. **Never expose this to the client.**

### 2a. Run the migration

Easy path (Supabase dashboard):

1. Open **SQL Editor → New query**.
2. Paste the contents of `supabase/migrations/0001_init.sql`.
3. Run it. Should complete cleanly. If you re-run, it's idempotent.

CLI path (optional, for later):

```powershell
# Install once
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

### 2b. Create the `avatars` storage bucket

1. **Storage → New bucket → name: `avatars` → Public bucket: ON**.
2. Add a bucket policy that allows authenticated users to upload their own folder.
   Open **Storage → avatars → Policies → New policy → Custom**:

   ```sql
   -- Allow authed users to upload into a folder named after their user id
   create policy "avatar_upload_self"
   on storage.objects for insert
   to authenticated
   with check (
     bucket_id = 'avatars'
     and (storage.foldername(name))[1] = auth.uid()::text
   );

   create policy "avatar_update_self"
   on storage.objects for update
   to authenticated
   using (
     bucket_id = 'avatars'
     and (storage.foldername(name))[1] = auth.uid()::text
   );

   create policy "avatar_read_public"
   on storage.objects for select
   to public
   using (bucket_id = 'avatars');
   ```

(Phase 4+ will add more buckets: `memories`, `documents`, `posts`, `surprises`, `project-covers`, `project-resources`. Don't create them yet.)

### 2c. Enable Auth providers

1. **Authentication → Providers → Email**:
   - Enable. Magic link is on by default. Disable "Confirm email" if you want a smoother first sign-in (you control the email; spam isn't a risk for two users).
2. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (we'll add the Vercel URL after deploying).
   - Redirect URLs: add `http://localhost:3000/auth/callback`.
3. **Authentication → Providers → Google**:
   - You'll need a Google OAuth client. See section 4. You can skip this and use magic link for Phase 1.

---

## 3. Local `.env.local`

In the project root, copy `.env.example` to `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Fill in the three Supabase values from step 2. Leave the others blank for now — they belong to later phases. `NEXT_PUBLIC_APP_URL` stays `http://localhost:3000` until you deploy.

---

## 4. Google OAuth (optional but recommended)

Skip if you're fine with magic links only for v1.

1. <https://console.cloud.google.com> → new project → **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Authorized redirect URIs: `https://<your-supabase-ref>.supabase.co/auth/v1/callback`.
4. Copy Client ID + Secret into **Supabase → Auth → Providers → Google**.

---

## 5. First local run

```powershell
pnpm dev
```

Visit <http://localhost:3000>. Flow:

1. `/login` → enter your email → magic link.
2. Magic link → `/auth/callback` → `/onboarding`.
3. Pick theme (Shadow Monarch as Rayyan), upload avatar (or skip), set display name + tagline + About → submit.
4. Lands on `/you`. The "Invite your partner" card is visible.
5. Click **Generate link**, copy the URL.
6. On Harshita's phone (or another browser/incognito), open the invite URL.
7. She signs in with HER email → onboarding (theme defaults to S-Rank Hunter) → accept invite → lands on her own `/you`.
8. Both of you can now visit `/them` and see each other's dashboards.

Phase 1 done. ✅

---

## 6. Vercel deploy

1. Push the repo to GitHub if not already (the repo is `TheClazer/Duo-leveling`).
2. <https://vercel.com> → **Add New → Project** → import the repo.
3. Framework preset: Next.js. Build command + output dir: defaults.
4. **Environment Variables**: paste the same 3 Supabase keys, plus `NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>.vercel.app` (you'll know it after the first deploy — set a placeholder, then update).
5. Deploy. Note the production URL.
6. **Back to Supabase → Auth → URL Configuration**:
   - Update Site URL to your Vercel URL.
   - Add `https://<your-vercel-domain>.vercel.app/auth/callback` to redirect URLs.
7. **Back to `.env` in Vercel** → update `NEXT_PUBLIC_APP_URL` to the production URL → redeploy.

---

## 7. PWA install + icons

The manifest references `icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`. The repo has placeholder SVGs but **needs three PNGs** before PWA install will look right on the home screen.

**Quick option** — use the SVG I generated as a template:

1. Open `public/icons/icon.svg` in any image editor (Figma, Photopea, GIMP, Photoshop) or use an online converter like <https://realfavicongenerator.net> or <https://cloudconvert.com/svg-to-png>.
2. Export at 192×192, 512×512, and a maskable 512×512 (maskable = the important content stays inside the inner 80% safe zone).
3. Save them as `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`.

**Or use a free tool**: <https://maskable.app/editor> to test maskable safety.

Install on phone:

- **Android (Chrome)**: visit the production URL → menu → **Add to Home screen** (or it auto-prompts).
- **Both of you do this** on your phones. The icon, theme color, and standalone display all come from `manifest.json`.

---

## 8. Verify Phase 1 "Done when"

- [ ] Rayyan signs in (magic link or Google) on phone.
- [ ] Rayyan completes onboarding, lands on `/you` with Shadow Monarch theme + ember particles.
- [ ] Rayyan generates invite link, sends to Harshita.
- [ ] Harshita opens link on her phone, signs in, completes onboarding (S-Rank Hunter theme + petal particles), accepts invite.
- [ ] Both can navigate `/you` (own) and `/them` (partner, read-only).
- [ ] Both have installed the PWA to home screen.
- [ ] Sign out + sign back in works without issue.

When all eight are checked, ping me to start **Phase 2 — Core personal trackers** (habits + heatmap, goals, daily checklist, journal, bento grid).

---

## Phase 2 — Core personal trackers

Once Phase 1 is verified, run the Phase 2 migration. Two new SQL files have landed in `supabase/migrations/`:

1. `0002_fix_profiles_rls_recursion.sql` — you already ran this.
2. `0003_phase2_trackers.sql` — **run this now**. SQL Editor → New query → paste the file's contents → Run. Creates `habits`, `habit_entries`, `goals`, `milestones`, `checklist_items`, `notes`, `dashboard_layouts` tables + RLS policies + a `is_self_or_partner` helper function.

Then in PowerShell:

```powershell
npm install   # picks up the new deps (react-grid-layout, dnd-kit, react-markdown, etc.)
npm run dev
```

Reload `/you`. You should see four widgets: **Habits** (52-week heatmap), **Checklist**, **Goals**, **Journal**. Drag/resize them on desktop via the small grip handle in each card's corner. The layout saves automatically to your `dashboard_layouts` row.

**Quick test:**
- Add a habit (e.g. "Train"), mark today done → today's cell lights up.
- Add a goal with two milestones → check one → goal progress jumps to 50%.
- Add a checklist item for today → mark done → strikethrough.
- Write a journal entry (markdown supported) → toggle Private if you don't want partner to see.

If everything works, ping for Phase 3 — Projects (the centerpiece).

---

## Phase 3 — Projects (the centerpiece)

### 3a. Run the migration

In Supabase SQL Editor → New query → paste contents of `supabase/migrations/0004_phase3_projects.sql` → Run. This adds 8 new tables (`projects`, `project_tasks`, `project_milestones`, `project_notes`, `project_resources`, `project_time_logs`, `project_updates`, `project_activity`) + RLS using two new helpers: `can_read_project()` and `can_write_project()`.

### 3b. Create two more storage buckets

Phase 3 needs **two new public buckets** for project cover images and uploaded resources:

1. **Storage → New bucket → `project-covers` → Public ON → Save**
2. **Storage → New bucket → `project-resources` → Public ON → Save**

Then paste these policies in SQL Editor (they cover both buckets at once):

```sql
-- Anyone authed can upload to either bucket, into a folder named after their user_id
create policy "project_assets_upload" on storage.objects for insert to authenticated
with check (
  bucket_id in ('project-covers','project-resources')
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "project_assets_update" on storage.objects for update to authenticated
using (
  bucket_id in ('project-covers','project-resources')
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "project_assets_read" on storage.objects for select to public
using (bucket_id in ('project-covers','project-resources'));
```

(Resources are uploaded to a path prefixed with the project id, but the policy only checks the first folder segment for write — we'll tighten this when partners need to upload to each other's projects. For now both partners share the couple anyway, so write access flows through the project's RLS.)

### 3c. Verify

```powershell
# Ctrl+C the dev server, then:
npm run dev
```

Visit `/projects`. You should see "No projects yet." Click **New project**:
- Type a title like "Build The System (meta)"
- Pick **Joint** (greyed out until Harshita accepts the invite — leave it Personal for now)
- Add a target date, write a description, optionally upload a cover image
- Submit

You'll land on the project page. Try each tab:
- **Overview** — your stats card + next-milestone block
- **Tasks** — add a few, drag between Todo / Doing / Done in Kanban view, expand a task to add subtasks
- **Milestones** — add one with a target date; check it off → progress jumps
- **Notes** — write a markdown note, pin it
- **Resources** — paste a URL; it lands as a card
- **Time** — click "Start timer" in the header. Watch it tick. Stop, type a one-line summary. Logged in the bar chart.
- **Updates** — post a quick devlog entry
- **Activity** — see every action you just performed, chronologically

Back on `/you`, the **Projects in flight** widget at the top should show your new project. Pin it from the project header to feature it.

**Phase 3 done when:** you can run a project end-to-end (status changes, tasks, milestones, notes, resources, time, updates, activity) without leaving The System. Per Bible §15.

---

# Phase 4 — Integrations & data ingest

> Done when: every auto-syncable data source flows. LeetCode, GitHub, Save Later working.

### 4a. Run the migration

In Supabase SQL Editor → New query → paste `supabase/migrations/0006_phase4_integrations.sql` → Run. Creates `save_later`, `documents`, `leetcode_profiles`, `github_profiles`, `steps_entries` + RLS for each.

### 4b. Verify the widgets land on `/you`

Reload `/you`. You should now see two new widgets in addition to Phase 2/3:
- **LeetCode** — type your LeetCode username → Connect. Stats + 90-day heatmap appear.
- **GitHub** — see step 4c below for the personal access token.
- **Save Later** — paste any URL → it auto-fetches the OpenGraph title/thumbnail and saves.

### 4c. GitHub personal access token (one-time per user)

Phase 4 doesn't use full OAuth — it uses a **PAT** (personal access token) you generate manually. Easier for v1 since OAuth needs a Google Cloud Console app registration which is overkill for two people.

1. Visit <https://github.com/settings/tokens/new?scopes=read:user,public_repo&description=The%20System> (link pre-fills name + scopes).
2. Set expiration to "No expiration" (only safe because this is a private 2-user app on a token you control).
3. Click **Generate token**. Copy it immediately (you won't see it again).
4. In `/you`, the **GitHub** widget shows a username + token form. Paste both → Connect.

The token is stored in `github_profiles.token_encrypted` and is only ever visible to you (RLS). The widget never sends `token_encrypted` to the partner view — `Github.tsx` explicitly omits it from the select.

### 4d. Save Later — PWA share target (after Vercel deploy)

Once you deploy and install the PWA, "Share to The System" works from other Android apps. In any browser/app share sheet: tap → System → it lands at `/save-later/share` → fetches OG meta → adds to your queue → redirects to `/you?saved=1`. No coding needed beyond what's already wired.

If sharing doesn't show up in the share sheet on Android: re-install the PWA (sometimes Chrome caches the old manifest).

### 4e. (Skipped for Phase 4) Google Fit + Documents Vault + Cron jobs

These are wired in code paths but not yet exposed:
- **Google Fit steps sync** requires a Google Cloud Console OAuth client. We'll add when you decide you want it — not blocking anything.
- **Documents vault** schema exists. UI lands when you have a real document to put in it.
- **Daily cron** for LeetCode/GitHub sync lands on Vercel deploy (we add `vercel.json` + `CRON_SECRET`). Until then, click "Sync" in each widget manually.

**Phase 4 done when:** LeetCode and GitHub sync working, you've successfully paste-saved a URL via the Save Later widget. Per Bible §15.

---

# Phase 5 — Shared layer (the WhatsApp replacement)

> Done when: the app actively replaces some of your WhatsApp planning chat. Per Bible §15.

### 5a. Run the migration

Supabase → SQL Editor → New query → paste `supabase/migrations/0007_phase5_shared.sql` → Run. Creates `events`, `bucket_items`, `recurring_dates`, `decisions`, `memories`, `gift_ideas`, `posts`, `post_reactions`, `post_comments` + RLS for each. Note: `gift_ideas` is RLS-locked to the giver (your partner literally cannot see what you're saving for them — even via a direct SQL query, RLS filters it out).

### 5b. Create the `memories` storage bucket

**Storage → New bucket → name: `memories` → Public ON → Save.**

Then paste this in SQL Editor:

```sql
create policy "memories_upload" on storage.objects for insert to authenticated
with check (
  bucket_id = 'memories'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "memories_update" on storage.objects for update to authenticated
using (
  bucket_id = 'memories'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "memories_read" on storage.objects for select to public
using (bucket_id = 'memories');
```

(The widget validates the partner relationship through the `memories` table RLS — the bucket itself is permissive because both partners need to read each other's uploads.)

### 5c. Verify

Reload `/shared`. You should see the Couple Hero (with the days-together counter pulsing) + 6 widgets: Events, Anniversaries, Bucket List, Memories, Decisions, Gift Ideas. Try each:

- **Events**: add one with a date+time → see it on the calendar tile
- **Bucket List**: add a "dream" → drag-tap the arrow to promote to "planning" then "done"
- **Memories**: upload a photo with a date in the past → if it's the same month+day as today, you'll see "On this day" callout
- **Anniversaries**: add your relationship date → countdown chip appears
- **Decisions**: log "We decided to go to Bali in December" → search for "bali" → matches
- **Gift Ideas**: add an idea for Harshita. Open her browser/account — she should NOT see anything (RLS proof)

### 5d. The Feed (`/feed`)

The Feed is the WhatsApp-replacement piece. Both of you post mini-updates throughout the day; reactions and comments mirror in realtime via Supabase channels. Project updates from the project pages also auto-flow here when tagged.

Try it: post something on `/feed`. On the other browser/account, the post should appear within a second without a page reload.

**Phase 5 done when:** You've used Bucket List, Memories, Events, and Feed for actual planning instead of opening WhatsApp at least once. Per Bible §15.

---

# Phase 6 — Polish & Surprise Layer

> Done when: the app feels finished. Both of you open it without thinking. Per Bible §15.

### 6a. Run migration 0008

Supabase SQL Editor → paste `supabase/migrations/0008_phase6_polish.sql` → Run. Creates `achievements`, `surprises`, `push_subscriptions`.

### 6b. Install web-push

```powershell
npm install
```

(picks up `web-push` and `@types/web-push` from package.json)

### 6c. Generate VAPID keys (for push notifications)

Run this once locally to mint a keypair:

```powershell
npx web-push generate-vapid-keys
```

You'll get two keys. Add to `.env.local`:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<the public key>
VAPID_PRIVATE_KEY=<the private key>
VAPID_SUBJECT=mailto:therayyn16@gmail.com
```

Restart `npm run dev`. Visit `/settings` → "Enable notifications" button → grant permission → done. The subscription persists in `push_subscriptions`.

### 6d. Generate a CRON_SECRET

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output to `.env.local`:

```
CRON_SECRET=<the 64-char hex string>
```

### 6e. (Optional) Anthropic API key for weekly digest

If you want the Sunday digest to be LLM-written instead of stat-only, get an API key at console.anthropic.com and add:

```
ANTHROPIC_API_KEY=sk-ant-...
```

The cron route gracefully falls back to a stat template if this is missing.

### 6f. Verify Phase 6

```powershell
npm run build
npm run dev
```

On `/you`: the **Achievements** widget appears at the bottom with all 29 codes greyed out. Mark a habit done — `FIRST_SPARK` and `FLAME_7` etc. will unlock progressively as you build streaks.

On `/shared` (you must have a partner): the **Surprises** widget lets you schedule a future-delivery note. Schedule one 5 minutes out, then trigger the cron locally:

```powershell
curl -H "Authorization: Bearer $env:CRON_SECRET" http://localhost:3000/api/cron/deliver-surprises
```

It should respond with `{"ok":true,"delivered":1}` and (if push is enabled) you'll see a notification.

On `/settings`: see your **Rank · Level · XP** card with the progress bar to next level. Edit profile, change theme, toggle notifications.

**Phase 6 done when:** Achievements unlock as you act, level/XP grows, push notifications fire, the weekly digest posts. Per Bible §15.

---

# Vercel deploy (the final mile)

After Phase 6 verifies locally, deploy to Vercel:

### 1. Push to GitHub

```powershell
git add -A
git commit -m "Phases 1-6 complete"
git push origin main
```

(Skip if you've been pushing along the way.)

### 2. Import on Vercel

- vercel.com → Add New → Project → import `TheClazer/Duo-leveling`
- Framework: Next.js (auto-detected)
- Build command + output: defaults

### 3. Environment variables

In the Vercel project settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://ehjkpmjthmswmzmlmxhi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase>
SUPABASE_SERVICE_ROLE_KEY=<from supabase>
NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>.vercel.app
CRON_SECRET=<the 64-char hex>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<from step 6c>
VAPID_PRIVATE_KEY=<from step 6c>
VAPID_SUBJECT=mailto:therayyn16@gmail.com
# optional:
ANTHROPIC_API_KEY=<if you want the LLM digest>
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
GOOGLE_FIT_CLIENT_ID=
GOOGLE_FIT_CLIENT_SECRET=
```

Deploy. Note the production URL.

### 4. Update Supabase Auth URLs

Supabase → Authentication → URL Configuration:
- Site URL: `https://<your-vercel-domain>.vercel.app`
- Add redirect URL: `https://<your-vercel-domain>.vercel.app/auth/callback`

### 5. Cron jobs

The `vercel.json` in the repo declares 4 cron schedules:
- `daily-sync` — 01:00 UTC daily — LeetCode + GitHub stats refresh
- `deliver-surprises` — every 10 minutes — sweeps due surprises
- `recurring-reminders` — 08:00 UTC daily — anchor-date reminders
- `weekly-digest` — Sunday 09:00 UTC — feed digest post

**Important — Vercel Hobby tier limit:** Hobby plan caps you at **2 cron jobs, daily frequency only**. Three options:

- **Option A — Upgrade to Vercel Pro** ($20/mo): all 4 crons run at their declared schedules.
- **Option B — Free with external cron** (recommended): in `vercel.json`, remove all crons, and use [cron-job.org](https://cron-job.org) (free) to hit each endpoint. Add the `Authorization: Bearer <CRON_SECRET>` header in each cron-job.org job. Same effect, zero cost.
- **Option C — Free, daily only**: keep `vercel.json` but only the first 2 crons will run. Surprise delivery will be daily (up to ~24h late). Acceptable for v1.

Pick one. If unsure, do Option C now; switch to B later when you start using surprises seriously.

### 6. PWA icons

The PWA manifest points to PNG icons we haven't generated. Open `public/icons/icon.svg` in [realfavicongenerator.net](https://realfavicongenerator.net) or any SVG→PNG tool. Export at:
- 192×192 → `public/icons/icon-192.png`
- 512×512 → `public/icons/icon-512.png`
- 512×512 maskable (safe-zone-centered) → `public/icons/icon-maskable-512.png`

Commit and redeploy.

### 7. Install on both phones

Open the production URL on both phones in Chrome → "Add to Home screen" → tap the icon → it should launch fullscreen with your themed dashboard. Enable notifications when prompted.

### 8. Final test plan

- [ ] Sign in on production URL works
- [ ] Both partners can see each other's dashboards (read-only on `/them`)
- [ ] At least one habit logged, one goal, one project, one bucket item, one memory, one post
- [ ] One achievement unlocked, XP > 0, level visible on settings
- [ ] Push notifications enabled on at least one device
- [ ] PWA installed on both phones, opens fullscreen
- [ ] Cron `daily-sync` ran successfully (check Vercel → Deployments → Cron Logs, or trigger manually with curl)

**Bible v1 feature-complete when all 8 boxes are checked.**

---

## Troubleshooting

- **"redirect URL not allowed"**: you missed step 2c.2 or 6.6. Add the exact URL including `/auth/callback`.
- **Magic link logs in but redirects to /login**: middleware sees no profile yet → it should send to `/onboarding`. If it loops, check that `profiles_select` RLS is enabled (`alter table public.profiles enable row level security` was run).
- **"avatar upload failed"**: bucket isn't public or policies missing (step 2b).
- **Service worker won't register in dev**: that's expected — `next-pwa` is disabled in development. Test PWA only on the Vercel build.
- **Hydration mismatch on theme**: ensure `html[data-theme]` matches what `ThemeProvider` sets. The root layout sets `jinwoo` by default; the app layout re-sets it based on the loaded profile.

---

## Things you should NOT do

- Don't run `supabase db reset` against production once both of you are using it.
- Don't expose `SUPABASE_SERVICE_ROLE_KEY` to the client. It's server-only.
- Don't push `.env.local` to GitHub. It's gitignored — keep it that way.
