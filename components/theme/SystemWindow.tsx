"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

export function SystemWindow({
  open,
  onClose,
  title,
  children,
  autoDismissMs = 5000,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  autoDismissMs?: number;
}) {
  useEffect(() => {
    if (!open || !autoDismissMs) return;
    const t = setTimeout(onClose, autoDismissMs);
    return () => clearTimeout(t);
  }, [open, autoDismissMs, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-x-0 top-6 z-50 flex justify-center px-4"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <button
            onClick={onClose}
            className="system-window animate-system-glitch w-full max-w-md rounded-lg p-5 text-left"
          >
            <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              System
            </div>
            <h2 className="font-mono text-base font-semibold text-fg">{title}</h2>
            <div className="mt-2 text-sm text-fg-muted">{children}</div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
