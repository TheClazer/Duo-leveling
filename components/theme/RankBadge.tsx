import { cn } from "@/lib/utils";
import { rankFromLevel } from "@/lib/utils";

const RANK_COLORS: Record<string, string> = {
  S: "from-amber-300 via-rose-400 to-violet-500",
  A: "from-violet-400 to-fuchsia-500",
  B: "from-sky-400 to-indigo-500",
  C: "from-emerald-400 to-teal-500",
  D: "from-stone-400 to-stone-500",
  E: "from-zinc-500 to-zinc-600",
};

export function RankBadge({ level, className }: { level: number; className?: string }) {
  const rank = rankFromLevel(level);
  return (
    <div
      className={cn(
        "relative inline-flex h-16 w-16 items-center justify-center rounded-full",
        "bg-gradient-to-br shadow-[0_0_24px_rgb(var(--border-glow)/0.45)]",
        RANK_COLORS[rank],
        className,
      )}
      aria-label={`Rank ${rank}, Level ${level}`}
    >
      <div className="absolute inset-1 rounded-full bg-bg-base/85 backdrop-blur" />
      <div className="relative flex flex-col items-center leading-none">
        <span className="font-mono text-[10px] uppercase tracking-widest text-fg-muted">Rank</span>
        <span className="font-mono text-2xl font-bold text-fg">{rank}</span>
      </div>
    </div>
  );
}
