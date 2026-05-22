"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { Gavel, Plus, Trash2, Search } from "lucide-react";
import { createDecision, deleteDecision } from "@/lib/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Decision } from "@/lib/supabase/database.types";

export function DecisionsLogClient({ initial }: { initial: Decision[] }) {
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const q = query.trim().toLowerCase();
  const filtered = !q ? items : items.filter((d) =>
    d.decision_text.toLowerCase().includes(q) ||
    (d.context ?? "").toLowerCase().includes(q) ||
    (d.tags ?? []).some((t) => t.toLowerCase().includes(q)),
  );

  function remove(d: Decision) {
    if (!confirm("Delete this decision?")) return;
    setItems((cur) => cur.filter((x) => x.id !== d.id));
    startTransition(() => deleteDecision(d.id));
  }

  return (
    <div className="surface p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">The Council</p>
          <h3 className="font-display text-lg font-semibold text-fg">Decisions</h3>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Log
        </Button>
      </div>

      <div className="mb-3 relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search what we decided about..." className="pl-8" />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-glow/25 bg-bg-card/30 px-4 py-6 text-center text-sm text-fg-muted">
          {items.length === 0 ? "Log shared decisions so future-you doesn't have to remember." : "No matches."}
        </p>
      ) : (
        <ol className="relative ml-3 border-l border-glow/15 pl-5">
          {filtered.map((d) => (
            <li key={d.id} className="group relative mb-4">
              <Gavel className="absolute -left-[26px] top-1 h-3.5 w-3.5 text-accent bg-bg-base rounded-full" />
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-fg">{d.decision_text}</p>
                  {d.context && <p className="mt-0.5 text-xs text-fg-muted italic">{d.context}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-fg-muted">
                    <span>{format(parseISO(d.decided_at), "MMM d, yyyy")}</span>
                    {d.tags && d.tags.length > 0 && d.tags.map((t) => (
                      <span key={t} className="rounded-full border border-glow/20 px-1.5 py-0.5">{t}</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => remove(d)} className="opacity-0 transition-opacity group-hover:opacity-100 text-fg-muted hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <AddDialog open={open} onOpenChange={setOpen} onAdded={(d) => setItems((cur) => [d, ...cur])} />
    </div>
  );
}

function AddDialog({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (v: boolean) => void; onAdded: (d: Decision) => void }) {
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const tagsArr = tags.split(",").map((t) => t.trim()).filter(Boolean);
    startTransition(async () => {
      try {
        await createDecision({ decision_text: text, context, tags: tagsArr });
        onAdded({
          id: `tmp-${Math.random()}`, couple_id: "", decision_text: text.trim(),
          context: context.trim() || null, tags: tagsArr.length > 0 ? tagsArr : null,
          decided_at: new Date().toISOString().slice(0, 10),
          project_id: null, created_by: null, created_at: new Date().toISOString(),
        });
        setText(""); setContext(""); setTags("");
        onOpenChange(false);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Log a decision</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="dtext">Decision</Label>
            <Textarea id="dtext" required value={text} onChange={(e) => setText(e.target.value)} rows={2} className="mt-1.5" placeholder="e.g. We're going to Bali in December instead of Goa." />
          </div>
          <div>
            <Label htmlFor="dctx">Why / context (optional)</Label>
            <Textarea id="dctx" value={context} onChange={(e) => setContext(e.target.value)} rows={2} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="dtags">Tags (comma-separated)</Label>
            <Input id="dtags" value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1.5" placeholder="travel, money, home" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || !text.trim()}>{pending ? "Saving..." : "Log it"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
