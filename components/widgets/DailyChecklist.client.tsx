"use client";

import { useState } from "react";
import { Plus, CheckCircle2, Circle, Trash2, Repeat } from "lucide-react";
import { format, addDays } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { haptic, notifyXP } from "@/lib/system-fx";
import type { ChecklistItem, Recurring } from "@/lib/supabase/database.types";

const RECUR_LABEL: Record<Recurring, string> = {
  none: "",
  daily: "daily",
  weekdays: "weekdays",
  weekly: "weekly",
  custom: "custom",
};

export function DailyChecklistClient({
  initialItems,
  readOnly,
}: {
  initialItems: ChecklistItem[];
  readOnly: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [input, setInput] = useState("");
  const [recurring, setRecurring] = useState<Recurring>("none");
  const [submitting, setSubmitting] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const dayAfter = format(addDays(new Date(), 2), "yyyy-MM-dd");

  const byDate = (d: string) => items.filter((i) => i.date === d);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || readOnly) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    const { data, error } = await supabase
      .from("checklist_items")
      .insert({ user_id: user.id, title: input.trim(), date: today, recurring })
      .select()
      .single();
    setSubmitting(false);
    if (!error && data) {
      setItems((cur) => [...cur, data as ChecklistItem]);
      setInput("");
      setRecurring("none");
    }
  }

  async function toggle(it: ChecklistItem) {
    if (readOnly) return;
    const next = !it.done;
    // Tiny haptic on both directions; XP only on completion (don't reward un-doing).
    haptic.tap();
    if (next) notifyXP("habit_check_in"); // checklist items share the habit XP source for now
    setItems((cur) => cur.map((x) => (x.id === it.id ? { ...x, done: next, completed_at: next ? new Date().toISOString() : null } : x)));
    const supabase = createClient();
    await supabase
      .from("checklist_items")
      .update({ done: next, completed_at: next ? new Date().toISOString() : null })
      .eq("id", it.id);

    // If recurring and just completed, spawn next occurrence
    if (next && it.recurring !== "none") {
      const nextDate = nextOccurrence(it.date, it.recurring);
      if (nextDate) {
        const { data } = await supabase
          .from("checklist_items")
          .insert({ user_id: it.user_id, title: it.title, date: nextDate, recurring: it.recurring })
          .select()
          .single();
        if (data) setItems((cur) => [...cur, data as ChecklistItem]);
      }
    }
  }

  async function remove(it: ChecklistItem) {
    if (readOnly) return;
    setItems((cur) => cur.filter((x) => x.id !== it.id));
    const supabase = createClient();
    await supabase.from("checklist_items").delete().eq("id", it.id);
  }

  return (
    <div className="surface p-5 flex h-full flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Today's Quests</p>
          <h3 className="text-lg font-semibold text-fg">Checklist</h3>
        </div>
      </div>

      {!readOnly && (
        <form onSubmit={add} className="mb-3 flex gap-2">
          <Input
            placeholder="Add task for today..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={submitting}
          />
          <select
            value={recurring}
            onChange={(e) => setRecurring(e.target.value as Recurring)}
            className="rounded-md border border-glow/30 bg-bg-elevated/60 px-2 text-xs text-fg"
            aria-label="Recurring"
          >
            <option value="none">once</option>
            <option value="daily">daily</option>
            <option value="weekdays">weekdays</option>
            <option value="weekly">weekly</option>
          </select>
          <Button type="submit" size="sm" disabled={!input.trim() || submitting}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto">
      <Section title="Today" items={byDate(today)} onToggle={toggle} onRemove={remove} readOnly={readOnly} highlight />
      {(byDate(tomorrow).length > 0 || byDate(dayAfter).length > 0) && (
        <details className="mt-3 group">
          <summary className="cursor-pointer text-xs uppercase tracking-widest text-fg-muted hover:text-fg">Next 2 days</summary>
          <div className="mt-2 space-y-3">
            <Section title="Tomorrow" items={byDate(tomorrow)} onToggle={toggle} onRemove={remove} readOnly={readOnly} />
            <Section title="Day after" items={byDate(dayAfter)} onToggle={toggle} onRemove={remove} readOnly={readOnly} />
          </div>
        </details>
      )}
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  onToggle,
  onRemove,
  readOnly,
  highlight,
}: {
  title: string;
  items: ChecklistItem[];
  onToggle: (i: ChecklistItem) => void;
  onRemove: (i: ChecklistItem) => void;
  readOnly: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className={cn("text-[11px] uppercase tracking-widest", highlight ? "text-accent" : "text-fg-muted")}>{title}</span>
        {items.length > 0 && <span className="text-[10px] text-fg-muted">{items.filter((i) => i.done).length}/{items.length}</span>}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-fg-muted">Empty.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((it) => (
            <li key={it.id} className="group flex items-center gap-2 rounded-md py-1">
              <button
                onClick={() => onToggle(it)}
                disabled={readOnly}
                aria-label={it.done ? "Mark not done" : "Mark done"}
                className="shrink-0"
              >
                {it.done ? (
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                ) : (
                  <Circle className="h-5 w-5 text-fg-muted hover:text-fg" />
                )}
              </button>
              <span className={cn("flex-1 text-sm", it.done && "text-fg-muted line-through")}>{it.title}</span>
              {it.recurring !== "none" && (
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-fg-muted">
                  <Repeat className="h-3 w-3" />
                  {RECUR_LABEL[it.recurring]}
                </span>
              )}
              {!readOnly && (
                <button onClick={() => onRemove(it)} className="opacity-0 transition-opacity group-hover:opacity-100" aria-label="Delete">
                  <Trash2 className="h-3.5 w-3.5 text-fg-muted hover:text-red-400" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function nextOccurrence(dateStr: string, recurring: Recurring): string | null {
  const d = new Date(dateStr + "T00:00:00");
  switch (recurring) {
    case "daily":
      return format(addDays(d, 1), "yyyy-MM-dd");
    case "weekly":
      return format(addDays(d, 7), "yyyy-MM-dd");
    case "weekdays": {
      let next = addDays(d, 1);
      while (next.getDay() === 0 || next.getDay() === 6) next = addDays(next, 1);
      return format(next, "yyyy-MM-dd");
    }
    default:
      return null;
  }
}
