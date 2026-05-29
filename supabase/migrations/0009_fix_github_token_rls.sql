-- =====================================================================
-- 0009 — Security fix: hide github_profiles.token_encrypted from the partner
-- The app already omits the token from its selects (Github.tsx), but the prior
-- "github_select" policy (is_self_or_partner) let a partner read the raw row —
-- including the GitHub token — via a direct PostgREST query from their session.
-- Fix: lock the base table SELECT to the owner; partners read the non-token
-- columns through a security-barrier view. Idempotent / safe to re-run.
-- =====================================================================

-- Base table: owner-only SELECT (writes already owner-only via github_cud_own).
drop policy if exists "github_select" on public.github_profiles;
drop policy if exists "github_select_own" on public.github_profiles;
create policy "github_select_own" on public.github_profiles
  for select using (user_id = auth.uid());

-- Token-free view for self + partner reads. Runs as the view owner (definer),
-- so it bypasses the owner-only base policy and applies its own self/partner
-- filter — exposing every column EXCEPT token_encrypted.
create or replace view public.github_profiles_public
  with (security_barrier = true) as
  select user_id, username, last_synced, contributions_year,
         current_streak, pinned_repos, calendar
  from public.github_profiles
  where public.is_self_or_partner(user_id);

grant select on public.github_profiles_public to authenticated;
