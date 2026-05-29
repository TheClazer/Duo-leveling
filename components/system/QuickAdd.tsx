"use client";

/**
 * QuickAdd — the global friction-killer (Bible §10.5). A floating button that's
 * reachable from every page so logging never requires navigating to a widget.
 * One tap → bottom sheet (mobile) / card (desktop) → capture a checklist item,
 * feed post, journal note, or saved link, and persist immediately.
 *
 * Instant feel: haptic on every tap, optimistic close + router.refresh() to pull
 * the new row into the server-rendered widgets. Built on Radix Dialog (same as
 * CommandPalette) for free focus-trap + escape + a11y.
 */

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { Plus, X, MessageSquare, BookOpen, ListChecks, Link2, FolderPlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { haptic, notifyXP } from "@/lib/system-fx";
import { istDateString } from "@/lib/date";

type Mode = "menu" | "post" | "note" | "task" | "link";

const MENU: { mode: Exclude<Mode, "menu">; label: string; hint: string; icon: typeof Plus }[] = [
  { mode: "task", label: "Checklist item", hint: "for today", icon: ListChecks },
  { mode: "post", label: "Post", hint: "to the feed", icon: MessageSquare },
  { mode: "note", label: "Journal note", hint: "markdown ok", icon: BookOpen },
  { mode: "link", label: "Save a link", hint: "read later", icon: Link2 },
];

const PLACEHOLDER: Record<Exclude<Mode, "menu">, string> = {
  post: "What's happening?",
  note: "Write a quick note (markdown ok)...",
  task: "Add a task for today...",
  link: "Paste a URL to save...",
};

export function QuickAdd() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("menu");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  // Reset to the menu each time it opens.
  useEffect(() => {
    if (open) { setMode("menu"); setText(""); setBusy(false); }
  }, [open]);

  async function submit() {
    const value = text.trim();
    if (!value || busy || mode === "menu") return;
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }

    let ok = false;
    if (mode === "post") {
      const { error } = await supabase.from("posts").insert({ user_id: user.id, content: value });
      ok = !error;
      if (ok) notifyXP("post");
    } else if (mode === "note") {
      const { error } = await supabase.from("notes").insert({ user_id: user.id, content: value, date: istDateString(), is_private: false });
      ok = !error;
      if (ok) notifyXP("journal_entry");
    } else if (mode === "task") {
      const { error } = await supabase.from("checklist_items").insert({ user_id: user.id, title: value, date: istDateString(), recurring: "none" });
      ok = !error;
    } else if (mode === "link") {
      let url = value;
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      const { error } = await supabase.from("save_later").insert({ user_id: user.id, url, bucket: "read" });
      ok = !error;
    }

    setBusy(false);
    if (!ok) { haptic.err(); return; }
    haptic.done();
    setOpen(false);
    router.refresh(); // reflect the new row in server-rendered widgets
  }

  const active = MENU.find((m) => m.mode === mode);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          aria-label="Quick add"
          onClick={() => haptic.tap()}
          className={cn(
            "fixed right-4 bottom-20 z-40 md:right-6 md:bottom-6",
            "flex h-14 w-14 items-center justify-center rounded-full",
            "bg-accent text-bg-base shadow-[0_0_28px_rgb(var(--border-glow)/0.6)]",
            "transition-transform hover:scale-105 active:scale-95",
          )}
        >
          <Plus className="h-6 w-6" />
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-bg-base/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 surface-strong shadow-[0_0_60px_rgb(var(--border-glow)/0.35)]",
            "inset-x-0 bottom-0 rounded-t-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
            "md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:pb-5",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        >
          <div className="mb-4 flex items-center justify-between">
            <DialogPrimitive.Title className="font-display text-lg font-semibold text-fg">
              {mode === "menu" ? "Quick add" : active?.label}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close" className="text-fg-muted transition-colors hover:text-fg">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">
            Quickly capture a checklist item, feed post, journal note, or saved link.
          </DialogPrimitive.Description>

          {mode === "menu" ? (
            <div className="grid grid-cols-2 gap-2">
              {MENU.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.mode}
                    onClick={() => { haptic.tap(); setMode(m.mode); }}
                    className="flex items-center gap-3 rounded-lg border border-glow/20 bg-bg-card/40 p-3 text-left transition-colors hover:border-glow/50 hover:bg-bg-card/70"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-accent" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-fg">{m.label}</div>
                      <div className="text-[11px] text-fg-muted">{m.hint}</div>
                    </div>
                  </button>
                );
              })}
              <button
                onClick={() => { haptic.tap(); setOpen(false); router.push("/projects/new"); }}
                className="col-span-2 flex items-center gap-3 rounded-lg border border-glow/20 bg-bg-card/40 p-3 text-left transition-colors hover:border-glow/50 hover:bg-bg-card/70"
              >
                <FolderPlus className="h-5 w-5 shrink-0 text-accent" />
                <div>
                  <div className="text-sm font-medium text-fg">New project</div>
                  <div className="text-[11px] text-fg-muted">full create flow</div>
                </div>
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-3">
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={mode === "task" || mode === "link" ? 2 : 4}
                placeholder={active ? PLACEHOLDER[active.mode] : ""}
                onKeyDown={(e) => {
                  // Enter submits single-line captures; ⌘/Ctrl+Enter submits long-form.
                  if (e.key === "Enter" && ((mode === "task" || mode === "link") ? !e.shiftKey : (e.metaKey || e.ctrlKey))) {
                    e.preventDefault();
                    submit();
                  }
                }}
                className="w-full resize-none rounded-lg border border-glow/30 bg-bg-elevated/60 p-3 text-sm text-fg outline-none placeholder:text-fg-muted focus:border-glow/60"
              />
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => { setMode("menu"); setText(""); }} className="text-xs uppercase tracking-widest text-fg-muted transition-colors hover:text-fg">
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={!text.trim() || busy}
                  className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg-base transition-opacity disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Add
                </button>
              </div>
            </form>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
