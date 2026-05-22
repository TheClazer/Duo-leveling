"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Link2, FileText, ImageIcon, Code2, Plus, Trash2, ExternalLink, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addResource, deleteResource } from "@/lib/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ProjectResource } from "@/lib/supabase/database.types";

const CATEGORIES = ["reference", "inspiration", "deliverable", "tool"];

const TYPE_ICONS = {
  link:  Link2,
  file:  FileText,
  image: ImageIcon,
  embed: Code2,
} as const;

export function ResourcesView({ projectId, initialResources, canWrite }: { projectId: string; initialResources: ProjectResource[]; canWrite: boolean }) {
  const [resources, setResources] = useState(initialResources);
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const filtered = filter === "all" ? resources : resources.filter((r) => r.category === filter);

  function onAdded(r: ProjectResource) {
    setResources((cur) => [r, ...cur]);
  }
  function onRemove(r: ProjectResource) {
    if (!canWrite) return;
    if (!confirm("Delete this resource?")) return;
    setResources((cur) => cur.filter((x) => x.id !== r.id));
    startTransition(() => deleteResource(r.id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-fg-muted">Vault</p>
          <h2 className="font-display text-2xl font-semibold text-fg">Resources</h2>
        </div>
        {canWrite && <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Resource</Button>}
      </div>

      <div className="flex flex-wrap gap-1">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>{c}</Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="surface p-10 text-center text-sm text-fg-muted">No resources yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => <ResourceCard key={r.id} resource={r} onRemove={() => onRemove(r)} canWrite={canWrite} />)}
        </div>
      )}

      {canWrite && <AddResourceDialog open={open} onOpenChange={setOpen} projectId={projectId} onAdded={onAdded} />}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors",
        active ? "bg-accent text-bg-base" : "text-fg-muted hover:bg-bg-card hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function ResourceCard({ resource, onRemove, canWrite }: { resource: ProjectResource; onRemove: () => void; canWrite: boolean }) {
  const Icon = TYPE_ICONS[resource.type];
  const isExternal = resource.url.startsWith("http");
  const isImage = resource.type === "image" || resource.type === "file" && /\.(png|jpe?g|gif|webp|svg)$/i.test(resource.url);

  return (
    <a
      href={resource.url}
      target={isExternal ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="group relative flex flex-col overflow-hidden rounded-lg border border-glow/15 bg-bg-card/40 backdrop-blur transition-all hover:border-glow/50 hover:shadow-[0_0_20px_rgb(var(--border-glow)/0.2)]"
    >
      <div className="relative h-28 w-full overflow-hidden bg-bg-elevated/50">
        {resource.thumbnail_url || isImage ? (
          <Image src={resource.thumbnail_url || resource.url} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
        ) : (
          <div className="flex h-full items-center justify-center"><Icon className="h-10 w-10 text-fg-muted/50" /></div>
        )}
        {resource.category && (
          <span className="absolute left-2 top-2 rounded-full border border-glow/30 bg-bg-base/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-fg-muted backdrop-blur">
            {resource.category}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-fg line-clamp-2">{resource.title || resource.url}</span>
          {canWrite && (
            <button onClick={(e) => { e.preventDefault(); onRemove(); }} className="opacity-0 group-hover:opacity-100 text-fg-muted hover:text-red-400" aria-label="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {resource.description && <p className="text-xs text-fg-muted line-clamp-2">{resource.description}</p>}
        <p className="mt-1 flex items-center gap-1 truncate font-mono text-[10px] text-fg-muted">
          <Icon className="h-3 w-3" />
          {isExternal ? new URL(resource.url).hostname : resource.url}
          {isExternal && <ExternalLink className="h-3 w-3" />}
        </p>
      </div>
    </a>
  );
}

function AddResourceDialog({ open, onOpenChange, projectId, onAdded }: { open: boolean; onOpenChange: (v: boolean) => void; projectId: string; onAdded: (r: ProjectResource) => void }) {
  const [mode, setMode] = useState<"link" | "file">("link");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        let finalUrl = url;
        let type: "link" | "file" = "link";
        if (mode === "file" && file) {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Session lost");
          const path = `${projectId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const { error: upErr } = await supabase.storage.from("project-resources").upload(path, file);
          if (upErr) throw new Error(`Upload failed: ${upErr.message}. (Did you create the 'project-resources' bucket?)`);
          const { data: pub } = supabase.storage.from("project-resources").getPublicUrl(path);
          finalUrl = pub.publicUrl;
          type = "file";
        }
        const r = await addResource({
          project_id: projectId,
          type,
          url: finalUrl,
          title: title || undefined,
          category: category || undefined,
        });
        onAdded(r as ProjectResource);
        setUrl(""); setTitle(""); setCategory(""); setFile(null);
        onOpenChange(false);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add resource</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="flex gap-2">
            <Chip active={mode === "link"} onClick={() => setMode("link")}>Link</Chip>
            <Chip active={mode === "file"} onClick={() => setMode("file")}>File</Chip>
          </div>
          {mode === "link" ? (
            <div>
              <Label htmlFor="rurl">URL</Label>
              <Input id="rurl" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="mt-1.5" />
            </div>
          ) : (
            <div>
              <Label htmlFor="rfile">File</Label>
              <Input id="rfile" type="file" required onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-1.5 file:mr-3 file:rounded file:border-0 file:bg-bg-card file:px-3 file:py-1.5 file:text-xs file:text-fg" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rtitle">Title</Label>
              <Input id="rtitle" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="rcat">Category</Label>
              <select id="rcat" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-glow/30 bg-bg-elevated/60 px-3 text-sm text-fg">
                <option value="">(none)</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || (mode === "link" ? !url.trim() : !file)}>
              <Upload className="mr-1 h-3.5 w-3.5" /> {pending ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
