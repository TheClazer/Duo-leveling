-- =====================================================================
-- Fix: profiles_select policy referenced public.profiles inside its own
-- USING clause, causing infinite recursion. Replace with a security
-- definer helper that bypasses RLS for the single-row lookup.
-- =====================================================================

-- Helper: returns the caller's couple_id WITHOUT triggering RLS recursion.
-- `security definer` runs the function with the owner's privileges, which
-- bypass row-level security. We pin the search_path for safety.
create or replace function public.my_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from public.profiles where id = auth.uid()
$$;

-- Allow authenticated users to invoke the helper (it only ever returns
-- the caller's own couple_id).
grant execute on function public.my_couple_id() to authenticated;

-- Replace the recursive policy.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or (couple_id is not null and couple_id = public.my_couple_id())
  );
