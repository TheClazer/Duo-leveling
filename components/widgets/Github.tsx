import { createClient } from "@/lib/supabase/server";
import { GithubClient } from "./Github.client";
import type { GithubProfile } from "@/lib/supabase/database.types";

export async function Github({ userId, readOnly = false }: { userId: string; readOnly?: boolean }) {
  const supabase = await createClient();
  // Read from the token-free view; the base table's SELECT is owner-only (0009),
  // so the partner can never read token_encrypted, even via a direct API call.
  const { data } = await supabase
    .from("github_profiles_public")
    .select("user_id, username, last_synced, contributions_year, current_streak, pinned_repos, calendar")
    .eq("user_id", userId)
    .maybeSingle();
  const profile = data as Omit<GithubProfile, "token_encrypted"> | null;
  return <GithubClient initial={profile} readOnly={readOnly} />;
}
