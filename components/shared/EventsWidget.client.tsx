"use client";

import { useState, useTransition } from "react";
import { Calendar, MapPin, Plus, Trash2 } from "lucide-react";
import { format, parseISO, differenceInCalendarDays, isToday } from "date-fns";
import { createEvent, deleteEvent } from "@/lib/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { EventRow } from "@/lib/supabase/database.types";

export function EventsWidgetClient({ initial }: { initial: EventRow[] }) {
  const [events, setEvents] = useState(initial);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function remove(e: EventRow) {
    if (!confirm("Remove this event?")) return;
    setEvents((cur) => cur.filter((x) => x.id !== e.id));
    startTransition(() => deleteEvent(e.id));
  }

  return (
    <div className="surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Calendar</p>
          <h3 className="font-display text-lg font-semibold text-fg">Upcoming</h3>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Event
        </Button>
      </div>

      {events.length === 0 ? (
        <p className="rounded-md border border-dashed border-glow/25 bg-bg-card/30 px-4 py-6 text-center text-sm text-fg-muted">
          Nothing scheduled. Add what's coming up.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => {
            const dt = parseISO(e.datetime);
            const days = differenceInCalendarDays(dt, new Date());
            const isPast = dt < new Date() && !isToday(dt);
            return (
              <li key={e.id} className={cn("group rounded-md border border-glow/15 bg-bg-elevated/30 p-3", isPast && "opacity-60")}>
                <div className="flex items-start gap-3">
                  <div className={cn("flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md border", isToday(dt) ? "border-accent/60 bg-accent/15 text-accent" : "border-glow/20 bg-bg-base/40 text-fg")}>
                    <span className="font-mono text-[10px] uppercase tracking-widest">{format(dt, "MMM")}</span>
                    <span className="font-display text-lg font-semibold leading-none">{format(dt, "d")}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-fg">{e.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-fg-muted">
                      <span><Calendar className="inline h-3 w-3 mr-0.5" />{format(dt, "EEE, h:mm a")}</span>
                      {days === 0 ? <span className="text-accent">Today</span>
                        : days > 0 ? <span>in {days}d</span>
                        : <span>{-days}d ago</span>}
                      {e.location && <span><MapPin className="inline h-3 w-3 mr-0.5" />{e.location}</span>}
                    </div>
                    {e.notes && <p className="mt-1 text-xs text-fg-muted line-clamp-2">{e.notes}</p>}
                  </div>
                  <button onClick={() => remove(e)} className="opacity-0 group-hover:opacity-100 text-fg-muted hover:text-red-400" aria-label="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AddEventDialog open={open} onOpenChange={setOpen} onAdded={(e) => setEvents((cur) => [...cur, e].sort((a, b) => a.datetime.localeCompare(b.datetime)))} />
    </div>
  );
}

function AddEventDialog({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (v: boolean) => void; onAdded: (e: EventRow) => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!date) { setError("Pick a date"); return; }
    const datetime = new Date(`${date}T${time || "12:00"}:00`).toISOString();
    startTransition(async () => {
      try {
        await createEvent({ title, datetime, location, notes });
        // optimistic-ish push: caller will refetch on revalidation; meanwhile add tmp
        onAdded({
          id: `tmp-${Math.random()}`,
          couple_id: "",
          title: title.trim(),
          datetime,
          location: location.trim() || null,
          notes: notes.trim() || null,
          created_by: null,
          created_at: new Date().toISOString(),
        });
        setTitle(""); setDate(""); setTime(""); setLocation(""); setNotes("");
        onOpenChange(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="etitle">Title</Label>
            <Input id="etitle" required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edate">Date</Label>
              <Input id="edate" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="etime">Time</Label>
              <Input id="etime" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label htmlFor="eloc">Location</Label>
            <Input id="eloc" value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="enotes">Notes</Label>
            <Textarea id="enotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1.5" />
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
