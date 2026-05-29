import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek, subDays } from "date-fns";
import { istDateString } from "@/lib/date";

export const HABIT_COLORS = [
  { key: "violet",  bg: "bg-violet-500",  ring: "ring-violet-400/60",  rgb: "124 58 237"  },
  { key: "ember",   bg: "bg-orange-500",  ring: "ring-orange-400/60",  rgb: "234 88 12"   },
  { key: "sakura",  bg: "bg-pink-400",    ring: "ring-pink-400/60",    rgb: "236 72 153"  },
  { key: "gold",    bg: "bg-amber-400",   ring: "ring-amber-400/60",   rgb: "245 158 11"  },
  { key: "emerald", bg: "bg-emerald-400", ring: "ring-emerald-400/60", rgb: "16 185 129"  },
  { key: "sky",     bg: "bg-sky-400",     ring: "ring-sky-400/60",     rgb: "56 189 248"  },
] as const;

export type HabitColorKey = (typeof HABIT_COLORS)[number]["key"];

export function colorMeta(key: string) {
  return HABIT_COLORS.find((c) => c.key === key) ?? HABIT_COLORS[0];
}

export function todayIso(): string {
  return istDateString();
}

/** Returns a 53-column × 7-row grid of dates ending today. */
export function heatmapDates(today = new Date()): string[][] {
  // Last column = the week containing today. Build right-to-left.
  const lastWeekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
  const weeks: string[][] = [];
  for (let w = 52; w >= 0; w--) {
    const colStart = subDays(lastWeekStart, w * 7);
    const col: string[] = [];
    for (let d = 0; d < 7; d++) {
      col.push(format(addDays(colStart, d), "yyyy-MM-dd"));
    }
    weeks.push(col);
  }
  return weeks; // 53 columns
}

/** Compute current streak (consecutive days ending today). */
export function currentStreak(entries: { date: string }[], today = new Date()): number {
  const set = new Set(entries.map((e) => e.date));
  let streak = 0;
  let cursor = today;
  while (set.has(format(cursor, "yyyy-MM-dd"))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

/** Longest streak across all entries. */
export function longestStreak(entries: { date: string }[]): number {
  if (entries.length === 0) return 0;
  const sorted = entries
    .map((e) => parseISO(e.date).getTime())
    .sort((a, b) => a - b)
    .map((t) => new Date(t));
  let best = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (differenceInCalendarDays(sorted[i], sorted[i - 1]) === 1) {
      cur++;
      best = Math.max(best, cur);
    } else if (differenceInCalendarDays(sorted[i], sorted[i - 1]) > 1) {
      cur = 1;
    }
  }
  return best;
}

/** Percent of weekly target hit, last 7 days. */
export function weeklyHitPct(entries: { date: string }[], target: number, today = new Date()): number {
  const cutoff = subDays(today, 6);
  const hits = entries.filter((e) => {
    const d = parseISO(e.date);
    return d >= cutoff && d <= today;
  }).length;
  return Math.min(100, Math.round((hits / target) * 100));
}

/** Map of date → value for fast lookup */
export function entryMap(entries: { date: string; value: number }[]) {
  const m = new Map<string, number>();
  for (const e of entries) m.set(e.date, Number(e.value));
  return m;
}

/** Max value in last 90 days, for shading scale. Min 1 to avoid /0. */
export function recentMax(entries: { date: string; value: number }[], today = new Date()): number {
  const cutoff = subDays(today, 90);
  let max = 1;
  for (const e of entries) {
    const d = parseISO(e.date);
    if (d >= cutoff && d <= today) max = Math.max(max, Number(e.value));
  }
  return max;
}
