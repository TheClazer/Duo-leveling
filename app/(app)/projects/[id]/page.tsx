import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { differenceInCalendarDays, formatDistanceToNow, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Calendar, CheckCircle2, Clock, MessageSquare, Milestone, Sparkles } from "lucide-react";
import type { Project, ProjectTask, ProjectMilestone, ProjectTimeLog, ProjectUpdate, ProjectActivity, Profile } from "@/lib/supabase/database.types";

export default async function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [projectRes, taskAgg, milestoneAgg, timeAgg, updatesAgg, daysActiveAgg] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase.from("project_tasks").select("status").eq("project_id", id),
    supabase.from("project_milestones").select("done, target_date, title, completed_at").eq("project_id", id).order("target_date", { ascending: true, nullsFirst: false }),
    supabase.from("project_time_logs").select("minutes").eq("project_id", id),
    supabase.from("project_updates").select("id, content, created_at, user_id").eq("project_id", id).order("created_at", { ascending: false }).limit(3),
    supabase.from("project_activity").select("created_at").eq("project_id", id).order("created_at", { ascending: true }).limit(1),
  ]);

  const project = projectRes.data as Project | null;
  if (!project) notFound();

  const tasks = (taskAgg.data ?? []) as ProjectTask[];
  const milestones = (milestoneAgg.data ?? []) as ProjectMilestone[];
  const timeLogs = (timeAgg.data ?? []) as ProjectTimeLog[];
  const totalMinutes = timeLogs.reduce((s, r) => s + (r.minutes ?? 0), 0);
  const totalHours = totalMinutes / 60;
  const activityRows = (daysActiveAgg.data ?? []) as ProjectActivity[];
  const firstActivity = activityRows[0]?.created_at ?? project.created_at;
  const daysActive = Math.max(1, differenceInCalendarDays(new Date(), parseISO(firstActivity)) + 1);

  const tasksDone = tasks.filter((t) => t.status === "done").length;
  const milestonesDone = milestones.filter((m) => m.done).length;
  const nextMilestone = milestones.find((m) => !m.done);

  const updates = (updatesAgg.data ?? []) as ProjectUpdate[];
  const userIds = Array.from(new Set(updates.map((u) => u.user_id)));
  type SmallProfile = Pick<Profile, "id" | "display_name" | "avatar_url" | "theme">;
  const { data: profilesRaw } = userIds.length > 0
    ? await supabase.from("profiles").select("*").in("id", userIds)
    : { data: [] as SmallProfile[] };
  const profiles = (profilesRaw ?? []) as SmallProfile[];
  const byId: Record<string, { display_name: string }> = {};
  for (const p of profiles) byId[p.id] = { display_name: p.display_name };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2 surface p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Overview</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-fg">About this project</h2>
        {project.description ? (
          <div className="prose-sm mt-3 max-w-none text-sm text-fg [&_a]:text-accent [&_a]:underline [&_h1]:mt-3 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_li]:my-0.5 [&_p]:my-1.5 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{project.description}</ReactMarkdown>
          </div>
        ) : (
          <p className="mt-3 text-sm text-fg-muted italic">No description yet.</p>
        )}
      </section>

      <aside className="space-y-4">
        <div className="surface p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fg-muted">Vitals</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />} label="Tasks" value={`${tasksDone}/${tasks.length}`} />
            <Stat icon={<Milestone className="h-4 w-4 text-violet-400" />} label="Milestones" value={`${milestonesDone}/${milestones.length}`} />
            <Stat icon={<Clock className="h-4 w-4 text-amber-400" />} label="Hours" value={totalHours >= 1 ? totalHours.toFixed(1) : (totalMinutes + "m")} />
            <Stat icon={<Sparkles className="h-4 w-4 text-accent" />} label="Days active" value={String(daysActive)} />
          </div>
        </div>

        {nextMilestone && (
          <div className="surface p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fg-muted">Next milestone</p>
            <h3 className="mt-2 font-display text-base font-semibold text-fg">{nextMilestone.title}</h3>
            {nextMilestone.target_date && (
              <p className="mt-1 flex items-center gap-1 text-xs text-fg-muted">
                <Calendar className="h-3 w-3" />
                {(() => {
                  const d = differenceInCalendarDays(parseISO(nextMilestone.target_date), new Date());
                  return d >= 0 ? `${d} days away` : `${-d} days overdue`;
                })()}
              </p>
            )}
          </div>
        )}
      </aside>

      <section className="lg:col-span-3 surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-fg-muted">Latest updates</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-fg">Recent activity</h2>
          </div>
          <Link href={`/projects/${id}/updates`} className="text-xs uppercase tracking-widest text-accent hover:underline">View all →</Link>
        </div>
        {updates.length === 0 ? (
          <p className="mt-4 text-sm text-fg-muted italic">No updates posted yet. Drop one when something ships.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {updates.map((u) => (
              <li key={u.id} className="rounded-lg border border-glow/15 bg-bg-elevated/30 p-3">
                <div className="mb-1.5 flex items-center gap-2 text-[11px] text-fg-muted">
                  <MessageSquare className="h-3 w-3" />
                  <span>{byId[u.user_id]?.display_name ?? "Someone"}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(parseISO(u.created_at), { addSuffix: true })}</span>
                </div>
                <div className="prose-sm max-w-none text-sm text-fg [&_p]:my-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{u.content}</ReactMarkdown>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-glow/15 bg-bg-elevated/30 p-2.5">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-fg-muted">
        {icon} {label}
      </div>
      <div className="mt-1 font-display text-xl font-semibold text-fg">{value}</div>
    </div>
  );
}
