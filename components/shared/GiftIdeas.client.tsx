"use client";

import { useState, useTransition } from "react";
import { Gift, Plus, Trash2, ExternalLink, Lock, Check, Package, Smile } from "lucide-react";
import { createGiftIdea, updateGiftIdeaStatus, deleteGiftIdea } from "@/lib/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { GiftIdea } from "@/lib/supabase/database.types";

const STATUS_META: Record<GiftIdea["status"], { icon: typeof Gift; label: string; cls: string }> = {
  idea:      { icon: Gift,    label: "Idea",      cls: "text-fg" },
  bought:    { icon: Package, label: "Bought",    cls: "text-amber-400" },
  given:     { icon: Check,   label: "Given",     cls: "text-emerald-400" },
  dismissed: { icon: Smile,   label: "Dismissed", cls: "text-fg-muted line-through" },
};

export function GiftIdeasClient({ initial, partnerId, partnerName }: { initial: GiftIdea[]; partnerId: string; partnerName: string }) {
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function setStatus(it: GiftIdea, status: GiftIdea["status"]) {
    setItems((cur) => cur.map((x) => (x.id === it.id ? { ...x, status } : x)));
    startTransition(() => updateGiftIdeaStatus(it.id, status));
  }
  function remove(it: GiftIdea) {
    if (!confirm("Delete this idea?")) return;
    setItems((cur) => cur.filter((x) => x.id !== it.id));
    startTransition(() => deleteGiftIdea(it.id));
  }

  return (
    <div className="surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent flex items-center gap-1">
            <Lock className="h-3 w-3" /> Only you can see this
          </p>
          <h3 className="font-display text-lg font-semibold text-fg">Gift ideas for {partnerName}</h3>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-glow/25 bg-bg-card/30 px-4 py-6 text-center text-sm text-fg-muted">
          Save ideas as they hit you. They stay invisible to {partnerName} — RLS guaranteed.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => {
            const meta = STATUS_META[it.status];
            const StatusIcon = meta.icon;
            return (
              <li key={it.id} className="group rounded-md border border-glow/15 bg-bg-elevated/30 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <StatusIcon className={cn("h-4 w-4 mt-0.5 shrink-0", meta.cls)} />
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-fg", it.status === "dismissed" && "line-through text-fg-muted")}>{it.idea_text}</div>
                    {it.notes && <p className="text-[11px] text-fg-muted italic">{it.notes}</p>}
                    {it.link_url && (
                      <a href={it.link_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-accent hover:underline">
                        {new URL(it.link_url).hostname.replace(/^www\./, "")} <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <select
                      value={it.status}
                      onChange={(e) => setStatus(it, e.target.value as GiftIdea["status"])}
                      className="rounded-md border border-glow/20 bg-bg-base/50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-fg-muted hover:text-fg"
                    >
                      <option value="idea">idea</option>
                      <option value="bought">bought</option>
                      <option value="given">given</option>
                      <option value="dismissed">dismissed</option>
                    </select>
                    <button onClick={() => remove(it)} className="rounded p-1 text-fg-muted hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AddDialog
        open={open}
        onOpenChange={setOpen}
        partnerId={partnerId}
        onAdded={(g) => setItems((cur) => [g, ...cur])}
      />
    </div>
  );
}

function AddDialog({
  open,
  onOpenChange,
  partnerId,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partnerId: string;
  onAdded: (g: GiftIdea) => void;
}) {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createGiftIdea({ for_user_id: partnerId, idea_text: text, link_url: url, notes });
        onAdded({
          id: `tmp-${Math.random()}`, for_user_id: partnerId, by_user_id: "",
          idea_text: text.trim(), link_url: url.trim() || null,
          status: "idea", notes: notes.trim() || null,
          created_at: new Date().toISOString(),
        });
        setText(""); setUrl(""); setNotes("");
        onOpenChange(false);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New gift idea</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <p className="text-[11px] text-fg-muted flex items-center gap-1">
            <Lock className="h-3 w-3" /> This stays private — RLS hides it from the recipient.
          </p>
          <div>
            <Label htmlFor="gtext">Idea</Label>
            <Textarea id="gtext" required value={text} onChange={(e) => setText(e.target.value)} rows={2} className="mt-1.5" placeholder="e.g. That blue raincoat she liked on the Bali trip" />
          </div>
          <div>
            <Label htmlFor="gurl">Link (optional)</Label>
            <Input id="gurl" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="gnotes">Notes (optional)</Label>
            <Textarea id="gnotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1.5" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || !text.trim()}>{pending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
