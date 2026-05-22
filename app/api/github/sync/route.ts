import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchGithubStats } from "@/lib/apis/github";

// Phase 4 note: token is stored as-is in `token_encrypted` for now (RLS limits visibility
// to the owner only). Real at-rest encryption with a server-side key lands in Phase 6.

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body: { username?: string; token?: string } = await request.json().catch(() => ({}));

  // Pull stored credentials if not provided
  let username = body.username?.trim();
  let token = body.token?.trim();
  if (!username || !token) {
    const { data } = await supabase.from("github_profiles").select("*").eq("user_id", user.id).maybeSingle();
    const row = data as { username?: string; token_encrypted?: string } | null;
    username = username ?? row?.username;
    token = token ?? row?.token_encrypted ?? undefined;
  }
  if (!username || !token) return NextResponse.json({ error: "username + token required" }, { status: 400 });

  try {
    const stats = await fetchGithubStats(username, token);
    const { error } = await supabase.from("github_profiles").upsert({
      user_id: user.id,
      username,
      token_encrypted: token,
      last_synced: new Date().toISOString(),
      contributions_year: stats.contributions_year,
      current_streak: stats.current_streak,
      pinned_repos: stats.pinned_repos,
      calendar: stats.calendar,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, stats });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "sync failed" }, { status: 500 });
  }
}
