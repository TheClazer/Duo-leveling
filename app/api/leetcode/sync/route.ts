import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchLeetcodeStats } from "@/lib/apis/leetcode";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { username }: { username?: string } = await request.json().catch(() => ({}));

  // If no username provided, sync the user's stored username
  let target = username?.trim();
  if (!target) {
    const { data } = await supabase.from("leetcode_profiles").select("*").eq("user_id", user.id).maybeSingle();
    target = (data as { username?: string } | null)?.username;
  }
  if (!target) return NextResponse.json({ error: "no username configured" }, { status: 400 });

  try {
    const stats = await fetchLeetcodeStats(target);
    const { error } = await supabase.from("leetcode_profiles").upsert({
      user_id: user.id,
      username: target,
      last_synced: new Date().toISOString(),
      total_solved: stats.total_solved,
      easy: stats.easy,
      medium: stats.medium,
      hard: stats.hard,
      ranking: stats.ranking,
      current_streak: stats.current_streak,
      calendar: stats.calendar,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, stats });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "sync failed" }, { status: 500 });
  }
}
