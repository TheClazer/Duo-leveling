"use client";

import { useState, useTransition } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { Plus, CheckCircle2, Circle, Trash2, Flag } from "lucide-react";
import { createMilestone, deleteMilestone, toggleMilestone } from "@/lib/projects/actions";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SystemWindow } from "@/components/theme/SystemWindow";
import { haptic, notifyXP } from "@/lib/system-fx";
import type { ProjectMilestone } from "@/lib/supabase/database.types";

export function MilestonesView({
  projectId,
  initialMilestones,
  canWrite,
}: {
  projectId: string;
  initialMilestones: ProjectMilestone[];
  canWrite: boolean;
}) {
  const [milestones, setMilestones] = useState(initialMilestones);
  const [open, setOpen] = useState(false);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onAdded(m: ProjectMilestone) {
    setMilestones((cur) => [...cur, m]);
  }
  function onToggle(m: ProjectMilestone) {
    if (!canWrite) return;
    const next = !m.done;
    setMilestones((cur) => cur.map((x) => (x.id === m.id ? { ...x, done: next, completed_at: next ? new Date().toISOString() : null } : x)));
    if (next) {
      // Completing a milestone is a "wow moment" (Bible §9.7): haptic + XP banner + System Window.
      haptic.done();
      notifyXP("project_milestone_done");
      setCelebrate(m.title);
    }
    startTransition(() => toggleMilestone(m.id, next));
  }
  function onRemove(m: ProjectMilestone) {
    if (!canWrite) return;
    setMilestones((cur) => cur.filter((x) => x.id !== m.id));
    startTransition(() => deleteMilestone(m.id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-fg-muted">Roadmap</p>
          <h2 className="font-display text-2xl font-semibold text-fg">Milestones</h2>
        </div>
        {canWrite && (
          <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Milestone</Button>
        )}
      </div>

      {milestones.length === 0 ? (
        <div className="surface p-10 text-center">
          <Flag className="mx-auto h-6 w-6 text-fg-muted" />
          <p className="mt-3 text-sm text-fg-muted">No milestones yet. Set a few to break the project into phases.</p>
        </div>
      ) : (
        <ol className="relative ml-3 border-l-2 border-glow/15 pl-6">
          {milestones.map((m) => (
            <li key={m.id} className="group relative mb-6">
              <button
                onClick={() => onToggle(m)}
                disabled={!canWrite}
                className={cn(
                  "absolute -left-[34px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
                  m.done ? "border-accent bg-accent text-bg-base" : "border-glow/40 bg-bg-base text-fg-muted hover:border-accent",
                )}
                aria-label={m.done ? "Mark not done" : "Mark done"}
              >
                {m.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
              </button>
              <div className={cn("surface p-4 transition-opacity", m.done && "opacity-60")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className={cn("font-display text-lg font-semibold", m.done ? "text-fg-muted line-through" : "text-fg")}>{m.title}</h3>
                    {m.target_date && (
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-fg-muted">
                        {format(parseISO(m.target_date), "MMM d, yyyy")}
                        {!m.done && (() => {
                          const d = differenceInCalendarDays(parseISO(m.target_date!), new Date());
                          return <span className={cn("ml-2", d < 0 && "text-red-400")}>· {d >= 0 ? `${d}d left` : `${-d}d overdue`}</span>;
                        })()}
                      </p>
                    )}
                  </div>
                  {canWrite && (
                    <ConfirmButton onConfirm={() => onRemove(m)} title="Delete this milestone?" ariaLabel="Delete milestone" className="opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 text-fg-muted hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </ConfirmButton>
                  )}
                </div>
                {m.description && <p className="mt-2 whitespace-pre-wrap text-sm text-fg-muted">{m.description}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}

      {canWrite && <AddMilestoneDialog open={open} onOpenChange={setOpen} projectId={projectId} onAdded={onAdded} />}

      <SystemWindow open={!!celebrate} onClose={() => setCelebrate(null)} title="Milestone reached">
        {celebrate}
      </SystemWindow>
    </div>
  );
}

function AddMilestoneDialog({ open, onOpenChange, projectId, onAdded }: { open: boolean; onOpenChange: (v: boolean) => void; projectId: string; onAdded: (m: ProjectMilestone) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const m = await createMilestone({ project_id: projectId, title, description, target_date: target || null });
        onAdded(m as ProjectMilestone);
        setTitle(""); setDescription(""); setTarget("");
        onOpenChange(false);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New milestone</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="mtitle">Title</Label>
            <Input id="mtitle" required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="mdate">Target date</Label>
            <Input id="mdate" type="date" value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="mdesc">Description</Label>
            <Textarea id="mdesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1.5" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || !title.trim()}>{pending ? "Adding..." : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
