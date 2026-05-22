import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotesView } from "./NotesView";
import type { ProjectNote, Project } from "@/lib/supabase/database.types";

export default async function NotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: projectRaw } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  const project = projectRaw as Project | null;
  if (!project) notFound();

  const { data: notes } = await supabase
    .from("project_notes")
    .select("*")
    .eq("project_id", id)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  const canWrite = !!user && (project.owner_id === user.id || (project.is_shared && project.couple_id != null));

  return <NotesView projectId={id} initialNotes={(notes ?? []) as ProjectNote[]} canWrite={canWrite} />;
}
