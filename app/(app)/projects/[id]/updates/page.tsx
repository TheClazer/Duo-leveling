import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UpdatesView } from "./UpdatesView";
import type { ProjectUpdate, Profile, Project } from "@/lib/supabase/database.types";

export default async function UpdatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: projectRaw } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  const project = projectRaw as Project | null;
  if (!project) notFound();

  const { data: updatesRaw } = await supabase
    .from("project_updates")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });
  const updates = (updatesRaw ?? []) as ProjectUpdate[];

  type SmallProfile = Pick<Profile, "id" | "display_name" | "avatar_url" | "theme">;
  const userIds = Array.from(new Set(updates.map((u) => u.user_id)));
  const { data: profilesRaw } = userIds.length > 0
    ? await supabase.from("profiles").select("*").in("id", userIds)
    : { data: [] as SmallProfile[] };
  const profiles = (profilesRaw ?? []) as SmallProfile[];

  const canWrite = !!user && (project.owner_id === user.id || (project.is_shared && project.couple_id != null));

  return (
    <UpdatesView
      projectId={id}
      initialUpdates={updates}
      profiles={profiles}
      canWrite={canWrite}
      currentUserId={user?.id ?? ""}
    />
  );
}
