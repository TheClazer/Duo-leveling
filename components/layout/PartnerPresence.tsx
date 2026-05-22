"use client";

/**
 * PartnerPresence — small "● Harshita on /shared" indicator in the TopNav.
 *
 * Uses Supabase Realtime presence channels: each partner joins a channel
 * keyed to their couple_id, broadcasts {name, path}, and listens for the
 * other's state. When the partner is online, a pulsing accent dot appears.
 * Hovering shows their display name and current page.
 *
 * Self-contained — fetches own profile + partner via client supabase, so
 * TopNav doesn't need to receive props. Renders nothing if there's no
 * partner yet, or while the channel is still subscribing.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type PartnerInfo = {
  id: string;
  display_name: string;
  theme: string;
};

type PresenceState = {
  // present = partner currently has the app open
  present: boolean;
  path?: string;
};

export function PartnerPresence() {
  const pathname = usePathname();
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [presence, setPresence] = useState<PresenceState>({ present: false });

  // Fetch own profile + partner once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: me } = await supabase
        .from("profiles")
        .select("couple_id")
        .eq("id", user.id)
        .maybeSingle();
      const coupleId = (me as { couple_id: string | null } | null)?.couple_id;
      if (!coupleId || cancelled) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("id, display_name, theme")
        .eq("couple_id", coupleId)
        .neq("id", user.id)
        .maybeSingle();
      if (!cancelled && p) setPartner(p as PartnerInfo);
    })();
    return () => { cancelled = true; };
  }, []);

  // Subscribe to presence channel. Re-subscribe (or just re-track) when path changes.
  useEffect(() => {
    if (!partner) return;
    let cancelled = false;
    const supabase = createClient();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: me } = await supabase
        .from("profiles")
        .select("couple_id, display_name")
        .eq("id", user.id)
        .maybeSingle();
      const profile = me as { couple_id: string | null; display_name: string } | null;
      if (!profile?.couple_id || cancelled) return;

      channel = supabase.channel(`couple-presence-${profile.couple_id}`, {
        config: { presence: { key: user.id } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          if (cancelled || !channel) return;
          const state = channel.presenceState() as Record<
            string,
            Array<{ path?: string; name?: string }>
          >;
          const partnerEntries = state[partner.id];
          if (partnerEntries && partnerEntries.length > 0) {
            setPresence({ present: true, path: partnerEntries[0].path });
          } else {
            setPresence({ present: false });
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED" && channel && !cancelled) {
            await channel.track({
              path: pathname,
              name: profile.display_name,
            });
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) {
        channel.unsubscribe();
        supabase.removeChannel(channel);
      }
    };
    // We intentionally re-subscribe on pathname change so .track() reflects
    // the new path. Cleanup handles unsubscribing the old channel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner, pathname]);

  if (!partner) return null;

  const partnerHref = pageHref(presence.path);
  const label = presence.present
    ? `${partner.display_name} · ${prettyPath(presence.path)}`
    : `${partner.display_name} · offline`;

  const dot = (
    <span
      className={cn(
        "relative inline-flex h-2 w-2 rounded-full",
        presence.present ? "bg-accent" : "bg-fg-muted/40",
      )}
      aria-hidden
    >
      {presence.present && (
        <span className="absolute inset-0 inline-flex h-full w-full animate-ping rounded-full bg-accent/70" />
      )}
    </span>
  );

  // If partner is on a real page, link to it. Otherwise plain badge.
  const inner = (
    <span className="flex items-center gap-2 rounded-full border border-glow/20 bg-bg-card/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-fg-muted transition-colors hover:text-fg">
      {dot}
      <span className="hidden sm:inline">{partner.display_name}</span>
      <span className="hidden md:inline text-fg/70">
        {presence.present ? prettyPath(presence.path) : "offline"}
      </span>
    </span>
  );

  return (
    <span title={label} aria-label={label}>
      {presence.present && partnerHref ? (
        <Link href={partnerHref}>{inner}</Link>
      ) : (
        inner
      )}
    </span>
  );
}

function prettyPath(p?: string): string {
  if (!p) return "";
  if (p === "/" || p === "/you") return "their dashboard";
  if (p === "/them") return "your dashboard";
  if (p.startsWith("/projects/")) return "a project";
  if (p === "/projects") return "projects";
  if (p === "/shared") return "shared";
  if (p === "/feed") return "feed";
  if (p === "/settings") return "settings";
  return p.replace(/^\//, "");
}

function pageHref(p?: string): string | null {
  if (!p) return null;
  // Don't link to /you (that's THEIR you, not mine). Use /them instead.
  if (p === "/you") return "/them";
  // /them on their side = /you on mine — not useful, skip.
  if (p === "/them") return null;
  // Project pages: both partners can see, link directly.
  if (p.startsWith("/projects/")) return p;
  if (p === "/projects" || p === "/shared" || p === "/feed") return p;
  return null;
}
