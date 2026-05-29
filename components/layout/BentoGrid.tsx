"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { Layout, Layouts } from "react-grid-layout";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  initialMobileOrder,
  readOnly = false,
}: {
  items: BentoItem[];
  initialLayout: LayoutItem[];
  initialMobileOrder?: string[] | null;
  readOnly?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [layout, setLayout] = useState<Layout[]>(() => mergeLayouts(items, initialLayout));
  const [mobileIds, setMobileIds] = useState<string[]>(() => orderedIds(items, initialMobileOrder, initialLayout));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Long-press (250ms) to start a drag so normal taps + page scroll aren't hijacked.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 6 } }));

  const layouts: Layouts = useMemo(() => ({ lg: layout, md: layout, sm: layout }), [layout]);

  const byId = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);
  const mobileItems = useMemo(
    () => mobileIds.map((id) => byId.get(id)).filter((x): x is BentoItem => !!x),
    [mobileIds, byId],
  );

  function onMobileDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = mobileIds.indexOf(String(active.id));
    const newIndex = mobileIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(mobileIds, oldIndex, newIndex);
    setMobileIds(next);
    if (readOnly) return;
    if (mobileTimer.current) clearTimeout(mobileTimer.current);
    mobileTimer.current = setTimeout(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Keep the desktop layout intact; just record the mobile order.
      const stripped: LayoutItem[] = layout.map((l) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h, minW: l.minW, minH: l.minH }));
      await supabase
        .from("dashboard_layouts")
        .upsert({ user_id: user.id, layout: stripped, mobile_order: next, updated_at: new Date().toISOString() });
    }, 600);
  }

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
      {/* Mobile: vertical stack. Long-press a card to drag-reorder; saved per user. */}
      <div className="md:hidden">
        {readOnly ? (
          <div className="space-y-4">
            {mobileItems.map((it) => (
              <div key={it.id}>{it.children}</div>
            ))}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onMobileDragEnd}>
            <SortableContext items={mobileIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {mobileItems.map((it) => (
                  <SortableCard key={it.id} id={it.id}>{it.children}</SortableCard>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
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

/** Resolve the mobile stack order: saved order first (dropping removed widgets +
 *  appending any new ones), else fall back to the desktop y-order. */
function orderedIds(items: BentoItem[], saved: string[] | null | undefined, layout: LayoutItem[]): string[] {
  const ids = items.map((it) => it.id);
  if (saved && saved.length) {
    const known = saved.filter((id) => ids.includes(id));
    const missing = ids.filter((id) => !known.includes(id));
    return [...known, ...missing];
  }
  const yById = new Map(layout.map((l) => [l.i, l.y]));
  return [...ids].sort((a, b) => (yById.get(a) ?? 0) - (yById.get(b) ?? 0));
}

/** A mobile bento card that can be long-pressed and dragged to reorder. */
function SortableCard({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "relative z-20 opacity-80 shadow-[0_0_28px_rgb(var(--border-glow)/0.45)]")}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
