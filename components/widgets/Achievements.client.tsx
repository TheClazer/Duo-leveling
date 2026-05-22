"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Pin, PinOff, Trophy, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ACHIEVEMENT_META, type AchievementCode } from "@/lib/achievements-meta";
import type { Achievement } from "@/lib/supabase/database.types";

const ALL_CODES = Object.keys(ACHIEVEMENT_META) as AchievementCode[];

export function AchievementsClient({ initial, readOnly }: { initial: Achievement[]; readOnly: boolean }) {
  const [items, setItems] = useState(initial);
  const [, startTransition] = useTransition();
  const [showLocked, setShowLocked] = useState(false);

  const unlockedCodes = new Set(items.map((i) => i.code));
  const pinnedCount = items.filter((i) => i.pinned).length;

  function togglePin(a: Achievement) {
    if (readOnly) return;
    const next = !a.pinned;
    if (next && pinnedCount >= 3) {
      alert("Pin up to 3. Unpin another first.");
      return;
    }
    setItems((cur) => cur.map((x) => (x.id === a.id ? { ...x, pinned: next } : x)).sort((a, b) => Number(b.pinned) - Number(a.pinned)));
    startTransition(async () => {
      const supabase = createClient();
      await supabase.from("achievements").update({ pinned: next }).eq("id", a.id);
    });
  }

  return (
    <div className="surface p-5 flex h-full flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Trophy Case</p>
          <h3 className="font-display text-lg font-semibold text-fg">Achievements</h3>
        </div>
        <button
          onClick={() => setShowLocked((s) => !s)}
          className="font-mono text-[10px] uppercase tracking-widest text-fg-muted hover:text-fg"
        >
          {showLocked ? "Unlocked only" : `Show all (${ALL_CODES.length})`}
        </button>
      </div>

      {items.length === 0 && !showLocked ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="rounded-md border border-dashed border-glow/25 bg-bg-card/30 px-4 py-6 text-center text-sm text-fg-muted">
            No achievements yet. Mark a habit done, ship a goal, finish a project — they unlock as you go.
          </p>
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {(showLocked ? ALL_CODES : items.map((i) => i.code as AchievementCode)).map((code) => {
            const meta = ACHIEVEMENT_META[code];
            const a = items.find((i) => i.code === code);
            const unlocked = !!a;
            return (
              <div
                key={code}
                className={cn(
                  "group relative rounded-lg border p-3 transition-all",
                  unlocked
                    ? "border-accent/40 bg-bg-elevated/50 shadow-[0_0_18px_rgb(var(--border-glow)/0.2)]"
                    : "border-glow/15 bg-bg-card/30 opacity-50 grayscale",
                )}
                title={meta.flavor}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", unlocked ? "bg-gradient-to-br from-accent/60 to-accent-secondary/40" : "bg-bg-base/50")}>
                    {unlocked ? <Trophy className="h-4 w-4 text-bg-base" /> : <Lock className="h-4 w-4 text-fg-muted" />}
                  </div>
                  {unlocked && !readOnly && (
                    <button onClick={() => togglePin(a)} className="rounded p-1 text-fg-muted hover:text-accent" aria-label={a.pinned ? "Unpin" : "Pin"}>
                      {a.pinned ? <Pin className="h-3.5 w-3.5 text-accent" /> : <PinOff className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />}
                    </button>
                  )}
                </div>
                <div className="mt-2 font-display text-sm font-semibold text-fg leading-tight">{meta.name}</div>
                <div className="mt-1 text-[10px] text-fg-muted line-clamp-2">{meta.flavor}</div>
                {unlocked && (
                  <div className="mt-1.5 font-mono text-[9px] uppercase tracking-widest text-fg-muted">
                    {formatDistanceToNow(parseISO(a.unlocked_at), { addSuffix: true })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
