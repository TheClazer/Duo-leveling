import { notFound } from "next/navigation";
import Image from "next/image";
import { formatDistanceToNow, parseISO } from "date-fns";
import { CheckCircle2, FileText, Flag, Link2, Clock, Sparkles, RefreshCw, MessageSquare, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { ProjectActivity, ProjectActivityAction, Profile } from "@/lib/supabase/database.types";

const ICONS: Record<ProjectActivityAction, { icon: typeof Sparkles; color: string }> = {
  created:             { icon: Sparkles,    color: "text-accent" },
  task_added:          { icon: Plus,        color: "text-fg-muted" },
  task_completed:      { icon: CheckCircle2, color: "text-emerald-400" },
  task_updated:        { icon: RefreshCw,   color: "text-fg-muted" },
  milestone_added:     { icon: Flag,        color: "text-fg-muted" },
  milestone_completed: { icon: Flag,        color: "text-violet-400" },
  note_added:          { icon: FileText,    color: "text-fg-muted" },
  note_updated:        { icon: FileText,    color: "text-fg-muted" },
  resource_added:      { icon: Link2,       color: "text-fg-muted" },
  time_logged:         { icon: Clock,       color: "text-amber-400" },
  status_changed:      { icon: RefreshCw,   color: "text-accent" },
  update_posted:       { icon: MessageSquare, color: "text-fg-muted" },
};

const LABELS: Record<ProjectActivityAction, (m: Record<string, unknown> | null) => string> = {
  created:             () => "created the project",
  task_added:          (m) => `added task "${m?.title ?? ""}"`,
  task_completed:      () => "completed a task",
  task_updated:        () => "updated a task",
  milestone_added:     (m) => `added milestone "${m?.title ?? ""}"`,
  milestone_completed: (m) => `completed milestone "${m?.title ?? ""}"`,
  note_added:          () => "added a note",
  note_updated:        () => "edited a note",
  resource_added:      (m) => `added a resource${m?.title ? ` "${m.title}"` : ""}`,
  time_logged:         (m) => `logged ${m?.minutes ?? "?"}m${m?.summary ? ` — ${m.summary}` : ""}`,
  status_changed:      (m) => `changed status ${m?.from ?? ""} → ${m?.to ?? ""}`,
  update_posted:       () => "posted an update",
};

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).maybeSingle();
  if (!project) notFound();

  const { data: activityRaw } = await supabase
    .from("project_activity")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(200);
  const activity = (activityRaw ?? []) as ProjectActivity[];

  const userIds = Array.from(new Set(activity.map((a) => a.user_id).filter(Boolean) as string[]));
  type SmallProfile = Pick<Profile, "id" | "display_name" | "avatar_url" | "theme">;
  const { data: profilesRaw } = userIds.length > 0
    ? await supabase.from("profiles").select("*").in("id", userIds)
    : { data: [] as SmallProfile[] };
  const profiles = (profilesRaw ?? []) as SmallProfile[];
  const byId: Record<string, SmallProfile> = {};
  for (const p of profiles) byId[p.id] = p;

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-fg-muted">Audit trail</p>
        <h2 className="font-display text-2xl font-semibold text-fg">Activity</h2>
      </div>

      {!activity || activity.length === 0 ? (
        <div className="surface p-10 text-center text-sm text-fg-muted italic">Nothing happened yet.</div>
      ) : (
        <ul className="space-y-1.5">
          {activity.map((a: ProjectActivity) => {
            const meta = ICONS[a.action] ?? ICONS.created;
            const Icon = meta.icon;
            const label = LABELS[a.action]?.(a.metadata as Record<string, unknown> | null) ?? a.action;
            const user = a.user_id ? byId[a.user_id] : null;
            return (
              <li key={a.id} className="flex items-center gap-3 rounded-md border border-glow/10 bg-bg-elevated/20 px-3 py-2 text-sm">
                <Icon className={`h-4 w-4 ${meta.color}`} />
                {user && (
                  <div className="relative h-5 w-5 overflow-hidden rounded-full border border-glow/30 bg-bg-elevated">
                    <Image
                      src={user.avatar_url || (user.theme === "jinwoo" ? "/assets/jinwoo-default.svg" : "/assets/chahaein-default.svg")}
                      alt=""
                      fill
                      sizes="20px"
                      className="object-cover"
                    />
                  </div>
                )}
                <span className="flex-1 truncate">
                  <span className="text-fg">{user?.display_name ?? "Someone"}</span>{" "}
                  <span className="text-fg-muted">{label}</span>
                </span>
                <span className="font-mono text-[10px] text-fg-muted">{formatDistanceToNow(parseISO(a.created_at), { addSuffix: true })}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
