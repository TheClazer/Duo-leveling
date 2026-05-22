"use client";

/**
 * RankCodex — Hunter Association rank reference, Solo Leveling-styled.
 *
 * Opens when the user clicks their RankBadge in the hero. Shows all six ranks
 * (E -> S) with color-coded gradients, lore descriptions, and a live progress
 * bar from the user's current rank threshold to the next rank threshold.
 *
 * Past ranks are shown with a checkmark; future ranks are dimmed + locked.
 * Built directly on Radix Dialog primitives so it can use a tighter layout
 * than the generic <Dialog> shell.
 */

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Lock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { xpForLevel, rankFromLevel, type Rank } from "@/lib/xp";

type RankMeta = {
  rank: Rank;
  level: number;
  color: string;     // gradient classes for the rank chip
  lore: string;
};

// Thresholds mirror rankFromLevel() in lib/xp.ts — keep in sync.
const RANKS: RankMeta[] = [
  { rank: "E", level: 1,  color: "from-zinc-400 to-zinc-600",       lore: "Awakened. The journey begins." },
  { rank: "D", level: 5,  color: "from-emerald-400 to-emerald-600", lore: "Disciplined. The first habits stick." },
  { rank: "C", level: 10, color: "from-sky-400 to-indigo-500",      lore: "Competent. Routines forged in fire." },
  { rank: "B", level: 20, color: "from-amber-300 to-amber-500",     lore: "Battle-hardened. The work compounds." },
  { rank: "A", level: 35, color: "from-orange-400 to-rose-500",     lore: "Ascendant. Few stand above." },
  { rank: "S", level: 55, color: "from-violet-400 to-fuchsia-500",  lore: "Sovereign. The Shadow Monarch's tier." },
];

export function RankCodex({
  open,
  onOpenChange,
  level,
  xp,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  level: number;
  xp: number;
}) {
  const currentRank = rankFromLevel(level);
  const currentIdx = RANKS.findIndex((r) => r.rank === currentRank);
  const next = RANKS[currentIdx + 1];

  // Progress 0..1 from current rank threshold to next rank threshold.
  const startXP = xpForLevel(RANKS[currentIdx].level);
  const endXP = next ? xpForLevel(next.level) : startXP + 1;
  const pct = next
    ? Math.max(0, Math.min(100, ((xp - startXP) / (endXP - startXP)) * 100))
    : 100;
  const xpToNext = next ? Math.max(0, endXP - xp) : 0;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-3 p-6",
            "rounded-lg bg-bg-elevated border border-accent/70",
            "shadow-[0_0_0_1px_rgb(var(--accent-primary)/0.35),0_24px_64px_-12px_rgb(var(--accent-primary)/0.55),0_0_120px_-20px_rgb(var(--accent-primary)/0.6)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          {/* Top accent rail */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent"
          />

          <DialogPrimitive.Title asChild>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Hunter Codex</p>
              <h2 className="font-display text-2xl font-semibold text-fg">Ranks</h2>
            </div>
          </DialogPrimitive.Title>

          <DialogPrimitive.Description className="text-sm text-fg-muted">
            You stand at <span className="font-semibold text-accent">Rank {currentRank}</span>, Level {level}.
            {next ? (
              <>
                {" "}<span className="text-fg">{xpToNext.toLocaleString()} XP</span> to <span className="font-semibold text-accent">Rank {next.rank}</span>.
              </>
            ) : (
              <> The apex.</>
            )}
          </DialogPrimitive.Description>

          {next && (
            <div className="h-2 overflow-hidden rounded-full bg-bg-base/60" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent-secondary transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}

          <ul className="mt-2 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {RANKS.map((r, i) => {
              const isCurrent = r.rank === currentRank;
              const isPast = i < currentIdx;
              const isLocked = i > currentIdx;
              return (
                <li
                  key={r.rank}
                  className={cn(
                    "relative flex items-center gap-3 rounded-md border p-3 transition-all",
                    isCurrent && "border-accent bg-bg-card/70 shadow-[0_0_22px_rgb(var(--accent-primary)/0.35)]",
                    isPast && "border-glow/20 bg-bg-card/30 opacity-80",
                    isLocked && "border-glow/10 bg-bg-card/20 opacity-50",
                  )}
                >
                  <div
                    className={cn(
                      "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br shadow-[0_0_18px_rgb(var(--border-glow)/0.4)]",
                      r.color,
                      isLocked && "saturate-50",
                    )}
                    aria-hidden
                  >
                    <div className="absolute inset-[3px] rounded-full bg-bg-base/85" />
                    <span className="relative font-mono text-base font-bold text-fg">{r.rank}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-base font-semibold text-fg">Rank {r.rank}</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-fg-muted">Lv {r.level}+</span>
                      {isCurrent && (
                        <span className="rounded-full bg-accent/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-accent">
                          You are here
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-fg-muted">{r.lore}</p>
                  </div>
                  {isPast && <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-label="Cleared" />}
                  {isLocked && <Lock className="h-4 w-4 shrink-0 text-fg-muted/70" aria-label="Locked" />}
                </li>
              );
            })}
          </ul>

          <DialogPrimitive.Close className="absolute right-3 top-3 rounded-md p-1 text-fg-muted transition-colors hover:bg-bg-card hover:text-fg">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
