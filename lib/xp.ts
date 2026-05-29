// XP & Level system (Bible §10.3)

export const XP_SOURCES = {
  habit_check_in:        5,
  goal_milestone:       25,
  goal_complete:       100,
  journal_entry:        10,
  post:                  2,
  achievement:          50,
  project_task_done:    10,
  project_milestone_done: 50,
  project_complete:    200,
  hour_logged:          15,
} as const;

export type XPSource = keyof typeof XP_SOURCES;

/** Level = floor(sqrt(XP / 50)) + 1 — slow curve so each level feels meaningful. */
export function levelFromXP(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
}

export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 50;
}

export type Rank = "E" | "D" | "C" | "B" | "A" | "S";
export function rankFromLevel(level: number): Rank {
  if (level >= 55) return "S";
  if (level >= 35) return "A";
  if (level >= 20) return "B";
  if (level >= 10) return "C";
  if (level >= 5)  return "D";
  return "E";
}
