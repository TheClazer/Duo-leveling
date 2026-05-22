import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchLeetcodeStats } from "@/lib/apis/leetcode";
import { fetchGithubStats } from "@/lib/apis/github";
import { requireCron } from "@/lib/cron";

// Daily 01:00 UTC. Refreshes LeetCode + GitHub stats for every connected user.
export async function GET(request: Request) {
  const denied = requireCron(request);
  if (denied) return denied;

  const admin = createServiceClient();
  const out: { leetcode: number; github: number; errors: string[] } = { leetcode: 0, github: 0, errors: [] };

  // LeetCode (public profiles — no per-user token)
  const { data: lcs } = await admin.from("leetcode_profiles").select("*");
  for (const row of (lcs ?? []) as Array<{ user_id: string; username: string }>) {
    try {
      const stats = await fetchLeetcodeStats(row.username);
      await admin.from("leetcode_profiles").update({
        last_synced: new Date().toISOString(),
        total_solved: stats.total_solved,
        easy: stats.easy,
        medium: stats.medium,
        hard: stats.hard,
        ranking: stats.ranking,
        current_streak: stats.current_streak,
        calendar: stats.calendar,
      }).eq("user_id", row.user_id);
      out.leetcode++;
    } catch (e: unknown) {
      out.errors.push(`leetcode/${row.username}: ${e instanceof Error ? e.message : "fail"}`);
    }
  }

  // GitHub (per-user PAT)
  const { data: ghs } = await admin.from("github_profiles").select("*");
  for (const row of (ghs ?? []) as Array<{ user_id: string; username: string; token_encrypted: string | null }>) {
    if (!row.token_encrypted) continue;
    try {
      const stats = await fetchGithubStats(row.username, row.token_encrypted);
      await admin.from("github_profiles").update({
        last_synced: new Date().toISOString(),
        contributions_year: stats.contributions_year,
        current_streak: stats.current_streak,
        pinned_repos: stats.pinned_repos,
        calendar: stats.calendar,
      }).eq("user_id", row.user_id);
      out.github++;
    } catch (e: unknown) {
      out.errors.push(`github/${row.username}: ${e instanceof Error ? e.message : "fail"}`);
    }
  }

  return NextResponse.json({ ok: true, ...out });
}
