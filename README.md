# The System

A private, two-person workspace for **Rayyan** and **Harshita**.
Themed around Sung Jin-Woo (Shadow Monarch) and Cha Hae-In (S-Rank Hunter).
Built per [`THE_BIBLE.pdf`](../THE_BIBLE.pdf) v2.0.

> *Arise.*

---

## What's in this repo right now

**Phase 1 — Foundation** (per Bible §15). Specifically:

- Next.js 14 (App Router) + TypeScript strict + Tailwind w/ CSS-variable themes
- Supabase auth (magic link + Google OAuth) via `@supabase/ssr`
- Initial migration: `profiles`, `couples`, `couple_invites` + RLS
- Onboarding flow (theme pick, avatar, name, tagline, About)
- Couple linking via one-time invite token
- Character Hero + atmospheric ParticleLayer (ember for jinwoo, petals for chahaein, mixed for shared)
- Top/Bottom nav, themed surfaces, System Window popup primitive
- PWA manifest + next-pwa service worker

Subsequent phases live ahead in the Bible:
- **Phase 2** — habits, goals, daily checklist, journal, bento grid
- **Phase 3** — Projects (the centerpiece; do not shortcut)
- **Phase 4** — LeetCode/GitHub/Steps sync, Save Later, documents
- **Phase 5** — Shared layer (events, bucket, decisions, memories, posts feed, gift ideas)
- **Phase 6** — Achievements, level/rank, surprise sender, weekly digest, push wired

## Manual setup

See **[`SETUP.md`](./SETUP.md)** — full step-by-step for Supabase, Vercel, Google OAuth, and PWA install. Required before you can sign in.

## Local dev (after setup)

```bash
pnpm install
pnpm dev
# open http://localhost:3000
```

## Stack (per Bible §11, locked)

Next.js 14 · TypeScript strict · Tailwind + CSS variables · shadcn-style primitives ·
Framer Motion · react-grid-layout (Phase 2) · @dnd-kit (Phase 2) · recharts (Phase 2) ·
next-pwa · Supabase (Postgres + Auth + Storage + Realtime + RLS) · pnpm · Vercel.

## Repo layout

```
app/
  (auth)/          login, accept-invite/[token], onboarding
  (app)/           you, them, shared, projects, feed, settings — gated by middleware
  api/             invites/create, invites/accept, auth/signout
  auth/callback/   Supabase OAuth/magic-link return URL
components/
  theme/           ThemeProvider, ParticleLayer, CharacterHero, RankBadge, SystemWindow
  layout/          TopNav, BottomNav
  ui/              shadcn-style primitives
lib/
  supabase/        client.ts, server.ts, middleware.ts, database.types.ts
  utils.ts         cn, generateInviteToken, rankFromLevel
public/
  manifest.json
  icons/           PWA icons (see SETUP.md to add 192/512 PNG)
  assets/          jinwoo-default.svg, chahaein-default.svg
supabase/
  migrations/0001_init.sql
```
