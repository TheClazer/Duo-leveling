import Image from "next/image";
import { differenceInDays, parseISO } from "date-fns";
import type { Profile, Couple } from "@/lib/supabase/database.types";
import { Heart } from "lucide-react";

export function CoupleHero({
  me,
  partner,
  couple,
  stats,
}: {
  me: Profile;
  partner: Profile;
  couple: Couple;
  stats: { jointProjects: number; bucketDone: number; memories: number; decisions: number };
}) {
  const days = couple.started_date ? differenceInDays(new Date(), parseISO(couple.started_date)) : null;

  return (
    <section className="relative overflow-hidden rounded-xl border border-glow/20 bg-bg-card/40">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/25 via-transparent to-accent-secondary/20" />
      <div className="relative px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-col items-center gap-5 md:flex-row md:items-end md:justify-center md:gap-6">
          <AvatarLarge profile={me} />
          <div className="flex flex-col items-center text-center md:pb-2">
            <Heart className="h-5 w-5 text-accent animate-pulse" />
            {days !== null && (
              <>
                <span className="mt-2 font-display text-5xl font-semibold tracking-tighter-display text-fg md:text-6xl">{days}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-fg-muted">days together</span>
              </>
            )}
          </div>
          <AvatarLarge profile={partner} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Joint projects" value={stats.jointProjects} />
          <Stat label="Bucket done" value={stats.bucketDone} />
          <Stat label="Memories" value={stats.memories} />
          <Stat label="Decisions" value={stats.decisions} />
        </div>
      </div>
    </section>
  );
}

function AvatarLarge({ profile }: { profile: Profile }) {
  const fallback = profile.theme === "jinwoo" ? "/assets/jinwoo-default.svg" : "/assets/chahaein-default.svg";
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-glow/40 shadow-[0_0_30px_rgb(var(--border-glow)/0.35)] md:h-28 md:w-28">
        <Image src={profile.avatar_url || fallback} alt={profile.display_name} fill className="object-cover" sizes="112px" priority />
      </div>
      <span className="mt-2 font-display text-base font-semibold text-fg">{profile.display_name}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-glow/15 bg-bg-elevated/30 p-2.5 text-center">
      <div className="font-display text-2xl font-semibold text-fg">{value}</div>
      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-fg-muted">{label}</div>
    </div>
  );
}
