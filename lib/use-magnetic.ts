"use client";

/**
 * useMagneticEffect — Linear/Vercel-style cursor pull.
 *
 * When the cursor enters the element and moves around inside it, the
 * element translates toward the cursor by up to `pull` px. Falls back to
 * no-op on touch / coarse pointer / prefers-reduced-motion so it never
 * fires on phones or accessibility setups.
 *
 * Hook style takes an existing ref (instead of returning one) so we can
 * compose it inside forwardRef components like Button without mergeRefs.
 */

import { useEffect, type RefObject } from "react";

export function useMagneticEffect(
  ref: RefObject<HTMLElement | null>,
  opts: { enabled?: boolean; pull?: number } = {},
) {
  const { enabled = true, pull = 4 } = opts;

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const el = ref.current;
    if (!el) return;

    const hasFineHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!hasFineHover || reduced) return;

    let raf = 0;

    function onMove(e: MouseEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Translate proportional to cursor offset, capped to ±pull.
      const tx = ((e.clientX - cx) / (rect.width / 2)) * pull;
      const ty = ((e.clientY - cy) / (rect.height / 2)) * pull;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
      });
    }

    function onLeave() {
      if (!el) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = "";
      });
    }

    // Apply a smooth easing during the pull so motion stays buttery.
    const prev = el.style.transition;
    el.style.transition = "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)";

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);

    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
      if (el) {
        el.style.transform = "";
        el.style.transition = prev;
      }
    };
  }, [enabled, pull, ref]);
}
