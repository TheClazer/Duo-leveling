"use client";

import { useState, useTransition } from "react";
import { Code2, Flame, RefreshCw } from "lucide-react";
import { formatDistanceToNow, parseISO, subDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LeetcodeProfile } from "@/lib/supabase/database.types";

export function LeetcodeClient({ initial, readOnly }: { initial: LeetcodeProfile | null; readOnly: boolean }) {
  const [profile, setProfile] = useState(initial);
  const [editing, setEditing] = useState(!initial);
  const [username, setUsername] = useState(initial?.username ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function sync(usernameOverride?: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/leetcode/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameOverride ?? username }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "failed"); return; }
      // refetch
      const r = await fetch(`/api/leetcode/sync`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      // Just update from response — j.stats has fresh stats; reconstruct profile
      setProfile({
        user_id: profile?.user_id ?? "",
        username: usernameOverride ?? username,
        last_synced: new Date().toISOString(),
        total_solved: j.stats.total_solved,
        easy: j.stats.easy,
        medium: j.stats.medium,
        hard: j.stats.hard,
        ranking: j.stats.ranking,
        current_streak: j.stats.current_streak,
        calendar: j.stats.calendar,
      });
      setEditing(false);
    });
  }

  return (
    <div className="surface p-5 flex h-full flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-accent" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">DSA Hunter</p>
            <h3 className="font-display text-lg font-semibold text-fg">LeetCode</h3>
          </div>
        </div>
        {!readOnly && !editing && profile && (
          <Button size="sm" variant="outline" onClick={() => sync()} disabled={pending}>
            <RefreshCw className={cn("mr-1 h-3.5 w-3.5", pending && "animate-spin")} /> Sync
          </Button>
        )}
      </div>

      {editing && !readOnly ? (
        <div className="space-y-2">
          <Input
            placeholder="LeetCode username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && username.trim()) sync(username.trim()); }}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button onClick={() => sync(username.trim())} disabled={!username.trim() || pending} className="w-full">
            {pending ? "Syncing..." : "Connect"}
          </Button>
        </div>
      ) : !profile ? (
        readOnly ? <p className="text-sm text-fg-muted italic">No LeetCode connected.</p> : null
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Total" value={profile.total_solved ?? 0} accent="text-fg" />
            <Stat label="Streak" value={`${profile.current_streak ?? 0}d`} icon={<Flame className="h-3 w-3 text-orange-400" />} accent="text-fg" />
            <Stat label="Easy" value={profile.easy ?? 0} accent="text-emerald-400" />
            <Stat label="Medium" value={profile.medium ?? 0} accent="text-amber-400" />
            <Stat label="Hard" value={profile.hard ?? 0} accent="text-red-400" />
            {profile.ranking && <Stat label="Rank" value={`#${profile.ranking.toLocaleString()}`} accent="text-fg-muted" />}
          </div>

          {profile.calendar && Object.keys(profile.calendar).length > 0 && (
            <div className="mt-4">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-fg-muted">Last 90 days</p>
              <MiniHeatmap calendar={profile.calendar} />
            </div>
          )}

          {profile.last_synced && (
            <p className="mt-3 font-mono text-[10px] text-fg-muted">
              Synced {formatDistanceToNow(parseISO(profile.last_synced), { addSuffix: true })}
              {!readOnly && (
                <button onClick={() => setEditing(true)} className="ml-2 underline">change user</button>
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, icon, accent }: { label: string; value: string | number; icon?: React.ReactNode; accent: string }) {
  return (
    <div className="rounded-md border border-glow/15 bg-bg-elevated/30 p-2.5">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-fg-muted">
        {icon} {label}
      </div>
      <div className={cn("mt-1 font-display text-xl font-semibold", accent)}>{value}</div>
    </div>
  );
}

function MiniHeatmap({ calendar }: { calendar: Record<string, number> }) {
  const days = Array.from({ length: 90 }, (_, i) => format(subDays(new Date(), 89 - i), "yyyy-MM-dd"));
  const max = Math.max(1, ...Object.values(calendar));
  return (
    <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-0.5 sm:grid-cols-[repeat(15,minmax(0,1fr))]">
      {days.map((d) => {
        const v = calendar[d] ?? 0;
        const intensity = v / max;
        return (
          <div
            key={d}
            title={`${d}${v ? ` · ${v}` : ""}`}
            className={cn("aspect-square rounded-sm", v === 0 ? "bg-bg-elevated/60" : "bg-emerald-500")}
            style={v > 0 ? { opacity: 0.25 + 0.75 * intensity } : undefined}
          />
        );
      })}
    </div>
  );
}
