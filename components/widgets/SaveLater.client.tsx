"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Bookmark, BookOpen, Film, Hammer, Lightbulb, Plus, CheckCircle2, ExternalLink, Trash2, Archive, RotateCcw, FolderInput, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addResource } from "@/lib/projects/actions";
import { haptic } from "@/lib/system-fx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SaveLater } from "@/lib/supabase/database.types";

type Bucket = SaveLater["bucket"];

const BUCKETS: { key: Bucket; label: string; icon: typeof Bookmark }[] = [
  { key: "read",  label: "Read",  icon: BookOpen },
  { key: "watch", label: "Watch", icon: Film },
  { key: "try",   label: "Try",   icon: Lightbulb },
  { key: "build", label: "Build", icon: Hammer },
  { key: "other", label: "Other", icon: Bookmark },
];

export function SaveLaterClient({ initial, readOnly }: { initial: SaveLater[]; readOnly: boolean }) {
  const [items, setItems] = useState(initial);
  const [tab, setTab] = useState<Bucket | "all">("all");
  const [showDone, setShowDone] = useState(false);
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState<SaveLater | null>(null);
  const [projects, setProjects] = useState<{ id: string; title: string }[] | null>(null);
  const [movedTo, setMovedTo] = useState<Record<string, string>>({});

  const filtered = items.filter((i) => {
    if (tab !== "all" && i.bucket !== tab) return false;
    if (!showDone && i.status !== "pending") return false;
    if (showDone && i.status === "pending") return false;
    return true;
  });

  function add() {
    const u = url.trim();
    if (!u || readOnly) return;
    setError(null);
    startTransition(async () => {
      try {
        new URL(u);
      } catch {
        setError("That doesn't look like a URL");
        return;
      }
      // Fetch OG meta first
      let meta: { title: string | null; description: string | null; image: string | null } = { title: null, description: null, image: null };
      try {
        const r = await fetch(`/api/og-fetch?url=${encodeURIComponent(u)}`);
        if (r.ok) meta = await r.json();
      } catch {}

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Session lost"); return; }

      const bucket = guessBucket(u);
      const { data, error } = await supabase
        .from("save_later")
        .insert({
          user_id: user.id,
          url: u,
          title: meta.title || hostname(u),
          description: meta.description,
          thumbnail_url: meta.image,
          bucket,
        })
        .select()
        .single();
      if (error) { setError(error.message); return; }
      setItems((cur) => [data as SaveLater, ...cur]);
      setUrl("");
    });
  }

  function setStatus(it: SaveLater, status: SaveLater["status"]) {
    if (readOnly) return;
    const completed_at = status === "done" ? new Date().toISOString() : null;
    const prevStatus = it.status;
    setItems((cur) => cur.map((x) => (x.id === it.id ? { ...x, status, completed_at } : x)));
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("save_later").update({ status, completed_at }).eq("id", it.id);
      if (error) setItems((cur) => cur.map((x) => (x.id === it.id ? { ...x, status: prevStatus } : x)));
    });
  }

  function remove(it: SaveLater) {
    if (readOnly) return;
    setItems((cur) => cur.filter((x) => x.id !== it.id));
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("save_later").delete().eq("id", it.id);
      if (error) setItems((cur) => [it, ...cur]); // revert on failure
    });
  }

  async function openMove(it: SaveLater) {
    if (readOnly) return;
    setMoving(it);
    if (projects === null) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setProjects([]); return; }
      const { data } = await supabase
        .from("projects")
        .select("id, title, owner_id, is_shared")
        .order("updated_at", { ascending: false });
      const rows = (data ?? []) as { id: string; title: string; owner_id: string; is_shared: boolean }[];
      // only projects the user can write to (their own or shared)
      setProjects(rows.filter((p) => p.owner_id === user.id || p.is_shared).map((p) => ({ id: p.id, title: p.title })));
    }
  }

  async function moveTo(project: { id: string; title: string }) {
    if (!moving) return;
    const it = moving;
    setMoving(null);
    haptic.done();
    setMovedTo((m) => ({ ...m, [it.id]: project.title }));
    try {
      await addResource({
        project_id: project.id,
        type: "link",
        url: it.url,
        title: it.title ?? undefined,
        description: it.description ?? undefined,
        thumbnail_url: it.thumbnail_url ?? undefined,
        category: "reference",
      });
      const supabase = createClient();
      await supabase.from("save_later").update({ project_id: project.id }).eq("id", it.id);
    } catch {
      setMovedTo((m) => { const n = { ...m }; delete n[it.id]; return n; });
      haptic.err();
    }
  }

  return (
    <div className="surface p-5 flex h-full flex-col">
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Inventory</p>
          <h3 className="font-display text-lg font-semibold text-fg">Save Later</h3>
        </div>
        <button onClick={() => setShowDone((s) => !s)} className="font-mono text-[10px] uppercase tracking-widest text-fg-muted hover:text-fg">
          {showDone ? "Show pending" : "Show done"}
        </button>
      </div>

      {!readOnly && (
        <div className="mb-3 flex gap-2">
          <Input
            placeholder="Paste a URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            disabled={pending}
          />
          <Button onClick={add} disabled={!url.trim() || pending}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      <div className="mb-3 flex flex-wrap gap-1">
        <Pill active={tab === "all"} onClick={() => setTab("all")}>All</Pill>
        {BUCKETS.map((b) => {
          const I = b.icon;
          return (
            <Pill key={b.key} active={tab === b.key} onClick={() => setTab(b.key)}>
              <I className="h-3 w-3" /> {b.label}
            </Pill>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="rounded-md border border-dashed border-glow/25 bg-bg-card/30 px-4 py-8 text-center text-sm text-fg-muted">
            {readOnly ? "Nothing here." : showDone ? "Nothing completed." : "Empty queue. Paste a link to start filling your inventory."}
          </p>
        </div>
      ) : (
        <ul className="flex-1 space-y-2 overflow-y-auto">
          {filtered.map((it) => (
            <li key={it.id} className="group flex gap-3 rounded-md border border-glow/15 bg-bg-elevated/30 p-2.5 transition-all hover:border-glow/40">
              <a href={it.url} target="_blank" rel="noopener noreferrer" className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-bg-base/60">
                {it.thumbnail_url ? (
                  <Image src={it.thumbnail_url} alt="" fill className="object-cover" sizes="64px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-fg-muted">
                    <Bookmark className="h-4 w-4" />
                  </div>
                )}
              </a>
              <a href={it.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-sm font-medium text-fg group-hover:text-accent line-clamp-1">
                  {it.title || it.url}
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60" />
                </div>
                <div className="mt-0.5 truncate text-[11px] text-fg-muted">
                  {hostname(it.url)} · {it.bucket}
                  {(movedTo[it.id] || it.project_id) && (
                    <span className="ml-1 text-accent">· ↗ {movedTo[it.id] ?? "in a project"}</span>
                  )}
                </div>
              </a>
              {!readOnly && (
                <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                  <button onClick={() => openMove(it)} title="Add to a project" aria-label="Add to a project" className="rounded p-1 text-fg-muted hover:text-accent">
                    <FolderInput className="h-4 w-4" />
                  </button>
                  {it.status === "pending" ? (
                    <>
                      <button onClick={() => setStatus(it, "done")} title="Done" aria-label="Mark done" className="rounded p-1 text-fg-muted hover:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => setStatus(it, "archived")} title="Archive" aria-label="Archive" className="rounded p-1 text-fg-muted hover:text-fg">
                        <Archive className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setStatus(it, "pending")} title="Restore" aria-label="Restore" className="rounded p-1 text-fg-muted hover:text-fg">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => remove(it)} title="Delete" aria-label="Delete" className="rounded p-1 text-fg-muted hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <DialogPrimitive.Root open={!!moving} onOpenChange={(o) => !o && setMoving(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-bg-base/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="surface-strong fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 shadow-[0_0_50px_rgb(var(--border-glow)/0.35)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
            <div className="mb-3 flex items-center justify-between">
              <DialogPrimitive.Title className="font-display text-lg font-semibold text-fg">Add to a project</DialogPrimitive.Title>
              <DialogPrimitive.Close aria-label="Close" className="text-fg-muted transition-colors hover:text-fg"><X className="h-5 w-5" /></DialogPrimitive.Close>
            </div>
            <DialogPrimitive.Description className="sr-only">Attach this saved link to a project as a resource.</DialogPrimitive.Description>
            {projects === null ? (
              <p className="py-6 text-center text-sm text-fg-muted">Loading projects…</p>
            ) : projects.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-muted">No projects to add to yet. Create one first.</p>
            ) : (
              <ul className="max-h-72 space-y-1 overflow-y-auto">
                {projects.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => moveTo(p)} className="w-full rounded-lg border border-glow/15 bg-bg-card/40 px-3 py-2.5 text-left text-sm text-fg transition-colors hover:border-glow/50 hover:bg-bg-card/70">
                      {p.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors",
        active ? "bg-accent text-bg-base" : "text-fg-muted hover:bg-bg-card hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function hostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function guessBucket(url: string): Bucket {
  const h = hostname(url).toLowerCase();
  if (/(youtube\.com|youtu\.be|netflix\.com|primevideo|twitch\.tv|vimeo)/.test(h)) return "watch";
  if (/(github\.com|stackoverflow|dev\.to|leetcode)/.test(h)) return "build";
  if (/(medium\.com|substack|nytimes|theverge|hackernews|news\.ycombinator)/.test(h)) return "read";
  if (/(amazon|flipkart|shopify|etsy)/.test(h)) return "try";
  return "read";
}
