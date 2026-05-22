"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Users, FolderKanban, Heart, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/you", label: "You", icon: User },
  { href: "/them", label: "Them", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/shared", label: "Shared", icon: Heart },
  { href: "/feed", label: "Feed", icon: Newspaper },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-glow/20 bg-bg-base/85 backdrop-blur-md md:hidden">
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          return (
            <li key={n.href} className="flex-1">
              <Link
                href={n.href}
                prefetch={true}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors",
                  active ? "text-accent" : "text-fg-muted",
                )}
              >
                <Icon className="h-5 w-5" />
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
