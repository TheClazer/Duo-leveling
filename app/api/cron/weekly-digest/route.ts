import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireCron } from "@/lib/cron";
import { subDays } from "date-fns";

// Sunday 09:00 — posts a weekly summary to the feed for each couple.
// Uses Claude API if ANTHROPIC_API_KEY is set; falls back to a structured template.
export async function GET(request: Request) {
  const denied = requireCron(request);
  if (denied) return denied;

  const admin = createServiceClient();
  const { data: couples } = await admin.from("couples").select("*");
  let posted = 0;

  for (const couple of (couples ?? []) as Array<{ id: string; user_a: string; user_b: string }>) {
    const since = subDays(new Date(), 7).toISOString();
    const userIds = [couple.user_a, couple.user_b];

    const [habits, posts, updates, milestones, time] = await Promise.all([
      admin.from("habit_entries").select("*").gte("date", since.slice(0, 10)),
      admin.from("posts").select("*").in("user_id", userIds).gte("created_at", since),
      admin.from("project_updates").select("*").in("user_id", userIds).gte("created_at", since),
      admin.from("project_milestones").select("*").eq("done", true).gte("completed_at", since),
      admin.from("project_time_logs").select("*").in("user_id", userIds).gte("started_at", since),
    ]);

    const stats = {
      habits_logged: habits.data?.length ?? 0,
      posts: posts.data?.length ?? 0,
      project_updates: updates.data?.length ?? 0,
      milestones_hit: milestones.data?.length ?? 0,
      hours_logged: Math.round(((time.data ?? []) as Array<{ minutes: number | null }>).reduce((s, r) => s + (r.minutes ?? 0), 0) / 60),
    };

    let body: string;
    if (process.env.ANTHROPIC_API_KEY) {
      body = await llmSummary(stats);
    } else {
      body = templateSummary(stats);
    }

    // post as user_a so it shows up authored; user can rewrite if it lands weird
    await admin.from("posts").insert({ user_id: couple.user_a, content: body });
    posted++;
  }

  return NextResponse.json({ ok: true, posted });
}

type Stats = { habits_logged: number; posts: number; project_updates: number; milestones_hit: number; hours_logged: number };

function templateSummary(s: Stats): string {
  return [
    "**This week, together** 🌑",
    "",
    `Habits logged: **${s.habits_logged}** · Posts: **${s.posts}** · Project updates: **${s.project_updates}** · Milestones: **${s.milestones_hit}** · Hours on projects: **${s.hours_logged}**`,
    "",
    "_(Auto-posted by The System every Sunday. Edit or delete if you don't want it.)_",
  ].join("\n");
}

async function llmSummary(s: Stats): Promise<string> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: [
            `Write a 4-6 sentence weekly summary for a couple's private workspace called The System (Solo Leveling themed). Tone: warm but functional, second-person plural ("you two"). No emojis except one tasteful 🌑 at the start.`,
            ``,
            `Stats this week:`,
            `- Habits logged: ${s.habits_logged}`,
            `- Posts shared: ${s.posts}`,
            `- Project updates: ${s.project_updates}`,
            `- Milestones hit: ${s.milestones_hit}`,
            `- Hours on projects: ${s.hours_logged}`,
            ``,
            `If everything is zero, write a single gentle line about the quiet week. End with a single forward-looking sentence.`,
          ].join("\n"),
        }],
      }),
    });
    const json = await res.json() as { content?: Array<{ text: string }> };
    return json.content?.[0]?.text ?? templateSummary(s);
  } catch {
    return templateSummary(s);
  }
}
