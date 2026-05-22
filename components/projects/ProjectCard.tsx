import Link from "next/link";
import Image from "next/image";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Calendar, Pin, Users, User } from "lucide-react";
import type { Project, Profile } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  idea:     { label: "Idea",     cls: "bg-stone-500/20 text-stone-300 border-stone-500/30" },
  active:   { label: "Active",   cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  paused:   { label: "Paused",   cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  done:     { label: "Done",     cls: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
  archived: { label: "Archived", cls: "bg-zinc-600/20 text-zinc-400 border-zinc-600/30" },
};

export function ProjectCard({
  project,
  owner,
  partner,
}: {
  project: Project;
  owner?: Pick<Profile, "id" | "display_name" | "avatar_url" | "theme"> | null;
  partner?: Pick<Profile, "id" | "display_name" | "avatar_url" | "theme"> | null;
}) {
  const days = project.target_date ? differenceInCalendarDays(parseISO(project.target_date), new Date()) : null;
  const status = STATUS_STYLES[project.status] ?? STATUS_STYLES.idea;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-glow/15 bg-bg-card/40 backdrop-blur transition-all hover:border-glow/50 hover:shadow-[0_0_24px_rgb(var(--border-glow)/0.25)]"
    >
      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-accent/30 via-bg-elevated to-accent-secondary/20">
        {project.cover_image_url ? (
          <Image src={project.cover_image_url} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-display text-3xl font-semibold text-fg/30">
            {project.title.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-base/90 via-bg-base/30 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest", status.cls)}>
            {status.label}
          </span>
          {project.is_shared ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-bg-base/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-accent">
              <Users className="h-3 w-3" /> Joint
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-glow/30 bg-bg-base/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-fg-muted">
              <User className="h-3 w-3" /> Solo
            </span>
          )}
        </div>
        {project.pinned && (
          <span className="absolute right-3 top-3 rounded-full bg-bg-base/70 p-1 text-accent">
            <Pin className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg font-semibold leading-tight text-fg line-clamp-2">{project.title}</h3>
        {project.description && (
          <p className="mt-1 text-xs text-fg-muted line-clamp-2">{project.description}</p>
        )}

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated/60">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${project.progress_pct}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 font-mono text-[10px] text-fg-muted">
          <span>{project.progress_pct}%</span>
          {days !== null && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {days >= 0 ? `${days}d` : `${-days}d over`}
            </span>
          )}
        </div>

        {(owner || partner) && (
          <div className="mt-3 flex items-center gap-1.5 border-t border-glow/10 pt-3">
            {project.is_shared && partner && owner ? (
              <>
                <Avatar profile={owner} />
                <Avatar profile={partner} negativeMargin />
                <span className="ml-1 text-[11px] text-fg-muted">{owner.display_name} & {partner.display_name}</span>
              </>
            ) : (
              owner && (
                <>
                  <Avatar profile={owner} />
                  <span className="text-[11px] text-fg-muted">{owner.display_name}</span>
                </>
              )
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function Avatar({ profile, negativeMargin }: { profile: Pick<Profile, "display_name" | "avatar_url" | "theme">; negativeMargin?: boolean }) {
  const fallback = profile.theme === "jinwoo" ? "/assets/jinwoo-default.svg" : "/assets/chahaein-default.svg";
  return (
    <div className={cn("relative h-6 w-6 overflow-hidden rounded-full border border-glow/40 bg-bg-elevated", negativeMargin && "-ml-2")}>
      <Image src={profile.avatar_url || fallback} alt="" fill className="object-cover" sizes="24px" />
    </div>
  );
}
