"use client";

import { useState } from "react";
import { ChevronDown, Plus, Target, CheckCircle2, Circle, Calendar, Trash2 } from "lucide-react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Goal, Milestone } from "@/lib/supabase/database.types";

type Filter = "active" | "completed";

export function GoalsClient({
  initialGoals,
  initialMilestones,
  readOnly,
}: {
  initialGoals: Goal[];
  initialMilestones: Milestone[];
  readOnly: boolean;
}) {
  const [goals, setGoals] = useState(initialGoals);
  const [milestones, setMilestones] = useState(initialMilestones);
  const [filter, setFilter] = useState<Filter>("active");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const filtered = goals.filter((g) =>
    filter === "active" ? !g.completed_at : !!g.completed_at,
  );

  async function toggleMilestone(m: Milestone) {
    if (readOnly) return;
    const supabase = createClient();
    const next = !m.done;
    setMilestones((cur) => cur.map((x) => (x.id === m.id ? { ...x, done: next } : x)));
    const { error } = await supabase.from("milestones").update({ done: next }).eq("id", m.id);
    if (error) setMilestones((cur) => cur.map((x) => (x.id === m.id ? { ...x, done: !next } : x)));
    // recompute progress
    const others = milestones.filter((x) => x.goal_id === m.goal_id && x.id !== m.id);
    const total = others.length + 1;
    const done = others.filter((x) => x.done).length + (next ? 1 : 0);
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    setGoals((cur) => cur.map((g) => (g.id === m.goal_id ? { ...g, progress: pct, completed_at: pct === 100 ? new Date().toISOString() : null } : g)));
    await supabase.from("goals").update({ progress: pct, completed_at: pct === 100 ? new Date().toISOString() : null }).eq("id", m.goal_id);
  }

  async function deleteGoal(id: string) {
    if (readOnly) return;
    if (!confirm("Delete this goal and all its milestones?")) return;
    const supabase = createClient();
    setGoals((cur) => cur.filter((g) => g.id !== id));
    setMilestones((cur) => cur.filter((m) => m.goal_id !== id));
    await supabase.from("goals").delete().eq("id", id);
  }

  function handleAdded(g: Goal, ms: Milestone[]) {
    setGoals((cur) => [g, ...cur]);
    setMilestones((cur) => [...cur, ...ms]);
  }

  return (
    <div className="surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Quests</p>
          <h3 className="text-lg font-semibold text-fg">Goals</h3>
        </div>
        <div className="flex items-center gap-1">
          <FilterPill label="Active" active={filter === "active"} onClick={() => setFilter("active")} />
          <FilterPill label="Done" active={filter === "completed"} onClick={() => setFilter("completed")} />
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="ml-2">
              <Plus className="mr-1 h-4 w-4" /> Goal
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-glow/30 bg-bg-card/40 px-4 py-8 text-center text-sm text-fg-muted">
          {filter === "active" ? (readOnly ? "No active goals." : "Set your first goal. Pick something you'd be proud of.") : "Nothing completed yet."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              milestones={milestones.filter((m) => m.goal_id === g.id)}
              expanded={openId === g.id}
              onToggleExpanded={() => setOpenId(openId === g.id ? null : g.id)}
              onToggleMilestone={toggleMilestone}
              onDelete={() => deleteGoal(g.id)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {!readOnly && <AddGoalDialog open={adding} onOpenChange={setAdding} onAdded={handleAdded} />}
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-2 py-1 text-xs uppercase tracking-wider",
        active ? "bg-accent text-bg-base" : "text-fg-muted hover:text-fg",
      )}
    >
      {label}
    </button>
  );
}

function GoalCard({
  goal,
  milestones,
  expanded,
  onToggleExpanded,
  onToggleMilestone,
  onDelete,
  readOnly,
}: {
  goal: Goal;
  milestones: Milestone[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleMilestone: (m: Milestone) => void;
  onDelete: () => void;
  readOnly: boolean;
}) {
  const days = goal.deadline ? differenceInCalendarDays(parseISO(goal.deadline), new Date()) : null;

  return (
    <div className="surface-strong rounded-lg p-4">
      <button onClick={onToggleExpanded} className="flex w-full items-start justify-between text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" />
            <span className="truncate font-medium text-fg">{goal.title}</span>
            {goal.category && (
              <span className="ml-2 rounded-full border border-glow/30 bg-bg-base/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-fg-muted">
                {goal.category}
              </span>
            )}
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-base/60">
            <div className="h-full rounded-full bg-accent" style={{ width: `${goal.progress}%` }} />
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-fg-muted">
            <span>{goal.progress}%</span>
            {days !== null && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {days >= 0 ? `${days}d left` : `${-days}d overdue`}
              </span>
            )}
            {milestones.length > 0 && <span>{milestones.filter((m) => m.done).length}/{milestones.length} milestones</span>}
          </div>
        </div>
        <ChevronDown className={cn("ml-3 h-4 w-4 shrink-0 text-fg-muted transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-glow/15 pt-3">
          {goal.description && <p className="text-sm text-fg-muted whitespace-pre-wrap">{goal.description}</p>}
          {milestones.length > 0 && (
            <ul className="space-y-1.5">
              {milestones.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => onToggleMilestone(m)}
                    disabled={readOnly}
                    className="flex w-full items-center gap-2 text-left text-sm"
                  >
                    {m.done ? (
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                    ) : (
                      <Circle className="h-4 w-4 text-fg-muted" />
                    )}
                    <span className={cn(m.done ? "text-fg-muted line-through" : "text-fg")}>{m.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!readOnly && (
            <div className="flex justify-end pt-1">
              <Button size="sm" variant="ghost" onClick={onDelete} className="text-fg-muted hover:text-red-400">
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddGoalDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: (g: Goal, ms: Milestone[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [category, setCategory] = useState("");
  const [milestonesInput, setMilestonesInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not signed in"); setSubmitting(false); return; }

    const { data: g, error: gErr } = await supabase
      .from("goals")
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        deadline: deadline || null,
        category: category.trim() || null,
      })
      .select()
      .single();

    if (gErr || !g) { setError(gErr?.message ?? "failed"); setSubmitting(false); return; }

    const titles = milestonesInput
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    let ms: Milestone[] = [];
    if (titles.length > 0) {
      const { data, error: mErr } = await supabase
        .from("milestones")
        .insert(titles.map((t, i) => ({ goal_id: g.id, title: t, order_idx: i })))
        .select();
      if (!mErr && data) ms = data as Milestone[];
    }

    onAdded(g as Goal, ms);
    setTitle(""); setDescription(""); setDeadline(""); setCategory(""); setMilestonesInput("");
    setSubmitting(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New goal</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="gtitle">Title</Label>
            <Input id="gtitle" required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" maxLength={120} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="gcat">Category</Label>
              <Input id="gcat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="learning, fitness..." className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="gdead">Deadline</Label>
              <Input id="gdead" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label htmlFor="gdesc">Description</Label>
            <Textarea id="gdesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="gmil">Milestones (one per line, optional)</Label>
            <Textarea id="gmil" value={milestonesInput} onChange={(e) => setMilestonesInput(e.target.value)} rows={3} placeholder="Draft outline\nFirst chapter\nReview pass" className="mt-1.5" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !title.trim()}>{submitting ? "Adding..." : "Add goal"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
