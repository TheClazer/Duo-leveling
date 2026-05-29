"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type OwnerFilter = "all" | "mine" | "theirs" | "ours";
export type StatusFilter = "all" | "active" | "idea" | "paused" | "done" | "archived";

export function ProjectsFilterBar({
  owner,
  status,
  category,
  categories,
  hasPartner,
  partnerName,
}: {
  owner: OwnerFilter;
  status: StatusFilter;
  category: string;
  categories: string[];
  hasPartner: boolean;
  partnerName: string | null;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();

  function buildHref(patch: Partial<{ owner: OwnerFilter; status: StatusFilter; category: string }>) {
    const next = new URLSearchParams(sp.toString());
    if (patch.owner !== undefined) {
      if (patch.owner === "all") next.delete("owner");
      else next.set("owner", patch.owner);
    }
    if (patch.status !== undefined) {
      if (patch.status === "all") next.delete("status");
      else next.set("status", patch.status);
    }
    if (patch.category !== undefined) {
      if (patch.category === "all") next.delete("category");
      else next.set("category", patch.category);
    }
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const ownerOpts: { v: OwnerFilter; label: string; show: boolean }[] = [
    { v: "all",    label: "All",                          show: true },
    { v: "mine",   label: "Mine",                         show: true },
    { v: "theirs", label: partnerName ? partnerName + "'s" : "Theirs", show: hasPartner },
    { v: "ours",   label: "Ours",                         show: hasPartner },
  ];

  const statusOpts: { v: StatusFilter; label: string }[] = [
    { v: "all",      label: "All" },
    { v: "active",   label: "Active" },
    { v: "idea",     label: "Idea" },
    { v: "paused",   label: "Paused" },
    { v: "done",     label: "Done" },
    { v: "archived", label: "Archived" },
  ];

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex flex-wrap gap-1">
        {ownerOpts.filter((o) => o.show).map((o) => (
          <Pill key={o.v} href={buildHref({ owner: o.v })} active={owner === o.v}>{o.label}</Pill>
        ))}
      </div>
      <div className="h-4 w-px bg-glow/30" />
      <div className="flex flex-wrap gap-1">
        {statusOpts.map((o) => (
          <Pill key={o.v} href={buildHref({ status: o.v })} active={status === o.v}>{o.label}</Pill>
        ))}
      </div>
      {categories.length > 0 && (
        <>
          <div className="h-4 w-px bg-glow/30" />
          <div className="flex flex-wrap gap-1">
            <Pill href={buildHref({ category: "all" })} active={category === "all"}>All cats</Pill>
            {categories.map((c) => (
              <Pill key={c} href={buildHref({ category: c })} active={category === c}>{c}</Pill>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Pill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors",
        active ? "bg-accent text-bg-base" : "text-fg-muted hover:bg-bg-card hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}
