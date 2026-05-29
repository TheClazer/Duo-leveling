import { createClient } from "@/lib/supabase/server";
import { Zap, Clock, Newspaper, FolderKanban } from "lucide-react";
import { rankFromLevel, xpForLevel } from "@/lib/xp";

/** At-a-glance status row under the hero (Bible §6.1). Streamed via Suspense so
 *  it never blocks the page shell; all aggregates fetched in parallel. */
export async function StatsStrip({ userId, level, xp }: { userId: string; level: number; xp: number }) {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [timeRes, postsRes, projectsRes] = await Promise.all([
    supabase.from("project_time_logs").select("minutes").eq("user_id", userId).gte("started_at", weekAgo),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", weekAgo),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("owner_id", userId).eq("status", "active"),
  ]);

  const minutes = ((timeRes.data ?? []) as { minutes: number | null }[]).reduce((s, r) => s + (r.minutes ?? 0), 0);
  const hours = Math.round((minutes / 60) * 10) / 10;
  const posts = postsRes.count ?? 0;
  const activeProjects = projectsRes.count ?? 0;

  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const pct = next > base ? Math.min(100, Math.max(0, Math.round(((xp - base) / (next - base)) * 100))) : 0;

  const chips: { icon: typeof Zap; label: string; value: string; bar: number | null }[] = [
    { icon: Zap, label: `Lv ${level} · Rank ${rankFromLevel(level)}`, value: `${xp} XP`, bar: pct },
    { icon: Clock, label: "Hours · 7d", value: `${hours}h`, bar: null },
    { icon: Newspaper, label: "Posts · 7d", value: String(posts), bar: null },
    { icon: FolderKanban, label: "Active builds", value: String(activeProjects), bar: null },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {chips.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="surface flex flex-col gap-1.5 p-3">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-fg-muted">
              <Icon className="h-3 w-3 shrink-0 text-accent" />
              <span className="truncate">{c.label}</span>
            </div>
            <div className="font-display text-xl font-semibold text-fg">{c.value}</div>
            {c.bar !== null && (
              <div className="h-1 w-full overflow-hidden rounded-full bg-bg-base/60">
                <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${c.bar}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function StatsStripSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="surface h-[78px] animate-pulse p-3" />
      ))}
    </div>
  );
}
