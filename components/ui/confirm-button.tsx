"use client";

import { useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

/**
 * A trigger button wrapped in a themed confirm dialog — replaces the off-theme
 * native `confirm()` for destructive actions. The trigger inherits `className`
 * so it can look like whatever button it replaces.
 */
export function ConfirmButton({
  children,
  onConfirm,
  title,
  body,
  confirmLabel = "Delete",
  className,
  ariaLabel,
}: {
  children: ReactNode;
  onConfirm: () => void;
  title: string;
  body?: string;
  confirmLabel?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button type="button" aria-label={ariaLabel} className={className}>
          {children}
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-bg-base/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content className="surface-strong fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 shadow-[0_0_50px_rgb(var(--border-glow)/0.35)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0">
          <DialogPrimitive.Title className="font-display text-lg font-semibold text-fg">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-fg-muted">{body}</DialogPrimitive.Description>
          <div className="mt-5 flex justify-end gap-2">
            <DialogPrimitive.Close className="rounded-lg px-4 py-2 text-sm text-fg-muted transition-colors hover:text-fg">
              Cancel
            </DialogPrimitive.Close>
            <button
              type="button"
              onClick={() => { setOpen(false); onConfirm(); }}
              className="rounded-lg bg-red-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
            >
              {confirmLabel}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
