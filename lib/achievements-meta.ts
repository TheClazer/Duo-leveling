// Client-safe registry of achievement metadata.
// Separated from lib/achievements.ts (which imports server-only modules) so
// client components can render names + flavor without pulling next/headers.

export type AchievementCode =
  | "FIRST_SPARK"     | "FLAME_7"        | "SHADOW_30"      | "MONARCH_100"
  | "LC_100"          | "LC_HARD_50"     | "GH_YEAR"
  | "JOURNAL_50"      | "POSTS_100"
  | "TOGETHER_100"    | "TOGETHER_365"
  | "BUCKET_5"        | "DECISIONS_50"   | "SURPRISE_5"     | "MEMORIES_100"
  | "GOAL_FIRST"      | "GOAL_10"
  | "LEVEL_10"        | "LEVEL_25"       | "LEVEL_55"
  | "PROJ_FIRST"      | "PROJ_DONE_1"    | "PROJ_DONE_10"
  | "JOINT_PROJ_1"    | "JOINT_PROJ_5"
  | "TIME_100"        | "TIME_1000"      | "MILE_50"        | "UPDATE_100"
  | "GH_LINKED_PROJ";

export const ACHIEVEMENT_META: Record<AchievementCode, { name: string; flavor: string }> = {
  FIRST_SPARK:    { name: "First Spark",       flavor: "The first habit logged. Every monarch starts here." },
  FLAME_7:        { name: "Seven Day Flame",   flavor: "A habit held for 7 consecutive days." },
  SHADOW_30:      { name: "Shadow Soldier",    flavor: "30-day streak. The shadow grows." },
  MONARCH_100:    { name: "Monarch",           flavor: "100-day streak. Unshakeable." },
  LC_100:         { name: "Hundred Hunter",    flavor: "100 LeetCode problems felled." },
  LC_HARD_50:     { name: "Hard Counter",      flavor: "50 LeetCode Hards. No mercy." },
  GH_YEAR:        { name: "Green Forest",      flavor: "365 GitHub contributions in a year." },
  JOURNAL_50:     { name: "Worded Wisdom",     flavor: "50 journal entries written." },
  POSTS_100:      { name: "Daily Diarist",     flavor: "100 posts to the feed." },
  TOGETHER_100:   { name: "Hundred Days",      flavor: "100 days together in The System." },
  TOGETHER_365:   { name: "First Year",        flavor: "365 days together. The bond holds." },
  BUCKET_5:       { name: "Adventurer",        flavor: "5 bucket-list items completed." },
  DECISIONS_50:   { name: "The Council",       flavor: "50 logged decisions. Future-you thanks you." },
  SURPRISE_5:     { name: "Surprise Architect",flavor: "5 surprises sent." },
  MEMORIES_100:   { name: "Storykeeper",       flavor: "100 memories uploaded." },
  GOAL_FIRST:     { name: "First Conquest",    flavor: "First goal completed." },
  GOAL_10:        { name: "Goal Tenacity",     flavor: "10 goals completed." },
  LEVEL_10:       { name: "Level 10",          flavor: "Past the threshold." },
  LEVEL_25:       { name: "Hunter A",          flavor: "Rank A reached." },
  LEVEL_55:       { name: "Hunter S",          flavor: "Rank S. Apex." },
  PROJ_FIRST:     { name: "Architect",         flavor: "First project created." },
  PROJ_DONE_1:    { name: "First Ship",        flavor: "First project shipped." },
  PROJ_DONE_10:   { name: "Serial Builder",    flavor: "10 projects shipped." },
  JOINT_PROJ_1:   { name: "Co-Builder",        flavor: "First joint project completed." },
  JOINT_PROJ_5:   { name: "Build Together",    flavor: "5 joint projects completed." },
  TIME_100:       { name: "Hundred Hours",     flavor: "100 hours logged on one project." },
  TIME_1000:      { name: "Marathon",          flavor: "1000 total hours across all projects." },
  MILE_50:        { name: "Mile Marker",       flavor: "50 milestones completed." },
  UPDATE_100:     { name: "Loud Builder",      flavor: "100 project updates posted." },
  GH_LINKED_PROJ: { name: "Open Source Heart", flavor: "First project linked to a GitHub repo." },
};
