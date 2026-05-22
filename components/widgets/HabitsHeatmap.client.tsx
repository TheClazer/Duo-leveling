"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Flame, Trophy, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  HABIT_COLORS,
  colorMeta,
  currentStreak,
  entryMap,
  heatmapDates,
  longestStreak,
  recentMax,
  todayIso,
  weeklyHitPct,
} from "@/lib/habits";
import type { Habit, HabitEntry } from "@/lib/supabase/database.types";
import { AddHabitDialog } from "./AddHabitDialog";

type Props = {
  initialHabits: Habit[];
  initialEntries: HabitEntry[];
  readOnly?: boolean;
};

export function HabitsHeatmapClient({ initialHabits, initialEntries, readOnly = false }: Props) {
  const [habits, setHabits] = useState(initialHabits);
  const [entries, setEntries] = useState(initialEntries);
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);

  const today = todayIso();
  const grid = useMemo(() => heatmapDates(), []);

  async function toggleToday(habit: Habit) {
    if (readOnly) return;
    const supabase = createClient();
    const existing = entries.find((e) => e.habit_id === habit.id && e.date === today);

    if (existing) {
      // optimistic delete
      setEntries((cur) => cur.filter((e) => e.id !== existing.id));
      startTransition(async () => {
        const { error } = await supabase.from("habit_entries").delete().eq("id", existing.id);
        if (error) setEntries((cur) => [...cur, existing]);
      });
    } else {
      const optimistic: HabitEntry = {
        id: `opt-${Math.random()}`,
        habit_id: habit.id,
        date: today,
        value: 1,
        created_at: new Date().toISOString(),
      };
      setEntries((cur) => [...cur, optimistic]);
      startTransition(async () => {
        const { data, error } = await supabase
          .from("habit_entries")
          .insert({ habit_id: habit.id, date: today, value: 1 })
          .select()
          .single();
        if (error || !data) {
          setEntries((cur) => cur.filter((e) => e.id !== optimistic.id));
          return;
        }
        setEntries((cur) => cur.map((e) => (e.id === optimistic.id ? (data as HabitEntry) : e)));
      });
    }
  }

  function handleAdded(habit: Habit) {
    setHabits((cur) => [...cur, habit]);
  }

  return (
    <div className="surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Daily Quests</p>
          <h3 className="text-lg font-semibold text-fg">Habits</h3>
        </div>
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Habit
          </Button>
        )}
      </div>

      {habits.length === 0 ? (
        <p className="rounded-md border border-dashed border-glow/30 bg-bg-card/40 px-4 py-8 text-center text-sm text-fg-muted">
          {readOnly ? "No habits yet." : "No habits yet. Every monarch starts with one quest."}
        </p>
      ) : (
        <div className="space-y-5">
          {habits.map((h) => (
            <HabitRow
              key={h.id}
              habit={h}
              entries={entries.filter((e) => e.habit_id === h.id)}
              grid={grid}
              onToggleToday={() => toggleToday(h)}
              today={today}
              disabled={pending || readOnly}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {!readOnly && (
        <AddHabitDialog open={addOpen} onOpenChange={setAddOpen} onAdded={handleAdded} />
      )}
    </div>
  );
}

function HabitRow({
  habit,
  entries,
  grid,
  onToggleToday,
  today,
  disabled,
  readOnly,
}: {
  habit: Habit;
  entries: HabitEntry[];
  grid: string[][];
  onToggleToday: () => void;
  today: string;
  disabled: boolean;
  readOnly: boolean;
}) {
  const meta = colorMeta(habit.color);
  const map = useMemo(() => entryMap(entries), [entries]);
  const max = useMemo(() => recentMax(entries), [entries]);
  const cur = currentStreak(entries);
  const best = longestStreak(entries);
  const weekly = weeklyHitPct(entries, habit.target_per_week);
  const todaysValue = map.get(today) ?? 0;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", meta.bg)} />
          <span className="font-medium text-fg">{habit.name}</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-fg-muted">
          <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-orange-400" />{cur}d</span>
          <span className="flex items-center gap-1"><Trophy className="h-3 w-3 text-amber-400" />{best}d</span>
          <span className="flex items-center gap-1"><Target className="h-3 w-3 text-emerald-400" />{weekly}%</span>
          {!readOnly && (
            <button
              onClick={onToggleToday}
              disabled={disabled}
              className={cn(
                "ml-2 rounded-md border px-2 py-1 text-[10px] uppercase tracking-widest transition-all",
                todaysValue > 0
                  ? `border-transparent ${meta.bg} text-white`
                  : "border-glow/40 text-fg-muted hover:border-glow/70 hover:text-fg",
              )}
            >
              {todaysValue > 0 ? "Done" : "Mark today"}
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-flex gap-[3px]">
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((d) => {
                const v = map.get(d) ?? 0;
                const intensity = v > 0 ? Math.min(1, v / max) : 0;
                const isToday = d === today;
                const isFuture = d > today;
                return (
                  <div
                    key={d}
                    title={`${d}${v ? ` · ${v}` : ""}`}
                    className={cn(
                      "h-[10px] w-[10px] rounded-[2px] transition-all",
                      isFuture
                        ? "bg-bg-card/30"
                        : v === 0
                        ? "bg-bg-elevated/70"
                        : meta.bg,
                      isToday && "ring-2 ring-offset-1 ring-offset-bg-base " + meta.ring,
                    )}
                    style={v > 0 ? { opacity: 0.35 + 0.65 * intensity } : undefined}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
