"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Responsive, WidthProvider, type Layout, type Layouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { GripVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { LayoutItem } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const ResponsiveGridLayout = WidthProvider(Responsive);

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
        {[...items]
          .sort((a, b) => {
            const la = layout.find((l) => l.i === a.id);
            const lb = layout.find((l) => l.i === b.id);
            return (la?.y ?? 0) - (lb?.y ?? 0);
          })
          .map((it) => (
            <div key={it.id}>{it.children}</div>
          ))}
      </div>

      {/* Desktop: draggable bento. Hidden until mounted to avoid SSR width=0 flash. */}
      <div className={cn("hidden md:block transition-opacity", !mounted && "opacity-0")}>
        {mounted && (
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768 }}
            cols={{ lg: 6, md: 6, sm: 4 }}
            rowHeight={80}
            margin={[16, 16]}
            isDraggable={!readOnly}
            isResizable={!readOnly}
            draggableHandle=".bento-drag"
            onLayoutChange={(l: Layout[]) => onLayoutChange(l)}
            compactType="vertical"
          >
            {items.map((it) => (
              <div key={it.id} className="group relative overflow-hidden">
                {!readOnly && (
                  <div
                    className="bento-drag absolute right-2 top-2 z-10 flex h-7 w-7 cursor-grab items-center justify-center rounded-md bg-bg-elevated/70 text-fg-muted opacity-0 backdrop-blur transition-opacity hover:text-fg group-hover:opacity-100 active:cursor-grabbing"
                    title="Drag to reposition"
                    aria-label="Drag"
                  >
                    <GripVertical className="h-4 w-4" />
                  </div>
                )}
                <div className="h-full overflow-auto">{it.children}</div>
              </div>
            ))}
          </ResponsiveGridLayout>
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
