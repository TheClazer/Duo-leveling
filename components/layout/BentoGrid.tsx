"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { Layout, Layouts } from "react-grid-layout";
import { createClient } from "@/lib/supabase/client";
import type { LayoutItem } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

// react-grid-layout (~40 kB) only powers the desktop drag/resize grid; mobile
// uses a plain stack. Load it lazily so mobile + first paint don't pay for it.
const BentoGridDesktop = dynamic(() => import("./BentoGridDesktop"), { ssr: false });

export type BentoItem = {
  id: string;
  defaultLayout: { x: number; y: number; w: number; h: number; minW?: number; minH?: number };
  children: ReactNode;
};

export function BentoGrid({
  items,
  initialLayout,
  readOnly = false,
}: {
  items: BentoItem[];
  initialLayout: LayoutItem[];
  readOnly?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [layout, setLayout] = useState<Layout[]>(() => mergeLayouts(items, initialLayout));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const layouts: Layouts = useMemo(() => ({ lg: layout, md: layout, sm: layout }), [layout]);

  // Mobile order: build a y-index map once and stable-sort by it. Avoids
  // O(n²) layout.find() calls inside an O(n log n) sort comparator on every
  // render.
  const mobileOrder = useMemo(() => {
    const yByItem = new Map(layout.map((l) => [l.i, l.y]));
    return [...items].sort(
      (a, b) => (yByItem.get(a.id) ?? 0) - (yByItem.get(b.id) ?? 0),
    );
  }, [items, layout]);

  function onLayoutChange(newLayout: Layout[]) {
    setLayout(newLayout);
    if (readOnly) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const stripped: LayoutItem[] = newLayout.map((l) => ({
        i: l.i, x: l.x, y: l.y, w: l.w, h: l.h, minW: l.minW, minH: l.minH,
      }));
      await supabase
        .from("dashboard_layouts")
        .upsert({ user_id: user.id, layout: stripped, updated_at: new Date().toISOString() });
    }, 600);
  }

  return (
    <>
      {/* Mobile: vertical stack in y-order */}
      <div className="md:hidden space-y-4">
        {mobileOrder.map((it) => (
          <div key={it.id}>{it.children}</div>
        ))}
      </div>

      {/* Desktop: draggable bento. Hidden until mounted to avoid SSR width=0 flash. */}
      <div className={cn("hidden md:block transition-opacity", !mounted && "opacity-0")}>
        {mounted && (
          <BentoGridDesktop
            items={items}
            layouts={layouts}
            readOnly={readOnly}
            onLayoutChange={onLayoutChange}
          />
        )}
      </div>
    </>
  );
}

function mergeLayouts(items: BentoItem[], stored: LayoutItem[]): Layout[] {
  return items.map((it) => {
    const found = stored.find((l) => l.i === it.id);
    return {
      i: it.id,
      x: found?.x ?? it.defaultLayout.x,
      y: found?.y ?? it.defaultLayout.y,
      w: found?.w ?? it.defaultLayout.w,
      h: found?.h ?? it.defaultLayout.h,
      minW: it.defaultLayout.minW,
      minH: it.defaultLayout.minH,
    };
  });
}
