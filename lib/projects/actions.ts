"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  ProjectActivityAction,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
} from "@/lib/supabase/database.types";

async function logActivity(
  projectId: string,
  action: ProjectActivityAction,
  targetId?: string | null,
  metadata?: Record<string, unknown>,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("project_activity").insert({
    project_id: projectId,
    user_id: user.id,
    action,
    target_id: targetId ?? null,
    metadata: metadata ?? null,
  });
}

async function recomputeProgress(projectId: string) {
  const supabase = await createClient();
  // Progress = % milestones done if any; else % tasks done; else current value.
  const { data: msRaw } = await supabase
    .from("project_milestones")
    .select("*")
    .eq("project_id", projectId);
  const ms = (msRaw ?? []) as Array<{ done: boolean }>;
  let pct: number | null = null;
  if (ms.length > 0) {
    pct = Math.round((ms.filter((m) => m.done).length / ms.length) * 100);
  } else {
    const { data: tsRaw } = await supabase
      .from("project_tasks")
      .select("*")
      .eq("project_id", projectId)
      .is("parent_task_id", null);
    const ts = (tsRaw ?? []) as Array<{ status: string }>;
    if (ts.length > 0) {
      pct = Math.round((ts.filter((t) => t.status === "done").length / ts.length) * 100);
    }
  }
  if (pct !== null) {
    const updates: Record<string, unknown> = { progress_pct: pct };
    if (pct === 100) updates.completed_at = new Date().toISOString();
    if (pct < 100) updates.completed_at = null;
    await supabase.from("projects").update(updates).eq("id", projectId);
  }
}

// ---------- Project CRUD ----------

export async function createProject(input: {
  title: string;
  description?: string;
  is_shared: boolean;
  category?: string;
  target_date?: string | null;
  cover_image_url?: string | null;
  github_repo?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { couple_id: string | null } | null;

  if (input.is_shared && !profile?.couple_id) {
    throw new Error("Shared projects require a linked partner. Invite your partner first.");
  }

  const { data: projectRaw, error } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      couple_id: input.is_shared ? profile?.couple_id : null,
      is_shared: input.is_shared,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      target_date: input.target_date || null,
      cover_image_url: input.cover_image_url || null,
      github_repo: input.github_repo?.trim() || null,
      status: "active",
    })
    .select()
    .single();
  const project = projectRaw as { id: string; title: string } | null;

  if (error || !project) throw new Error(error?.message ?? "Failed to create project");

  await logActivity(project.id, "created", project.id, { title: project.title });
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const supabase = await createClient();
  const { data: prevRaw } = await supabase.from("projects").select("*").eq("id", projectId).single();
  const prev = prevRaw as { status: ProjectStatus } | null;
  const updates: Record<string, unknown> = { status };
  if (status === "done") updates.completed_at = new Date().toISOString();
  if (status !== "done") updates.completed_at = null;
  const { error } = await supabase.from("projects").update(updates).eq("id", projectId);
  if (error) throw new Error(error.message);
  await logActivity(projectId, "status_changed", projectId, { from: prev?.status, to: status });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function togglePinProject(projectId: string, pinned: boolean) {
  const supabase = await createClient();
  await supabase.from("projects").update({ pinned }).eq("id", projectId);
  revalidatePath("/projects");
  revalidatePath("/you");
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
  redirect("/projects");
}

/** Promote a personal Goal into a tracked Project (Bible §9.14). Carries over
 *  title / description / deadline / category and links the two. Idempotent —
 *  re-promoting just jumps to the existing linked project. */
export async function promoteGoalToProject(goalId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  // Already promoted? Jump to the existing linked project.
  const { data: existingRaw } = await supabase
    .from("projects").select("id").eq("linked_goal_id", goalId).maybeSingle();
  const existing = existingRaw as { id: string } | null;
  if (existing) redirect(`/projects/${existing.id}`);

  const { data: goalRaw } = await supabase.from("goals").select("*").eq("id", goalId).single();
  const goal = goalRaw as
    | { id: string; user_id: string; title: string; description: string | null; deadline: string | null; category: string | null }
    | null;
  if (!goal) throw new Error("goal not found");
  if (goal.user_id !== user.id) throw new Error("not your goal");

  const { data: projRaw, error } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      is_shared: false,
      title: goal.title,
      description: goal.description,
      category: goal.category,
      target_date: goal.deadline,
      linked_goal_id: goal.id,
      status: "active",
    })
    .select()
    .single();
  const project = projRaw as { id: string } | null;
  if (error || !project) throw new Error(error?.message ?? "failed to create project");

  await logActivity(project.id, "created", project.id, { title: goal.title, from_goal: goal.id });
  revalidatePath("/projects");
  revalidatePath("/you");
  redirect(`/projects/${project.id}`);
}

// ---------- Tasks ----------

export async function createTask(input: {
  project_id: string;
  title: string;
  description?: string;
  assigned_to?: string | null;
  due_date?: string | null;
  priority?: TaskPriority | null;
  parent_task_id?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_tasks")
    .insert({
      project_id: input.project_id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      assigned_to: input.assigned_to || null,
      due_date: input.due_date || null,
      priority: input.priority || null,
      parent_task_id: input.parent_task_id || null,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "failed");
  await logActivity(input.project_id, "task_added", data.id, { title: data.title });
  await recomputeProgress(input.project_id);
  revalidatePath(`/projects/${input.project_id}`);
  revalidatePath(`/projects/${input.project_id}/tasks`);
  return data;
}

export async function updateTask(
  taskId: string,
  patch: Partial<{
    title: string;
    description: string | null;
    done: boolean;
    status: TaskStatus;
    assigned_to: string | null;
    due_date: string | null;
    priority: TaskPriority | null;
    order_idx: number;
  }>,
) {
  const supabase = await createClient();
  const { data: tRaw } = await supabase.from("project_tasks").select("*").eq("id", taskId).single();
  const t = tRaw as { project_id: string; status: TaskStatus; done: boolean } | null;
  if (!t) throw new Error("not found");

  // keep done + status in sync
  const next: Record<string, unknown> = { ...patch };
  if (patch.status !== undefined) {
    next.done = patch.status === "done";
    next.completed_at = patch.status === "done" ? new Date().toISOString() : null;
  } else if (patch.done !== undefined) {
    next.status = patch.done ? "done" : "todo";
    next.completed_at = patch.done ? new Date().toISOString() : null;
  }

  const { error } = await supabase.from("project_tasks").update(next).eq("id", taskId);
  if (error) throw new Error(error.message);

  const becameDone = (next.done === true && !t.done) || (next.status === "done" && t.status !== "done");
  if (becameDone) await logActivity(t.project_id, "task_completed", taskId);
  else await logActivity(t.project_id, "task_updated", taskId, patch);

  await recomputeProgress(t.project_id);
  revalidatePath(`/projects/${t.project_id}`);
  revalidatePath(`/projects/${t.project_id}/tasks`);
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const { data: tRaw } = await supabase.from("project_tasks").select("*").eq("id", taskId).single();
  const t = tRaw as { project_id: string } | null;
  await supabase.from("project_tasks").delete().eq("id", taskId);
  if (t) {
    await recomputeProgress(t.project_id);
    revalidatePath(`/projects/${t.project_id}/tasks`);
  }
}

// ---------- Milestones ----------

export async function createMilestone(input: {
  project_id: string;
  title: string;
  description?: string;
  target_date?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_milestones")
    .insert({
      project_id: input.project_id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      target_date: input.target_date || null,
    })
    .select()
    .single();
  const created = data as { id: string; title: string } | null;
  if (error || !created) throw new Error(error?.message ?? "failed");
  await logActivity(input.project_id, "milestone_added", created.id, { title: created.title });
  await recomputeProgress(input.project_id);
  revalidatePath(`/projects/${input.project_id}/milestones`);
  return created;
}

export async function toggleMilestone(milestoneId: string, done: boolean) {
  const supabase = await createClient();
  const { data: mRaw } = await supabase
    .from("project_milestones")
    .select("*")
    .eq("id", milestoneId)
    .single();
  const m = mRaw as { project_id: string; title: string } | null;
  if (!m) throw new Error("not found");
  await supabase
    .from("project_milestones")
    .update({ done, completed_at: done ? new Date().toISOString() : null })
    .eq("id", milestoneId);
  if (done) await logActivity(m.project_id, "milestone_completed", milestoneId, { title: m.title });
  await recomputeProgress(m.project_id);
  revalidatePath(`/projects/${m.project_id}`);
  revalidatePath(`/projects/${m.project_id}/milestones`);
}

export async function deleteMilestone(milestoneId: string) {
  const supabase = await createClient();
  const { data: mRaw } = await supabase.from("project_milestones").select("*").eq("id", milestoneId).single();
  const m = mRaw as { project_id: string } | null;
  await supabase.from("project_milestones").delete().eq("id", milestoneId);
  if (m) {
    await recomputeProgress(m.project_id);
    revalidatePath(`/projects/${m.project_id}/milestones`);
  }
}

// ---------- Notes ----------

export async function upsertProjectNote(input: { id?: string; project_id: string; title?: string; content: string; pinned?: boolean }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  if (input.id) {
    const { error } = await supabase
      .from("project_notes")
      .update({ title: input.title || null, content: input.content, pinned: input.pinned ?? false, last_edited_by: user.id })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
    await logActivity(input.project_id, "note_updated", input.id);
  } else {
    const { data, error } = await supabase
      .from("project_notes")
      .insert({
        project_id: input.project_id,
        title: input.title || null,
        content: input.content,
        pinned: input.pinned ?? false,
        created_by: user.id,
        last_edited_by: user.id,
      })
      .select()
      .single();
    const created = data as { id: string } | null;
    if (error || !created) throw new Error(error?.message ?? "failed");
    await logActivity(input.project_id, "note_added", created.id);
  }
  revalidatePath(`/projects/${input.project_id}/notes`);
}

export async function deleteProjectNote(noteId: string) {
  const supabase = await createClient();
  const { data: nRaw } = await supabase.from("project_notes").select("*").eq("id", noteId).single();
  const n = nRaw as { project_id: string } | null;
  await supabase.from("project_notes").delete().eq("id", noteId);
  if (n) revalidatePath(`/projects/${n.project_id}/notes`);
}

// ---------- Resources ----------

export async function addResource(input: {
  project_id: string;
  type: "link" | "file" | "image" | "embed";
  url: string;
  title?: string;
  description?: string;
  thumbnail_url?: string;
  category?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  const { data, error } = await supabase
    .from("project_resources")
    .insert({
      project_id: input.project_id,
      type: input.type,
      url: input.url,
      title: input.title || null,
      description: input.description || null,
      thumbnail_url: input.thumbnail_url || null,
      category: input.category || null,
      added_by: user.id,
    })
    .select()
    .single();
  const created = data as { id: string; title: string | null } | null;
  if (error || !created) throw new Error(error?.message ?? "failed");
  await logActivity(input.project_id, "resource_added", created.id, { title: created.title });
  revalidatePath(`/projects/${input.project_id}/resources`);
  return created;
}

export async function deleteResource(id: string) {
  const supabase = await createClient();
  const { data: rRaw } = await supabase.from("project_resources").select("*").eq("id", id).single();
  const r = rRaw as { project_id: string } | null;
  await supabase.from("project_resources").delete().eq("id", id);
  if (r) revalidatePath(`/projects/${r.project_id}/resources`);
}

// ---------- Time tracking ----------

export async function startTimer(projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  // stop any open timer the user has running on this project
  await supabase
    .from("project_time_logs")
    .update({ ended_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("ended_at", null);
  const { data, error } = await supabase
    .from("project_time_logs")
    .insert({ project_id: projectId, user_id: user.id, started_at: new Date().toISOString(), source: "timer" })
    .select()
    .single();
  const created = data as { id: string; started_at: string } | null;
  if (error || !created) throw new Error(error?.message ?? "failed");
  revalidatePath(`/projects/${projectId}/time`);
  return created;
}

export async function stopTimer(logId: string, summary?: string) {
  const supabase = await createClient();
  const { data: logRaw } = await supabase.from("project_time_logs").select("*").eq("id", logId).single();
  const log = logRaw as { project_id: string; started_at: string } | null;
  if (!log) throw new Error("not found");
  const ended = new Date();
  const started = new Date(log.started_at);
  const minutes = Math.max(1, Math.round((ended.getTime() - started.getTime()) / 60000));
  const { error } = await supabase
    .from("project_time_logs")
    .update({ ended_at: ended.toISOString(), minutes, summary: summary?.trim() || null })
    .eq("id", logId);
  if (error) throw new Error(error.message);
  await logActivity(log.project_id, "time_logged", logId, { minutes, summary });
  revalidatePath(`/projects/${log.project_id}`);
  revalidatePath(`/projects/${log.project_id}/time`);
}

export async function addManualTimeLog(input: { project_id: string; minutes: number; summary?: string; date?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  const baseDate = input.date ? new Date(input.date + "T12:00:00") : new Date();
  const ended = baseDate;
  const started = new Date(baseDate.getTime() - input.minutes * 60000);
  const { error } = await supabase.from("project_time_logs").insert({
    project_id: input.project_id,
    user_id: user.id,
    started_at: started.toISOString(),
    ended_at: ended.toISOString(),
    minutes: input.minutes,
    summary: input.summary?.trim() || null,
    source: "manual",
  });
  if (error) throw new Error(error.message);
  await logActivity(input.project_id, "time_logged", null, { minutes: input.minutes, summary: input.summary, source: "manual" });
  revalidatePath(`/projects/${input.project_id}/time`);
}

// ---------- Updates ----------

export async function postProjectUpdate(input: { project_id: string; content: string; media_urls?: string[] }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  const { data, error } = await supabase
    .from("project_updates")
    .insert({
      project_id: input.project_id,
      user_id: user.id,
      content: input.content.trim(),
      media_urls: input.media_urls && input.media_urls.length > 0 ? input.media_urls : null,
    })
    .select()
    .single();
  const created = data as { id: string } | null;
  if (error || !created) throw new Error(error?.message ?? "failed");
  await logActivity(input.project_id, "update_posted", created.id);
  revalidatePath(`/projects/${input.project_id}`);
  revalidatePath(`/projects/${input.project_id}/updates`);
  revalidatePath(`/feed`);
  return created;
}

export async function deleteProjectUpdate(id: string) {
  const supabase = await createClient();
  const { data: uRaw } = await supabase.from("project_updates").select("*").eq("id", id).single();
  const u = uRaw as { project_id: string } | null;
  await supabase.from("project_updates").delete().eq("id", id);
  if (u) revalidatePath(`/projects/${u.project_id}/updates`);
}
