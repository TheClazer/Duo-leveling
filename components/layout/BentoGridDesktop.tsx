"use client";

import { Responsive, WidthProvider, type Layout, type Layouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

const ResponsiveGridLayout = WidthProvider(Responsive);

export type DesktopItem = { id: string; children: ReactNode };

/** Desktop-only draggable/resizable bento. Lazy-loaded by BentoGrid so the
 *  ~40kB react-grid-layout lib stays out of the mobile + first-paint bundle. */
export default function BentoGridDesktop({
  items,
  layouts,
  readOnly,
  onLayoutChange,
}: {
  items: DesktopItem[];
  layouts: Layouts;
  readOnly: boolean;
  onLayoutChange: (l: Layout[]) => void;
}) {
  return (
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
  );
}
