"use client";

/**
 * CommandPalette — universal jump bar. Cmd+K (or Ctrl+K on Windows).
 *
 * Built on Radix Dialog primitives so we inherit focus trap + escape + a11y
 * for free, without pulling in cmdk as a dependency. Keyboard model:
 *   ⌘K / Ctrl+K  toggle open
 *   ↑ ↓          move highlight
 *   ↵            invoke
 *   Esc          close
 *
 * Actions are static for v1 — pure navigation + quick-action routes. Extend
 * by adding entries to the ACTIONS array.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Search, ArrowRight, Plus, Link2, BookOpen, Settings as SettingsIcon, User, Users, FolderKanban, Heart, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/system-fx";

type ActionIcon = typeof Search;

type Action = {
  id: string;
  label: string;
  hint?: string;
  icon: ActionIcon;
  group: "Jump" | "Create" | "Quick";
  run: () => void | Promise<void>;
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Global ⌘K / Ctrl+K toggle.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const cmdOrCtrl = e.metaKey || e.ctrlKey;
      if (cmdOrCtrl && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Re-focus + reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      // microtask delay so Radix's focus trap doesn't fight us
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open]);

  const actions: Action[] = useMemo(() => [
    // Jump
    { id: "you",       group: "Jump",   icon: User,         label: "Open: You",       hint: "Your dashboard",   run: () => router.push("/you") },
    { id: "them",      group: "Jump",   icon: Users,        label: "Open: Them",      hint: "Partner dashboard", run: () => router.push("/them") },
    { id: "projects",  group: "Jump",   icon: FolderKanban, label: "Open: Projects",  hint: "All projects",      run: () => router.push("/projects") },
    { id: "shared",    group: "Jump",   icon: Heart,        label: "Open: Shared",    hint: "Shared layer",      run: () => router.push("/shared") },
    { id: "feed",      group: "Jump",   icon: Newspaper,    label: "Open: Feed",      hint: "Realtime feed",     run: () => router.push("/feed") },
    { id: "settings",  group: "Jump",   icon: SettingsIcon, label: "Open: Settings",  hint: "Rank · level · push", run: () => router.push("/settings") },
    // Create
    { id: "new-project", group: "Create", icon: Plus,      label: "New project",    hint: "Create a project",   run: () => router.push("/projects/new") },
    { id: "save-link",   group: "Create", icon: Link2,     label: "Save a link",    hint: "Save Later queue",   run: () => router.push("/save-later/share") },
    // Quick (jump straight to focused widget)
    { id: "journal",   group: "Quick",  icon: BookOpen,     label: "Open journal",    hint: "Log an entry",      run: () => router.push("/you#journal") },
  ], [router]);

  // Filter by query (case-insensitive substring on label OR hint).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) => a.label.toLowerCase().includes(q) || a.hint?.toLowerCase().includes(q),
    );
  }, [actions, query]);

  // Reset highlight whenever the filter narrows
  useEffect(() => { setActiveIdx(0); }, [query]);

  function runAction(a: Action) {
    haptic.tap();
    setOpen(false);
    a.run();
  }

  // Group filtered actions for sectioned rendering.
  const grouped = useMemo(() => {
    const g: Record<Action["group"], Action[]> = { Jump: [], Create: [], Quick: [] };
    for (const a of filtered) g[a.group].push(a);
    return g;
  }, [filtered]);

  // Flat list for keyboard navigation indices.
  const flat = [...grouped.Jump, ...grouped.Create, ...grouped.Quick];

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const a = flat[activeIdx];
      if (a) runAction(a);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-bg-base/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          onKeyDown={onKeyDown}
          className={cn(
            "fixed left-1/2 top-[18%] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-lg",
            "surface-strong shadow-[0_0_60px_rgb(var(--border-glow)/0.35)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Type to search actions, arrow keys to navigate, enter to invoke.
          </DialogPrimitive.Description>

          <div className="flex items-center gap-3 border-b border-glow/20 px-4 py-3">
            <Search className="h-4 w-4 text-fg-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or jump to..."
              className="flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="rounded border border-glow/30 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-fg-muted">
              esc
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-fg-muted">
                No results.
              </p>
            ) : (
              (["Jump", "Create", "Quick"] as const).map((group) => {
                const items = grouped[group];
                if (items.length === 0) return null;
                return (
                  <section key={group} className="mb-1">
                    <div className="px-4 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-fg-muted">
                      {group}
                    </div>
                    <ul>
                      {items.map((a) => {
                        const idx = flat.indexOf(a);
                        const active = idx === activeIdx;
                        const Icon = a.icon;
                        return (
                          <li key={a.id}>
                            <button
                              onClick={() => runAction(a)}
                              onMouseEnter={() => setActiveIdx(idx)}
                              className={cn(
                                "flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors",
                                active ? "bg-bg-card text-fg" : "text-fg-muted hover:text-fg",
                              )}
                            >
                              <Icon className={cn("h-4 w-4", active ? "text-accent" : "text-fg-muted")} aria-hidden />
                              <span className="flex-1">{a.label}</span>
                              {a.hint && (
                                <span className="font-mono text-[10px] uppercase tracking-widest text-fg-muted">
                                  {a.hint}
                                </span>
                              )}
                              {active && <ArrowRight className="h-3.5 w-3.5 text-accent" aria-hidden />}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-glow/15 bg-bg-elevated/40 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-fg-muted">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span className="ml-auto">⌘K to toggle</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
