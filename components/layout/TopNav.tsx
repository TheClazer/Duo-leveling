"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/you", label: "You" },
  { href: "/them", label: "Them" },
  { href: "/projects", label: "Projects" },
  { href: "/shared", label: "Shared" },
  { href: "/feed", label: "Feed" },
  { href: "/settings", label: "Settings" },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 hidden border-b border-glow/20 bg-bg-base/70 backdrop-blur-md md:block">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/you" className="font-mono text-xs uppercase tracking-[0.4em] text-accent">
          The System
        </Link>
        <ul className="flex items-center gap-1">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  prefetch={true}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    active ? "bg-bg-card text-fg" : "text-fg-muted hover:text-fg",
                  )}
                >
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
