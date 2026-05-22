import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TimeView } from "./TimeView";
import type { ProjectTimeLog, Profile, Project } from "@/lib/supabase/database.types";
import { subDays, format } from "date-fns";

export default async function TimePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: projectRaw } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  const project = projectRaw as Project | null;
  if (!project) notFound();

  const cutoff = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const { data: logsRaw } = await supabase
    .from("project_time_logs")
    .select("*")
    .eq("project_id", id)
    .gte("started_at", cutoff)
    .order("started_at", { ascending: false });
  const logs = (logsRaw ?? []) as ProjectTimeLog[];

  type SmallProfile = Pick<Profile, "id" | "display_name" | "avatar_url" | "theme">;
  const userIds = Array.from(new Set(logs.map((l) => l.user_id)));
  const { data: profilesRaw } = userIds.length > 0
    ? await supabase.from("profiles").select("*").in("id", userIds)
    : { data: [] as SmallProfile[] };
  const profiles = (profilesRaw ?? []) as SmallProfile[];

  const canWrite = !!user && (project.owner_id === user.id || (project.is_shared && project.couple_id != null));

  return (
    <TimeView
      projectId={id}
      initialLogs={logs}
      profiles={profiles}
      canWrite={canWrite}
    />
  );
}
