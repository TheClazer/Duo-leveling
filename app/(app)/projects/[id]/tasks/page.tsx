import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { TasksView } from "./TasksView";
import type { ProjectTask, Profile, Project } from "@/lib/supabase/database.types";

export default async function TasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: projectRaw } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  const project = projectRaw as Project | null;
  if (!project) notFound();

  const { data: tasks } = await supabase
    .from("project_tasks")
    .select("*")
    .eq("project_id", id)
    .order("order_idx", { ascending: true })
    .order("created_at", { ascending: true });

  type SmallProfile = Pick<Profile, "id" | "display_name" | "avatar_url" | "theme">;
  const { data: ownerRaw } = await supabase.from("profiles").select("*").eq("id", project.owner_id).maybeSingle();
  const owner = ownerRaw as SmallProfile | null;
  const { data: partnerRaw } = project.is_shared && project.couple_id
    ? await supabase.from("profiles").select("*").eq("couple_id", project.couple_id).neq("id", project.owner_id).maybeSingle()
    : { data: null };
  const partner = partnerRaw as SmallProfile | null;

  const assignableProfiles: SmallProfile[] = [];
  if (owner) assignableProfiles.push(owner);
  if (partner) assignableProfiles.push(partner);

  const canWrite =
    !!user && (project.owner_id === user.id || (project.is_shared && project.couple_id != null));

  return (
    <TasksView
      projectId={id}
      isShared={project.is_shared}
      initialTasks={(tasks ?? []) as ProjectTask[]}
      assignableProfiles={assignableProfiles}
      currentUserId={user?.id ?? ""}
      canWrite={canWrite}
    />
  );
}
