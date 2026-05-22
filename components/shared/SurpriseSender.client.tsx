"use client";

import { useState, useTransition } from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { Gift, Plus, Trash2, Clock, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Surprise } from "@/lib/supabase/database.types";

export function SurpriseSenderClient({
  initial,
  partnerId,
  partnerName,
}: {
  initial: Surprise[];
  partnerId: string;
  partnerName: string;
}) {
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const pending = items.filter((i) => !i.delivered);
  const delivered = items.filter((i) => i.delivered);

  function remove(s: Surprise) {
    if (!confirm("Cancel this surprise?")) return;
    setItems((cur) => cur.filter((x) => x.id !== s.id));
    startTransition(async () => {
      const supabase = createClient();
      await supabase.from("surprises").delete().eq("id", s.id);
    });
  }

  return (
    <div className="surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Time-locked</p>
          <h3 className="font-display text-lg font-semibold text-fg">Surprises for {partnerName}</h3>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Schedule
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-glow/25 bg-bg-card/30 px-4 py-6 text-center text-sm text-fg-muted">
          Schedule a note or photo to deliver to {partnerName} at a future moment. They won't see it until then.
        </p>
      ) : (
        <div className="space-y-3">
          {pending.length > 0 && (
            <ul className="space-y-2">
              {pending.map((s) => {
                const days = differenceInCalendarDays(parseISO(s.deliver_at), new Date());
                return (
                  <li key={s.id} className="group rounded-md border border-accent/30 bg-accent/5 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 text-fg">
                          <Clock className="h-3.5 w-3.5 text-accent" />
                          {s.content ?? <span className="italic text-fg-muted">(photo)</span>}
                        </div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-fg-muted">
                          Delivers {format(parseISO(s.deliver_at), "MMM d, h:mm a")} · {days >= 0 ? `in ${days}d` : "overdue"}
                        </div>
                      </div>
                      <button onClick={() => remove(s)} className="opacity-0 transition-opacity group-hover:opacity-100 text-fg-muted hover:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {delivered.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-xs uppercase tracking-widest text-fg-muted hover:text-fg">Delivered ({delivered.length})</summary>
              <ul className="mt-2 space-y-1.5">
                {delivered.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-xs text-fg-muted">
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="truncate">{s.content ?? "(photo)"}</span>
                    <span className="ml-auto font-mono">{format(parseISO(s.deliver_at), "MMM d")}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <ScheduleDialog
        open={open}
        onOpenChange={setOpen}
        partnerId={partnerId}
        onAdded={(s) => setItems((cur) => [...cur, s].sort((a, b) => a.deliver_at.localeCompare(b.deliver_at)))}
      />
    </div>
  );
}

function ScheduleDialog({
  open,
  onOpenChange,
  partnerId,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partnerId: string;
  onAdded: (s: Surprise) => void;
}) {
  const [content, setContent] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!date) { setError("Pick a delivery date"); return; }
    const deliverAt = new Date(`${date}T${time}:00`);
    if (deliverAt <= new Date()) { setError("Delivery time must be in the future"); return; }
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Session lost");
        const { data, error } = await supabase
          .from("surprises")
          .insert({
            from_user_id: user.id,
            to_user_id: partnerId,
            content: content.trim() || null,
            deliver_at: deliverAt.toISOString(),
          })
          .select()
          .single();
        if (error) throw new Error(error.message);
        onAdded(data as Surprise);
        setContent(""); setDate(""); setTime("09:00");
        onOpenChange(false);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle><Gift className="inline h-4 w-4 mr-1" /> Schedule a surprise</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <p className="text-[11px] text-fg-muted">RLS hides this from the recipient until the delivery time.</p>
          <div>
            <Label htmlFor="scontent">Note</Label>
            <Textarea id="scontent" required value={content} onChange={(e) => setContent(e.target.value)} rows={3} className="mt-1.5" placeholder="The note they'll receive." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sdate">Date</Label>
              <Input id="sdate" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="stime">Time</Label>
              <Input id="stime" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || !content.trim() || !date}><Clock className="mr-1 h-3.5 w-3.5" /> {pending ? "Scheduling..." : "Schedule"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
