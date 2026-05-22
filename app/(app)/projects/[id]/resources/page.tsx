import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResourcesView } from "./ResourcesView";
import type { ProjectResource, Project } from "@/lib/supabase/database.types";

export default async function ResourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: projectRaw } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  const project = projectRaw as Project | null;
  if (!project) notFound();

  const { data: resources } = await supabase
    .from("project_resources")
    .select("*")
    .eq("project_id", id)
    .order("added_at", { ascending: false });

  const canWrite = !!user && (project.owner_id === user.id || (project.is_shared && project.couple_id != null));

  return <ResourcesView projectId={id} initialResources={(resources ?? []) as ProjectResource[]} canWrite={canWrite} />;
}
