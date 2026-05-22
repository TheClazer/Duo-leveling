/**
 * System FX — client-only "wow moment" helpers.
 *
 * Two channels:
 *   notifyXP(amount, source)  -> floating "+XP" banner in the corner
 *   haptic.tap() / .done() / .err()  -> very light vibration on supported devices
 *
 * Both are no-ops on the server and on devices without the relevant capability.
 * Keep the haptic durations short (6-12ms) — the user explicitly asked for
 * "very light" so anything heavier is wrong.
 */

import { XP_SOURCES, type XPSource } from "@/lib/xp";

// -------------------- XP banner event bus --------------------

export type XPGainEvent = {
  amount: number;
  source: XPSource;
};

const XP_EVT = "system:xp-gain";

export function notifyXP(source: XPSource, multiplier = 1) {
  if (typeof window === "undefined") return;
  const amount = XP_SOURCES[source] * multiplier;
  if (amount <= 0) return;
  window.dispatchEvent(
    new CustomEvent<XPGainEvent>(XP_EVT, { detail: { amount, source } }),
  );
}

export function onXPGain(handler: (evt: XPGainEvent) => void) {
  if (typeof window === "undefined") return () => {};
  const wrapped = (e: Event) => handler((e as CustomEvent<XPGainEvent>).detail);
  window.addEventListener(XP_EVT, wrapped);
  return () => window.removeEventListener(XP_EVT, wrapped);
}

/** Human-readable label for the source — shown under "+XP" in the banner. */
export function xpSourceLabel(source: XPSource): string {
  switch (source) {
    case "habit_check_in":         return "Quest cleared";
    case "goal_milestone":         return "Milestone";
    case "goal_complete":          return "Goal achieved";
    case "journal_entry":          return "Log written";
    case "post":                   return "Posted";
    case "achievement":            return "Achievement";
    case "question_answered":      return "Answered";
    case "project_task_done":      return "Task done";
    case "project_milestone_done": return "Project milestone";
    case "project_complete":       return "Project complete";
    case "hour_logged":            return "Hour logged";
    default:                       return source;
  }
}

// -------------------- Haptic --------------------

/**
 * Light haptic patterns. All are intentionally subtle — the user asked for
 * "very light". Anything above ~12ms feels buzzy and breaks the spell.
 * Most browsers ignore vibrate() if the user hasn't interacted yet, so these
 * are safe to call eagerly.
 */
export const haptic = {
  /** Featherweight tap (6ms) — pair with affirmative taps like marking a habit done. */
  tap() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(6); } catch {}
    }
  },
  /** Slight double-pulse (4-3-6) — milestone or goal completion. Still feather-light. */
  done() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate([4, 3, 6]); } catch {}
    }
  },
  /** Error: tiny back-tap (3-2-3). Reserved for failed mutations. */
  err() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate([3, 2, 3]); } catch {}
    }
  },
};
