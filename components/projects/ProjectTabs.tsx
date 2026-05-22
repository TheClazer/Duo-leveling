"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { slug: "",           label: "Overview"   },
  { slug: "tasks",      label: "Tasks"      },
  { slug: "milestones", label: "Milestones" },
  { slug: "notes",      label: "Notes"      },
  { slug: "resources",  label: "Resources"  },
  { slug: "time",       label: "Time"       },
  { slug: "updates",    label: "Updates"    },
  { slug: "activity",   label: "Activity"   },
] as const;

export type ProjectTabCounts = {
  tasks: { done: number; total: number };
  milestones: number;
  notes: number;
  resources: number;
  updates: number;
  minutes: number;
};

export function ProjectTabs({ projectId, counts }: { projectId: string; counts: ProjectTabCounts }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  function badgeFor(slug: string): string | null {
    switch (slug) {
      case "tasks":      return counts.tasks.total > 0 ? `${counts.tasks.done}/${counts.tasks.total}` : null;
      case "milestones": return counts.milestones > 0 ? String(counts.milestones) : null;
      case "notes":      return counts.notes > 0 ? String(counts.notes) : null;
      case "resources":  return counts.resources > 0 ? String(counts.resources) : null;
      case "updates":    return counts.updates > 0 ? String(counts.updates) : null;
      case "time":       return counts.minutes >= 60 ? `${Math.round(counts.minutes / 60)}h` : counts.minutes > 0 ? `${counts.minutes}m` : null;
      default: return null;
    }
  }

  return (
    <nav className="mt-6 -mx-4 overflow-x-auto px-4">
      <ul className="flex min-w-max items-center gap-1 border-b border-glow/15">
        {TABS.map((t) => {
          const href = t.slug ? `${base}/${t.slug}` : base;
          const active = t.slug ? pathname.startsWith(href) : pathname === base;
          const badge = badgeFor(t.slug);
          return (
            <li key={t.slug || "overview"}>
              <Link
                href={href}
                className={cn(
                  "relative inline-flex items-center gap-2 px-3 py-2.5 text-sm transition-colors",
                  active ? "text-fg" : "text-fg-muted hover:text-fg",
                )}
              >
                {t.label}
                {badge && (
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 font-mono text-[10px]",
                    active ? "bg-accent/20 text-accent" : "bg-bg-card/60 text-fg-muted",
                  )}>
                    {badge}
                  </span>
                )}
                {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
