"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/database.types";

async function getMe() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const me = data as Profile | null;
  if (!me) throw new Error("no profile");
  if (!me.couple_id) throw new Error("no couple — invite your partner first");
  return { supabase, me, userId: user.id };
}

// ---------- Events ----------

export async function createEvent(input: { title: string; datetime: string; location?: string; notes?: string }) {
  const { supabase, me, userId } = await getMe();
  const { error } = await supabase.from("events").insert({
    couple_id: me.couple_id,
    title: input.title.trim(),
    datetime: input.datetime,
    location: input.location?.trim() || null,
    notes: input.notes?.trim() || null,
    created_by: userId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/shared");
}

export async function deleteEvent(id: string) {
  const supabase = await createClient();
  await supabase.from("events").delete().eq("id", id);
  revalidatePath("/shared");
}

// ---------- Bucket list ----------

export async function createBucketItem(input: { title: string; description?: string; category?: string }) {
  const { supabase, me } = await getMe();
  const { error } = await supabase.from("bucket_items").insert({
    couple_id: me.couple_id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    category: input.category?.trim() || null,
    status: "dream",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/shared");
}

export async function updateBucketStatus(id: string, status: "dream" | "planning" | "done") {
  const supabase = await createClient();
  const updates: Record<string, unknown> = { status };
  if (status === "done") updates.completed_at = new Date().toISOString();
  if (status !== "done") updates.completed_at = null;
  await supabase.from("bucket_items").update(updates).eq("id", id);
  revalidatePath("/shared");
}

export async function deleteBucketItem(id: string) {
  const supabase = await createClient();
  await supabase.from("bucket_items").delete().eq("id", id);
  revalidatePath("/shared");
}

// ---------- Recurring dates ----------

export async function createRecurringDate(input: {
  title: string;
  anchor_date: string;
  type: "anniversary" | "birthday" | "monthly" | "custom";
  reminder_days_before?: number;
}) {
  const { supabase, me } = await getMe();
  const { error } = await supabase.from("recurring_dates").insert({
    couple_id: me.couple_id,
    title: input.title.trim(),
    anchor_date: input.anchor_date,
    type: input.type,
    reminder_days_before: input.reminder_days_before ?? 1,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/shared");
}

export async function deleteRecurringDate(id: string) {
  const supabase = await createClient();
  await supabase.from("recurring_dates").delete().eq("id", id);
  revalidatePath("/shared");
}

// ---------- Decisions ----------

export async function createDecision(input: { decision_text: string; context?: string; tags?: string[]; decided_at?: string }) {
  const { supabase, me, userId } = await getMe();
  const { error } = await supabase.from("decisions").insert({
    couple_id: me.couple_id,
    decision_text: input.decision_text.trim(),
    context: input.context?.trim() || null,
    tags: input.tags && input.tags.length > 0 ? input.tags : null,
    decided_at: input.decided_at || new Date().toISOString().slice(0, 10),
    created_by: userId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/shared");
}

export async function deleteDecision(id: string) {
  const supabase = await createClient();
  await supabase.from("decisions").delete().eq("id", id);
  revalidatePath("/shared");
}

// ---------- Memories ----------

export async function createMemory(input: { photo_url: string; caption?: string; date_of_memory?: string }) {
  const { supabase, me, userId } = await getMe();
  const { error } = await supabase.from("memories").insert({
    couple_id: me.couple_id,
    photo_url: input.photo_url,
    caption: input.caption?.trim() || null,
    date_of_memory: input.date_of_memory || new Date().toISOString().slice(0, 10),
    uploaded_by: userId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/shared");
}

export async function deleteMemory(id: string) {
  const supabase = await createClient();
  await supabase.from("memories").delete().eq("id", id);
  revalidatePath("/shared");
}

// ---------- Gift ideas (private to giver) ----------

export async function createGiftIdea(input: { for_user_id: string; idea_text: string; link_url?: string; notes?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  const { error } = await supabase.from("gift_ideas").insert({
    for_user_id: input.for_user_id,
    by_user_id: user.id,
    idea_text: input.idea_text.trim(),
    link_url: input.link_url?.trim() || null,
    notes: input.notes?.trim() || null,
    status: "idea",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/shared");
}

export async function updateGiftIdeaStatus(id: string, status: "idea" | "bought" | "given" | "dismissed") {
  const supabase = await createClient();
  await supabase.from("gift_ideas").update({ status }).eq("id", id);
  revalidatePath("/shared");
}

export async function deleteGiftIdea(id: string) {
  const supabase = await createClient();
  await supabase.from("gift_ideas").delete().eq("id", id);
  revalidatePath("/shared");
}

// ---------- Posts ----------

export async function createPost(input: { content: string; media_urls?: string[]; project_id?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      content: input.content.trim(),
      media_urls: input.media_urls && input.media_urls.length > 0 ? input.media_urls : null,
      project_id: input.project_id || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/feed");
  return data;
}

export async function deletePost(id: string) {
  const supabase = await createClient();
  await supabase.from("posts").delete().eq("id", id);
  revalidatePath("/feed");
}

export async function toggleReaction(postId: string, emoji: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  // try delete first; if no rows affected, insert
  const { data: existingRaw } = await supabase
    .from("post_reactions")
    .select("*")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();
  const existing = existingRaw as { id: string } | null;
  if (existing) {
    await supabase.from("post_reactions").delete().eq("id", existing.id);
  } else {
    await supabase.from("post_reactions").insert({ post_id: postId, user_id: user.id, emoji });
  }
  revalidatePath("/feed");
}

export async function commentOnPost(postId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  const { error } = await supabase.from("post_comments").insert({
    post_id: postId,
    user_id: user.id,
    content: content.trim(),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/feed");
}

export async function deleteComment(id: string) {
  const supabase = await createClient();
  await supabase.from("post_comments").delete().eq("id", id);
  revalidatePath("/feed");
}
