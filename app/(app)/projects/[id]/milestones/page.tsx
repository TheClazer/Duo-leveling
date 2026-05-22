import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { MilestonesView } from "./MilestonesView";
import type { ProjectMilestone, Project } from "@/lib/supabase/database.types";

export default async function MilestonesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: projectRaw } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  const project = projectRaw as Project | null;
  if (!project) notFound();

  const { data: ms } = await supabase
    .from("project_milestones")
    .select("*")
    .eq("project_id", id)
    .order("target_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const canWrite =
    !!user && (project.owner_id === user.id || (project.is_shared && project.couple_id != null));

  return <MilestonesView projectId={id} initialMilestones={(ms ?? []) as ProjectMilestone[]} canWrite={canWrite} />;
}
