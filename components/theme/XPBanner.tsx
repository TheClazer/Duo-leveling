"use client";

/**
 * XPBanner — global listener for system:xp-gain events. Renders a stack of
 * floating "+XP" Solo-Leveling-style notifications in the top-right corner
 * (top-center on mobile). Each banner auto-dismisses after 1.6s.
 *
 * Mount once near the root of the (app) layout. Anywhere in client code can
 * fire notifyXP("habit_check_in") and it'll surface here without explicit
 * wiring — uses a window CustomEvent bus so it works across the component tree.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { onXPGain, xpSourceLabel, type XPGainEvent } from "@/lib/system-fx";

type Banner = XPGainEvent & { id: number };
let __id = 0;
// How long a banner stays before fading out.
const TTL_MS = 1600;
// Cap stack so a flurry of taps doesn't crowd the screen.
const MAX_STACK = 4;

export function XPBanner() {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    const off = onXPGain((evt) => {
      const id = ++__id;
      setBanners((cur) => {
        const next = [...cur, { ...evt, id }];
        return next.length > MAX_STACK ? next.slice(-MAX_STACK) : next;
      });
      const timer = setTimeout(() => {
        setBanners((cur) => cur.filter((b) => b.id !== id));
      }, TTL_MS);
      return () => clearTimeout(timer);
    });
    return off;
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4 md:left-auto md:right-4 md:items-end md:px-0"
    >
      <AnimatePresence>
        {banners.map((b) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, x: 32, y: -4, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 16, scale: 0.95, transition: { duration: 0.18 } }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="system-window flex items-center gap-3 rounded-md px-4 py-2 shadow-[0_0_28px_rgb(var(--accent-primary)/0.35)]"
          >
            <Sparkles className="h-4 w-4 text-accent" aria-hidden />
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-lg font-semibold leading-none text-accent">
                +{b.amount} XP
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-fg-muted">
                {xpSourceLabel(b.source)}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
