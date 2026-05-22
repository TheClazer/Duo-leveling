"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { format, parseISO, subDays } from "date-fns";
import { Plus, Clock } from "lucide-react";
import { addManualTimeLog } from "@/lib/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ProjectTimeLog, Profile } from "@/lib/supabase/database.types";

type SmallProfile = Pick<Profile, "id" | "display_name" | "avatar_url" | "theme">;

export function TimeView({
  projectId,
  initialLogs,
  profiles,
  canWrite,
}: {
  projectId: string;
  initialLogs: ProjectTimeLog[];
  profiles: SmallProfile[];
  canWrite: boolean;
}) {
  const [logs] = useState(initialLogs);
  const [open, setOpen] = useState(false);

  const totalMinutes = logs.reduce((s, l) => s + (l.minutes ?? 0), 0);
  const profileById: Record<string, SmallProfile> = {};
  for (const p of profiles) profileById[p.id] = p;

  // Aggregate per day for last 30 days
  const daily = useMemo(() => {
    const buckets: Record<string, Record<string, number>> = {};
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      buckets[d] = {};
    }
    for (const l of logs) {
      if (l.minutes == null) continue;
      const d = format(parseISO(l.started_at), "yyyy-MM-dd");
      if (!buckets[d]) continue;
      buckets[d][l.user_id] = (buckets[d][l.user_id] ?? 0) + l.minutes;
    }
    return buckets;
  }, [logs]);

  const max = Math.max(60, ...Object.values(daily).map((b) => Object.values(b).reduce((s, v) => s + v, 0)));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-fg-muted">Effort</p>
          <h2 className="font-display text-2xl font-semibold text-fg">Time</h2>
          <p className="mt-1 text-sm text-fg-muted">
            <span className="font-mono">{(totalMinutes / 60).toFixed(1)}h</span> logged in the last 30 days · {logs.length} sessions
          </p>
        </div>
        {canWrite && <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Manual entry</Button>}
      </div>

      <div className="surface p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-fg-muted">Last 30 days</p>
        <div className="flex items-end gap-1 h-32">
          {Object.entries(daily).map(([date, byUser]) => {
            const total = Object.values(byUser).reduce((s, v) => s + v, 0);
            const heightPct = (total / max) * 100;
            return (
              <div key={date} className="group relative flex flex-1 flex-col justify-end" title={`${date} · ${(total / 60).toFixed(1)}h`}>
                <div className="flex flex-col-reverse gap-px overflow-hidden rounded-sm" style={{ height: `${heightPct}%`, minHeight: total > 0 ? "2px" : 0 }}>
                  {Object.entries(byUser).map(([uid, minutes]) => {
                    const userColor = profileById[uid]?.theme === "chahaein" ? "bg-amber-400" : "bg-violet-500";
                    return <div key={uid} className={userColor} style={{ flexBasis: `${(minutes / total) * 100}%` }} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="surface p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-fg-muted">Sessions</p>
        {logs.length === 0 ? (
          <p className="text-sm text-fg-muted italic">No time logged yet. Start the timer from the header.</p>
        ) : (
          <ul className="divide-y divide-glow/10">
            {logs.filter((l) => l.minutes != null).map((l) => {
              const p = profileById[l.user_id];
              return (
                <li key={l.id} className="flex items-center gap-3 py-2 text-sm">
                  {p && (
                    <div className="relative h-6 w-6 overflow-hidden rounded-full border border-glow/30 bg-bg-elevated">
                      <Image
                        src={p.avatar_url || (p.theme === "jinwoo" ? "/assets/jinwoo-default.svg" : "/assets/chahaein-default.svg")}
                        alt=""
                        fill
                        sizes="24px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <span className="flex-1 truncate text-fg">{l.summary || <span className="italic text-fg-muted">no summary</span>}</span>
                  <span className="font-mono text-xs text-fg-muted">{format(parseISO(l.started_at), "MMM d, HH:mm")}</span>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest",
                    l.source === "timer" ? "bg-accent/15 text-accent" : "bg-bg-card text-fg-muted",
                  )}>
                    {l.minutes}m
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {canWrite && <ManualEntryDialog open={open} onOpenChange={setOpen} projectId={projectId} />}
    </div>
  );
}

function ManualEntryDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (v: boolean) => void; projectId: string }) {
  const [minutes, setMinutes] = useState(30);
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await addManualTimeLog({ project_id: projectId, minutes, summary, date });
        setSummary("");
        onOpenChange(false);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Log time manually</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tmin">Minutes</Label>
              <Input id="tmin" type="number" min={1} required value={minutes} onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="tdate">Date</Label>
              <Input id="tdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label htmlFor="tsum">Summary (optional)</Label>
            <Input id="tsum" value={summary} onChange={(e) => setSummary(e.target.value)} className="mt-1.5" placeholder="What did you do?" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}><Clock className="mr-1 h-3.5 w-3.5" /> Add</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
