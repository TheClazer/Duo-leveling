"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { RankBadge } from "./RankBadge";
import type { Profile } from "@/lib/supabase/database.types";

const DEFAULT_AVATAR: Record<string, string> = {
  jinwoo: "/assets/jinwoo-default.svg",
  chahaein: "/assets/chahaein-default.svg",
};

const ROLE_BY_THEME: Record<string, string> = {
  jinwoo: "Shadow Monarch",
  chahaein: "S-Rank Hunter",
};

export function CharacterHero({ profile, readOnly }: { profile: Profile; readOnly?: boolean }) {
  const avatar = profile.avatar_url || DEFAULT_AVATAR[profile.theme];

  return (
    <section className="relative w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/15 via-transparent to-bg-base/80" />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-10 md:grid-cols-2 md:py-16">
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto h-64 w-64 md:h-80 md:w-80"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-accent/40 to-accent-secondary/30 blur-2xl" />
          <div className="surface relative h-full w-full overflow-hidden rounded-full">
            <Image
              src={avatar}
              alt={profile.display_name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 256px, 320px"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          className="flex flex-col justify-center gap-3"
        >
          <div className="flex items-start gap-4">
            <RankBadge level={profile.level} />
            <div className="flex flex-col">
              <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-fg-muted">
                {ROLE_BY_THEME[profile.theme]} · Lv {profile.level}
              </span>
              <h1 className="font-display text-5xl font-semibold leading-[0.95] tracking-tighter-display text-fg md:text-7xl">
                {profile.display_name}
              </h1>
              {profile.tagline && (
                <p className="mt-2 font-display text-lg italic text-fg-muted">"{profile.tagline}"</p>
              )}
            </div>
          </div>

          {profile.about && (
            <details className="mt-2 surface p-4 text-sm text-fg-muted">
              <summary className="cursor-pointer text-xs font-medium uppercase tracking-wider text-fg">
                About
              </summary>
              <p className="mt-3 whitespace-pre-wrap text-fg">{profile.about}</p>
            </details>
          )}

          {readOnly && (
            <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full border border-glow/30 bg-bg-card/60 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-fg-muted">
              read-only · partner view
            </span>
          )}
        </motion.div>
      </div>
    </section>
  );
}
