import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Plus, ExternalLink, Calendar, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export async function ActiveProjects({ userId, readOnly = false }: { userId: string; readOnly?: boolean }) {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .or(`owner_id.eq.${userId},and(is_shared.eq.true,couple_id.not.is.null)`)
    .in("status", ["active"])
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(4);

  const items: Project[] = (projects ?? []) as Project[];

  return (
    <div className="surface p-5 flex h-full flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Active quests</p>
          <h3 className="font-display text-lg font-semibold text-fg">Projects in flight</h3>
        </div>
        {!readOnly && (
          <Button asChild size="sm" variant="outline">
            <Link href="/projects/new"><Plus className="mr-1 h-3.5 w-3.5" /> New</Link>
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-md border border-dashed border-glow/30 bg-bg-card/30 px-4 py-6 text-center text-sm text-fg-muted">
            {readOnly ? "No active projects." : (
              <>No active projects yet. <Link href="/projects/new" className="text-accent hover:underline">Start one →</Link></>
            )}
          </div>
        </div>
      ) : (
        <ul className="flex-1 space-y-2 overflow-y-auto">
          {items.map((p) => {
            const days = p.target_date ? differenceInCalendarDays(parseISO(p.target_date), new Date()) : null;
            return (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="group flex items-center gap-3 rounded-md border border-glow/15 bg-bg-elevated/30 p-3 transition-all hover:border-glow/50 hover:bg-bg-elevated/50"
                >
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md font-display text-base font-semibold text-fg",
                    p.is_shared ? "bg-gradient-to-br from-accent/40 to-accent-secondary/30" : "bg-bg-card",
                  )}>
                    {p.title.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium text-fg">{p.title}</span>
                      {p.is_shared ? (
                        <Users className="h-3 w-3 shrink-0 text-accent" />
                      ) : (
                        <User className="h-3 w-3 shrink-0 text-fg-muted" />
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg-base/60">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${p.progress_pct}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-fg-muted">{p.progress_pct}%</span>
                      {days !== null && (
                        <span className={cn("font-mono text-[10px]", days < 0 ? "text-red-400" : "text-fg-muted")}>
                          <Calendar className="mr-0.5 inline h-2.5 w-2.5" />
                          {days >= 0 ? `${days}d` : `${-days}d over`}
                        </span>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-fg-muted opacity-0 group-hover:opacity-100" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 shrink-0 text-right">
        <Link href="/projects" className="font-mono text-[10px] uppercase tracking-widest text-fg-muted hover:text-fg">
          All projects →
        </Link>
      </div>
    </div>
  );
}
