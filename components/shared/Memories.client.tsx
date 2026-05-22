"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { format, parseISO, differenceInYears, isSameDay, subYears } from "date-fns";
import { Upload, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createMemory, deleteMemory } from "@/lib/shared/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Memory } from "@/lib/supabase/database.types";

export function MemoriesClient({ initial }: { initial: Memory[] }) {
  const [memories, setMemories] = useState(initial);
  const [open, setOpen] = useState(false);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // "On this day N years ago"
  const onThisDay = memories.filter((m) => {
    const d = parseISO(m.date_of_memory);
    const today = new Date();
    return !isSameDay(d, today) && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  });

  function remove(m: Memory) {
    if (!confirm("Delete this memory?")) return;
    setMemories((cur) => cur.filter((x) => x.id !== m.id));
    startTransition(() => deleteMemory(m.id));
  }

  const lightboxMemory = memories.find((m) => m.id === lightboxId);

  return (
    <div className="surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Together</p>
          <h3 className="font-display text-lg font-semibold text-fg">Memories</h3>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Upload className="mr-1 h-4 w-4" /> Upload
        </Button>
      </div>

      {onThisDay.length > 0 && (
        <div className="mb-4 rounded-md border border-accent/30 bg-accent/5 p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">On this day</p>
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {onThisDay.map((m) => {
              const years = differenceInYears(new Date(), parseISO(m.date_of_memory));
              return (
                <button key={m.id} onClick={() => setLightboxId(m.id)} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-glow/30">
                  <Image src={m.photo_url} alt={m.caption ?? ""} fill className="object-cover" sizes="80px" />
                  <div className="absolute inset-x-0 bottom-0 bg-bg-base/80 px-1 py-0.5 text-center font-mono text-[9px] uppercase tracking-widest text-fg">
                    {years}y ago
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {memories.length === 0 ? (
        <p className="rounded-md border border-dashed border-glow/25 bg-bg-card/30 px-4 py-8 text-center text-sm text-fg-muted">
          No memories yet. Upload the first photo.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {memories.map((m) => (
            <button key={m.id} onClick={() => setLightboxId(m.id)} className="group relative aspect-square overflow-hidden rounded-md">
              <Image src={m.photo_url} alt={m.caption ?? ""} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 640px) 33vw, 25vw" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg-base/90 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="text-[10px] font-mono uppercase tracking-widest text-fg-muted">{format(parseISO(m.date_of_memory), "MMM d, yyyy")}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <AddMemoryDialog open={open} onOpenChange={setOpen} onAdded={(m) => setMemories((cur) => [m, ...cur])} />

      {lightboxMemory && (
        <Lightbox memory={lightboxMemory} onClose={() => setLightboxId(null)} onDelete={() => { remove(lightboxMemory); setLightboxId(null); }} />
      )}
    </div>
  );
}

function Lightbox({ memory, onClose, onDelete }: { memory: Memory; onClose: () => void; onDelete: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/85 p-4 backdrop-blur" onClick={onClose}>
      <div className="relative max-h-[90vh] max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="relative w-full aspect-square sm:aspect-video">
          <Image src={memory.photo_url} alt={memory.caption ?? ""} fill className="object-contain" sizes="(max-width: 768px) 100vw, 768px" />
        </div>
        <div className="mt-3 flex items-start justify-between gap-3 text-sm">
          <div>
            <p className="font-mono text-[11px] text-fg-muted">{format(parseISO(memory.date_of_memory), "EEEE, MMMM d, yyyy")}</p>
            {memory.caption && <p className="mt-1 text-fg">{memory.caption}</p>}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onDelete}><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete</Button>
            <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddMemoryDialog({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (v: boolean) => void; onAdded: (m: Memory) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) { setError("Pick a photo first"); return; }
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Session lost");
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("memories").upload(path, file);
        if (upErr) throw new Error(`Upload failed: ${upErr.message}. (Did you create the 'memories' bucket? See SETUP.md.)`);
        const { data: pub } = supabase.storage.from("memories").getPublicUrl(path);
        await createMemory({ photo_url: pub.publicUrl, caption, date_of_memory: date });
        onAdded({
          id: `tmp-${Math.random()}`, couple_id: "", photo_url: pub.publicUrl,
          caption: caption.trim() || null, date_of_memory: date,
          uploaded_by: user.id, uploaded_at: new Date().toISOString(),
        });
        setFile(null); setPreview(null); setCaption("");
        onOpenChange(false);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New memory</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="mfile">Photo</Label>
            {preview ? (
              <div className="mt-1.5 relative h-40 w-full overflow-hidden rounded-md border border-glow/30 bg-bg-elevated/40">
                <Image src={preview} alt="" fill className="object-contain" />
              </div>
            ) : null}
            <Input id="mfile" type="file" accept="image/*" required onChange={onPick} className="mt-1.5 file:mr-3 file:rounded file:border-0 file:bg-bg-card file:px-3 file:py-1.5 file:text-xs file:text-fg" />
          </div>
          <div>
            <Label htmlFor="mdate">Date of memory</Label>
            <Input id="mdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="mcap">Caption</Label>
            <Input id="mcap" value={caption} onChange={(e) => setCaption(e.target.value)} className="mt-1.5" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || !file}><Upload className="mr-1 h-3.5 w-3.5" /> {pending ? "Uploading..." : "Upload"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
