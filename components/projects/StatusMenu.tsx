"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { updateProjectStatus } from "@/lib/projects/actions";
import type { ProjectStatus } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const OPTIONS: { v: ProjectStatus; label: string }[] = [
  { v: "active",   label: "Active" },
  { v: "paused",   label: "Paused" },
  { v: "idea",     label: "Idea" },
  { v: "done",     label: "Done" },
  { v: "archived", label: "Archived" },
];

export function StatusMenu({ projectId, current }: { projectId: string; current: ProjectStatus }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function setStatus(v: ProjectStatus) {
    setOpen(false);
    startTransition(async () => {
      await updateProjectStatus(projectId, v);
    });
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md border border-glow/30 bg-bg-card/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-fg-muted backdrop-blur hover:text-fg disabled:opacity-50"
        >
          {pending ? "Updating..." : "Change status"}
          <ChevronDown className="h-3 w-3" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-50 w-44 rounded-md border border-glow/30 bg-bg-elevated/95 p-1 shadow-lg backdrop-blur"
        >
          {OPTIONS.map((o) => (
            <button
              key={o.v}
              onClick={() => setStatus(o.v)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                o.v === current ? "bg-accent/15 text-accent" : "text-fg hover:bg-bg-card",
              )}
            >
              {o.label}
              {o.v === current && <span className="font-mono text-[10px] uppercase tracking-widest text-accent">current</span>}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
