"use client";

import { useEffect, useState, useTransition } from "react";
import { Play, Square } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { startTimer, stopTimer } from "@/lib/projects/actions";
import { cn } from "@/lib/utils";

export function ProjectTimer({ projectId, userId }: { projectId: string; userId: string }) {
  const [running, setRunning] = useState<{ id: string; started_at: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [pending, startTransition] = useTransition();
  const [stopping, setStopping] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("project_time_logs")
        .select("*")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .is("ended_at", null)
        .maybeSingle();
      const row = data as { id: string; started_at: string } | null;
      if (row) setRunning({ id: row.id, started_at: row.started_at });
    })();
  }, [projectId, userId]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  function elapsed(): string {
    if (!running) return "00:00";
    const ms = now - new Date(running.started_at).getTime();
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function onStart() {
    startTransition(async () => {
      const log = await startTimer(projectId);
      setRunning({ id: log.id, started_at: log.started_at });
    });
  }

  function onStop() {
    if (!running) return;
    setStopping(true);
  }

  function confirmStop() {
    if (!running) return;
    const id = running.id;
    const s = summary.trim();
    setRunning(null);
    setStopping(false);
    setSummary("");
    startTransition(async () => {
      await stopTimer(id, s || undefined);
    });
  }

  if (stopping && running) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-accent/40 bg-bg-elevated/80 px-3 py-1.5 backdrop-blur">
        <input
          autoFocus
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="What got done? (optional)"
          className="w-48 bg-transparent text-sm text-fg placeholder:text-fg-muted focus:outline-none"
          onKeyDown={(e) => { if (e.key === "Enter") confirmStop(); }}
        />
        <button onClick={confirmStop} disabled={pending} className="rounded-md bg-accent px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-bg-base disabled:opacity-50">Save</button>
        <button onClick={() => { setStopping(false); setSummary(""); }} className="font-mono text-[10px] uppercase tracking-widest text-fg-muted hover:text-fg">Cancel</button>
      </div>
    );
  }

  return running ? (
    <button
      onClick={onStop}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-accent/60 bg-accent/15 px-3 py-1.5 font-mono text-xs text-accent transition-all hover:bg-accent/25 disabled:opacity-50",
      )}
    >
      <Square className="h-3.5 w-3.5 fill-current" />
      <span className="tabular-nums">{elapsed()}</span>
      <span className="text-[9px] uppercase tracking-widest">running</span>
    </button>
  ) : (
    <button
      onClick={onStart}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-md border border-glow/30 bg-bg-card/60 px-3 py-1.5 font-mono text-xs text-fg-muted backdrop-blur hover:text-fg disabled:opacity-50"
    >
      <Play className="h-3.5 w-3.5" />
      <span className="uppercase tracking-widest text-[10px]">Start timer</span>
    </button>
  );
}
