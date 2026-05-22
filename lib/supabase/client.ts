"use client";

import { createBrowserClient } from "@supabase/ssr";

// We deliberately do NOT pass <Database> as a generic here.
// @supabase/ssr 0.5.x doesn't propagate the generic correctly through
// .select() / .insert() / .upsert() calls, producing "never" types that
// poison the entire query chain. Falling back to the untyped client and
// casting at read sites (see memory/project_supabase_ssr_typing.md) is
// the pragmatic fix until we upgrade to @supabase/ssr ^0.6.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
