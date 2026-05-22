import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import type { Profile, Project } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type ProjectSummary = {
  task_total: number;
  task_done: number;
  milestone_count: number;
  note_count: number;
  resource_count: number;
  update_count: number;
  total_minutes: number;
};

export default async function ProjectLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Round trip 1: project + me + summary in parallel.
  const [projectRes, meRes, summaryRes] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.rpc("get_project_summary", { p_id: id }),
  ]);

  const project = projectRes.data as Project | null;
  if (!project) notFound();
  const me = meRes.data as Profile | null;
  const summary = (summaryRes.data as ProjectSummary | null) ?? {
    task_total: 0, task_done: 0, milestone_count: 0, note_count: 0,
    resource_count: 0, update_count: 0, total_minutes: 0,
  };

  // Round trip 2: owner + partner in parallel (need project.couple_id first).
  const [ownerRes, partnerRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", project.owner_id).maybeSingle(),
    project.is_shared && project.couple_id
      ? supabase.from("profiles").select("*").eq("couple_id", project.couple_id).neq("id", project.owner_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const canWrite =
    project.owner_id === user.id ||
    (project.is_shared && !!project.couple_id && me?.couple_id === project.couple_id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ProjectHeader
        project={project}
        owner={ownerRes.data as Profile | null}
        partner={(partnerRes.data as Profile | null) ?? null}
        canWrite={!!canWrite}
        userId={user.id}
      />
      <ProjectTabs
        projectId={project.id}
        counts={{
          tasks: { done: summary.task_done, total: summary.task_total },
          milestones: summary.milestone_count,
          notes: summary.note_count,
          resources: summary.resource_count,
          updates: summary.update_count,
          minutes: summary.total_minutes,
        }}
      />
      <div className="mt-6">{children}</div>
    </div>
  );
}
