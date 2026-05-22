"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HABIT_COLORS } from "@/lib/habits";
import { cn } from "@/lib/utils";
import type { Habit } from "@/lib/supabase/database.types";

export function AddHabitDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: (h: Habit) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(HABIT_COLORS[0].key);
  const [target, setTarget] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not signed in"); setSubmitting(false); return; }

    const { data, error } = await supabase
      .from("habits")
      .insert({ user_id: user.id, name: name.trim(), color, target_per_week: target })
      .select()
      .single();

    setSubmitting(false);
    if (error || !data) { setError(error?.message ?? "failed"); return; }
    onAdded(data as Habit);
    setName("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New habit</DialogTitle>
          <DialogDescription>One tap to mark done. Streaks calculate themselves.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="hname">Name</Label>
            <Input id="hname" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Train, Read, LeetCode" className="mt-1.5" maxLength={48} />
          </div>
          <div>
            <Label>Color</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {HABIT_COLORS.map((c) => (
                <button
                  type="button"
                  key={c.key}
                  onClick={() => setColor(c.key)}
                  aria-label={c.key}
                  className={cn(
                    "h-7 w-7 rounded-full transition-all",
                    c.bg,
                    color === c.key ? "ring-2 ring-offset-2 ring-offset-bg-elevated " + c.ring : "opacity-70 hover:opacity-100",
                  )}
                />
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="htarget">Days per week target</Label>
            <Input
              id="htarget"
              type="number"
              min={1}
              max={7}
              value={target}
              onChange={(e) => setTarget(Math.max(1, Math.min(7, Number(e.target.value) || 1)))}
              className="mt-1.5"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button magnetic type="submit" disabled={submitting || !name.trim()}>{submitting ? "Adding..." : "Add habit"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
