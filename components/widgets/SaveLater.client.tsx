"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Bookmark, BookOpen, Film, Hammer, Lightbulb, Plus, CheckCircle2, ExternalLink, Trash2, Archive, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
    setItems((cur) => cur.map((x) => (x.id === it.id ? { ...x, status, completed_at } : x)));
    startTransition(async () => {
      const supabase = createClient();
      await supabase.from("save_later").update({ status, completed_at }).eq("id", it.id);
    });
  }

  function remove(it: SaveLater) {
    if (readOnly) return;
    setItems((cur) => cur.filter((x) => x.id !== it.id));
    startTransition(async () => {
      const supabase = createClient();
      await supabase.from("save_later").delete().eq("id", it.id);
    });
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
                <div className="mt-0.5 truncate text-[11px] text-fg-muted">{hostname(it.url)} · {it.bucket}</div>
              </a>
              {!readOnly && (
                <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
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
