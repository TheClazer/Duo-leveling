// Achievements engine (Bible §7.10, §16)
// Server-side helper: call after a mutation to evaluate triggers and unlock badges.
// Note: meta + codes live in lib/achievements-meta.ts (client-safe). Re-exported here
// for convenience so server callers can import everything from one place.

import { createServiceClient } from "@/lib/supabase/server";
import { levelFromXP, XP_SOURCES, type XPSource } from "@/lib/xp";
import { ACHIEVEMENT_META, type AchievementCode } from "@/lib/achievements-meta";

export { ACHIEVEMENT_META, type AchievementCode };

/**
 * Award XP and check for level-up + achievement unlocks.
 * Returns any newly unlocked achievements (including LEVEL_* if crossed).
 * Uses service-role to bypass RLS — call only from trusted server actions / API routes.
 */
export async function grantXP(userId: string, source: XPSource, multiplier = 1): Promise<{ leveledUp: boolean; newLevel: number; achievements: AchievementCode[] }> {
  const admin = createServiceClient();
  const amount = XP_SOURCES[source] * multiplier;
  if (amount <= 0) return { leveledUp: false, newLevel: 1, achievements: [] };

  const { data: profileRaw } = await admin.from("profiles").select("*").eq("id", userId).single();
  const profile = profileRaw as { xp: number; level: number } | null;
  if (!profile) return { leveledUp: false, newLevel: 1, achievements: [] };

  const newXP = profile.xp + amount;
  const newLevel = levelFromXP(newXP);
  const leveledUp = newLevel > profile.level;

  await admin.from("profiles").update({ xp: newXP, level: newLevel }).eq("id", userId);

  const unlocked: AchievementCode[] = [];
  if (leveledUp) {
    if (newLevel >= 10 && profile.level < 10) unlocked.push("LEVEL_10");
    if (newLevel >= 25 && profile.level < 25) unlocked.push("LEVEL_25");
    if (newLevel >= 55 && profile.level < 55) unlocked.push("LEVEL_55");
  }

  for (const code of unlocked) {
    await admin.from("achievements").upsert({ user_id: userId, code, data: { level: newLevel } }, { onConflict: "user_id,code" });
  }

  return { leveledUp, newLevel, achievements: unlocked };
}

/** Try to unlock a single achievement; idempotent (silent if already unlocked). */
export async function tryUnlock(userId: string, code: AchievementCode, data?: Record<string, unknown>): Promise<boolean> {
  const admin = createServiceClient();
  const { data: existingRaw } = await admin
    .from("achievements")
    .select("*")
    .eq("user_id", userId)
    .eq("code", code)
    .maybeSingle();
  if (existingRaw) return false;
  const { error } = await admin.from("achievements").insert({ user_id: userId, code, data: data ?? null });
  return !error;
}

/** Quick counts; uses service-role to avoid RLS round trips. */
async function countWhere(table: string, filter: Record<string, unknown>): Promise<number> {
  const admin = createServiceClient();
  let q = admin.from(table).select("id", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
  const { count } = await q;
  return count ?? 0;
}

/** Evaluate count-based triggers for a user. Call after mutations that move counts. */
export async function evaluateTriggers(userId: string): Promise<AchievementCode[]> {
  const unlocked: AchievementCode[] = [];
  const tryAdd = async (code: AchievementCode, condition: boolean, data?: Record<string, unknown>) => {
    if (!condition) return;
    if (await tryUnlock(userId, code, data)) unlocked.push(code);
  };

  const [journalCount, postCount, bucketDone, decisionsCount, memoriesCount, goalsDone, projects, projectsDone, milestonesDone, updateCount, jointProjectsDone] = await Promise.all([
    countWhere("notes", { user_id: userId }),
    countWhere("posts", { user_id: userId }),
    countWhere("bucket_items", { status: "done" }),
    countWhere("decisions", {}),
    countWhere("memories", {}),
    countWhere("goals", { user_id: userId }).then(async () => {
      const admin = createServiceClient();
      const { count } = await admin.from("goals").select("id", { count: "exact", head: true }).eq("user_id", userId).not("completed_at", "is", null);
      return count ?? 0;
    }),
    countWhere("projects", { owner_id: userId }),
    (async () => {
      const admin = createServiceClient();
      const { count } = await admin.from("projects").select("id", { count: "exact", head: true }).eq("owner_id", userId).eq("status", "done");
      return count ?? 0;
    })(),
    (async () => {
      const admin = createServiceClient();
      const { count } = await admin
        .from("project_milestones")
        .select("id", { count: "exact", head: true })
        .eq("done", true);
      return count ?? 0;
    })(),
    countWhere("project_updates", { user_id: userId }),
    (async () => {
      const admin = createServiceClient();
      const { count } = await admin.from("projects").select("id", { count: "exact", head: true }).eq("is_shared", true).eq("status", "done");
      return count ?? 0;
    })(),
  ]);

  await tryAdd("JOURNAL_50", journalCount >= 50, { count: journalCount });
  await tryAdd("POSTS_100", postCount >= 100, { count: postCount });
  await tryAdd("BUCKET_5", bucketDone >= 5);
  await tryAdd("DECISIONS_50", decisionsCount >= 50);
  await tryAdd("MEMORIES_100", memoriesCount >= 100);
  await tryAdd("GOAL_FIRST", goalsDone >= 1);
  await tryAdd("GOAL_10", goalsDone >= 10);
  await tryAdd("PROJ_FIRST", projects >= 1);
  await tryAdd("PROJ_DONE_1", projectsDone >= 1);
  await tryAdd("PROJ_DONE_10", projectsDone >= 10);
  await tryAdd("MILE_50", milestonesDone >= 50);
  await tryAdd("UPDATE_100", updateCount >= 100);
  await tryAdd("JOINT_PROJ_1", jointProjectsDone >= 1);
  await tryAdd("JOINT_PROJ_5", jointProjectsDone >= 5);

  // award XP for each unlocked achievement
  for (const _ of unlocked) await grantXP(userId, "achievement");
  return unlocked;
}

/** Re-export for UI components */
export { rankFromLevel } from "@/lib/xp";
