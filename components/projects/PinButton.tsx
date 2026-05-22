"use client";

import { useTransition } from "react";
import { Pin, PinOff } from "lucide-react";
import { togglePinProject } from "@/lib/projects/actions";
import { cn } from "@/lib/utils";

export function PinButton({ projectId, pinned }: { projectId: string; pinned: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => togglePinProject(projectId, !pinned))}
      disabled={pending}
      title={pinned ? "Unpin" : "Pin to dashboard"}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border transition-all disabled:opacity-50",
        pinned
          ? "border-accent/60 bg-accent/15 text-accent"
          : "border-glow/30 bg-bg-card/60 text-fg-muted hover:text-fg",
      )}
    >
      {pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
    </button>
  );
}
