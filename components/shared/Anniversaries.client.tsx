"use client";

import { useState, useTransition } from "react";
import { addYears, addMonths, differenceInCalendarDays, format, parseISO, isAfter } from "date-fns";
import { Plus, Trash2, Heart, Gift, Calendar as CalIcon, RotateCcw } from "lucide-react";
import { createRecurringDate, deleteRecurringDate } from "@/lib/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { RecurringDate } from "@/lib/supabase/database.types";

const TYPE_ICON = { anniversary: Heart, birthday: Gift, monthly: RotateCcw, custom: CalIcon } as const;

function nextOccurrence(anchor: string, type: RecurringDate["type"]): Date {
  const a = parseISO(anchor);
  const now = new Date();
  if (type === "monthly") {
    // next monthly occurrence using anchor's day-of-month
    let next = new Date(now.getFullYear(), now.getMonth(), a.getDate());
    if (!isAfter(next, now)) next = addMonths(next, 1);
    return next;
  }
  // anniversary / birthday / custom: same month+day each year
  let next = new Date(now.getFullYear(), a.getMonth(), a.getDate());
  if (!isAfter(next, now)) next = addYears(next, 1);
  return next;
}

export function AnniversariesClient({ initial }: { initial: RecurringDate[] }) {
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const enriched = items
    .map((r) => ({ r, next: nextOccurrence(r.anchor_date, r.type) }))
    .sort((a, b) => a.next.getTime() - b.next.getTime());

  function remove(r: RecurringDate) {
    if (!confirm("Delete this date?")) return;
    setItems((cur) => cur.filter((x) => x.id !== r.id));
    startTransition(() => deleteRecurringDate(r.id));
  }

  return (
    <div className="surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Anchors</p>
          <h3 className="font-display text-lg font-semibold text-fg">Recurring dates</h3>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      {enriched.length === 0 ? (
        <p className="rounded-md border border-dashed border-glow/25 bg-bg-card/30 px-4 py-6 text-center text-sm text-fg-muted">
          Anniversaries, birthdays, monthly anchors. Add the ones you'll never want to forget.
        </p>
      ) : (
        <ul className="space-y-2">
          {enriched.map(({ r, next }) => {
            const Icon = TYPE_ICON[r.type];
            const days = differenceInCalendarDays(next, new Date());
            return (
              <li key={r.id} className="group flex items-center gap-3 rounded-md border border-glow/15 bg-bg-elevated/30 p-3">
                <Icon className="h-4 w-4 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-fg">{r.title}</div>
                  <div className="text-[11px] text-fg-muted">{format(next, "EEE, MMM d")} · {r.type}</div>
                </div>
                <div className={cn(
                  "shrink-0 rounded-md border px-2 py-1 text-right font-mono text-[11px]",
                  days <= 7 ? "border-accent/60 bg-accent/10 text-accent" : "border-glow/20 text-fg-muted",
                )}>
                  <div className="font-display text-base font-semibold leading-none">{days}</div>
                  <div className="text-[9px] uppercase tracking-widest">{days === 1 ? "day" : "days"}</div>
                </div>
                <button onClick={() => remove(r)} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-fg-muted hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <AddDialog open={open} onOpenChange={setOpen} onAdded={(r) => setItems((cur) => [...cur, r])} />
    </div>
  );
}

function AddDialog({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (v: boolean) => void; onAdded: (r: RecurringDate) => void }) {
  const [title, setTitle] = useState("");
  const [anchorDate, setAnchorDate] = useState("");
  const [type, setType] = useState<RecurringDate["type"]>("anniversary");
  const [reminder, setReminder] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createRecurringDate({ title, anchor_date: anchorDate, type, reminder_days_before: reminder });
        onAdded({
          id: `tmp-${Math.random()}`, couple_id: "", title: title.trim(),
          anchor_date: anchorDate, type, reminder_days_before: reminder,
          created_at: new Date().toISOString(),
        });
        setTitle(""); setAnchorDate(""); setType("anniversary"); setReminder(1);
        onOpenChange(false);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New anchor date</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="atitle">Title</Label>
            <Input id="atitle" required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" placeholder="e.g. Anniversary, Harshita's birthday" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="atype">Type</Label>
              <select id="atype" value={type} onChange={(e) => setType(e.target.value as RecurringDate["type"])} className="mt-1.5 h-10 w-full rounded-md border border-glow/30 bg-bg-elevated/60 px-3 text-sm text-fg">
                <option value="anniversary">Anniversary (yearly)</option>
                <option value="birthday">Birthday (yearly)</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom (yearly)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="adate">Anchor date</Label>
              <Input id="adate" type="date" required value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label htmlFor="arem">Remind me N days before</Label>
            <Input id="arem" type="number" min={0} max={30} value={reminder} onChange={(e) => setReminder(Number(e.target.value) || 0)} className="mt-1.5" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || !title.trim() || !anchorDate}>{pending ? "Adding..." : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
