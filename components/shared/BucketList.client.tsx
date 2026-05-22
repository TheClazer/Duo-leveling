"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, ChevronRight, Sparkles } from "lucide-react";
import { createBucketItem, updateBucketStatus, deleteBucketItem } from "@/lib/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { BucketItem } from "@/lib/supabase/database.types";

const COLUMNS: { key: BucketItem["status"]; label: string; subtitle: string }[] = [
  { key: "dream",    label: "Dreams",   subtitle: "Someday." },
  { key: "planning", label: "Planning", subtitle: "On the radar." },
  { key: "done",     label: "Done",     subtitle: "Memories made." },
];

export function BucketListClient({ initial }: { initial: BucketItem[] }) {
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function move(it: BucketItem, status: BucketItem["status"]) {
    setItems((cur) => cur.map((x) => (x.id === it.id ? { ...x, status, completed_at: status === "done" ? new Date().toISOString() : null } : x)));
    startTransition(() => updateBucketStatus(it.id, status));
  }
  function remove(it: BucketItem) {
    if (!confirm("Delete this bucket item?")) return;
    setItems((cur) => cur.filter((x) => x.id !== it.id));
    startTransition(() => deleteBucketItem(it.id));
  }
  function nextStatus(s: BucketItem["status"]): BucketItem["status"] | null {
    if (s === "dream") return "planning";
    if (s === "planning") return "done";
    return null;
  }

  return (
    <div className="surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Together</p>
          <h3 className="font-display text-lg font-semibold text-fg">Bucket List</h3>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const colItems = items.filter((i) => i.status === col.key);
          return (
            <div key={col.key} className="rounded-md border border-glow/15 bg-bg-elevated/20 p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <p className="font-mono text-[10px] uppercase tracking-widest text-fg-muted">{col.label}</p>
                <span className="font-mono text-[10px] text-fg-muted">{colItems.length}</span>
              </div>
              {colItems.length === 0 ? (
                <p className="text-[11px] italic text-fg-muted">{col.subtitle}</p>
              ) : (
                <ul className="space-y-1.5">
                  {colItems.map((it) => {
                    const next = nextStatus(it.status);
                    return (
                      <li key={it.id} className="group rounded-md border border-glow/10 bg-bg-base/30 p-2 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className={cn("font-medium", it.status === "done" ? "text-fg-muted line-through" : "text-fg")}>{it.title}</div>
                            {it.description && <p className="text-[11px] text-fg-muted line-clamp-2">{it.description}</p>}
                          </div>
                          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {next && (
                              <button onClick={() => move(it, next)} title={`Move to ${next}`} className="rounded p-1 text-fg-muted hover:text-accent">
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button onClick={() => remove(it)} title="Delete" className="rounded p-1 text-fg-muted hover:text-red-400">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <AddDialog open={open} onOpenChange={setOpen} onAdded={(b) => setItems((cur) => [b, ...cur])} />
    </div>
  );
}

function AddDialog({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (v: boolean) => void; onAdded: (b: BucketItem) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createBucketItem({ title, description, category });
        onAdded({
          id: `tmp-${Math.random()}`, couple_id: "", title: title.trim(),
          description: description.trim() || null, category: category.trim() || null,
          status: "dream", photo_url: null, completed_at: null,
          created_at: new Date().toISOString(),
        });
        setTitle(""); setDescription(""); setCategory("");
        onOpenChange(false);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle><Sparkles className="inline h-4 w-4 mr-1" /> New bucket item</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="btitle">Title</Label>
            <Input id="btitle" required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" placeholder="e.g. Trek to Hampta Pass" />
          </div>
          <div>
            <Label htmlFor="bdesc">Description</Label>
            <Textarea id="bdesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="bcat">Category</Label>
            <Input id="bcat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="travel, food, milestone..." className="mt-1.5" />
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
