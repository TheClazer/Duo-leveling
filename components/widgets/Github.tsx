import { createClient } from "@/lib/supabase/server";
import { GithubClient } from "./Github.client";
import type { GithubProfile } from "@/lib/supabase/database.types";

export async function Github({ userId, readOnly = false }: { userId: string; readOnly?: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("github_profiles")
    .select("user_id, username, last_synced, contributions_year, current_streak, pinned_repos, calendar")
    .eq("user_id", userId)
    .maybeSingle();
  // never expose token_encrypted to the partner
  const profile = data as Omit<GithubProfile, "token_encrypted"> | null;
  return <GithubClient initial={profile} readOnly={readOnly} />;
}
