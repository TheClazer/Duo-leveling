import Image from "next/image";
import Link from "next/link";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Calendar, Github, Pin, PinOff, Users, User as UserIcon, ChevronLeft } from "lucide-react";
import type { Project, Profile, ProjectStatus } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { StatusMenu } from "./StatusMenu";
import { PinButton } from "./PinButton";
import { ProjectTimer } from "./ProjectTimer";

const STATUS_STYLES: Record<ProjectStatus, { label: string; cls: string; dot: string }> = {
  idea:     { label: "Idea",     cls: "border-stone-500/40 bg-stone-500/15 text-stone-300", dot: "bg-stone-400" },
  active:   { label: "Active",   cls: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300", dot: "bg-emerald-400" },
  paused:   { label: "Paused",   cls: "border-amber-500/40 bg-amber-500/15 text-amber-300", dot: "bg-amber-400" },
  done:     { label: "Done",     cls: "border-violet-500/40 bg-violet-500/15 text-violet-300", dot: "bg-violet-400" },
  archived: { label: "Archived", cls: "border-zinc-600/40 bg-zinc-600/15 text-zinc-400", dot: "bg-zinc-500" },
};

export function ProjectHeader({
  project,
  owner,
  partner,
  canWrite,
  userId,
}: {
  project: Project;
  owner: Profile | null;
  partner: Profile | null;
  canWrite: boolean;
  userId: string;
}) {
  const days = project.target_date ? differenceInCalendarDays(parseISO(project.target_date), new Date()) : null;
  const status = STATUS_STYLES[project.status];

  return (
    <div className="relative overflow-hidden rounded-xl border border-glow/20 bg-bg-card/40">
      <div className="relative h-44 w-full md:h-56">
        {project.cover_image_url ? (
          <Image src={project.cover_image_url} alt="" fill className="object-cover" priority />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-bg-elevated to-accent-secondary/25" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-bg-base/70 to-transparent" />
        <Link href="/projects" className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-md bg-bg-base/60 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-fg-muted backdrop-blur hover:text-fg">
          <ChevronLeft className="h-3 w-3" /> Projects
        </Link>
      </div>

      <div className="relative -mt-16 px-4 pb-5 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest", status.cls)}>
                <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", status.dot)} /> {status.label}
              </span>
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest",
                project.is_shared ? "border-accent/40 bg-bg-base/60 text-accent" : "border-glow/30 bg-bg-base/60 text-fg-muted",
              )}>
                {project.is_shared ? <Users className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                {project.is_shared ? "Joint" : "Solo"}
              </span>
              {project.category && (
                <span className="rounded-full border border-glow/20 bg-bg-base/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-fg-muted">
                  {project.category}
                </span>
              )}
            </div>

            <h1 className="font-display text-3xl font-semibold tracking-tighter-display text-fg md:text-5xl">
              {project.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fg-muted">
              {owner && (
                <div className="flex items-center gap-2">
                  <AvatarSm profile={owner} />
                  <span>{owner.display_name}</span>
                  {project.is_shared && partner && (
                    <>
                      <span>·</span>
                      <AvatarSm profile={partner} />
                      <span>{partner.display_name}</span>
                    </>
                  )}
                </div>
              )}
              {days !== null && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {days >= 0 ? `${days} days left` : `${-days} days over`}
                </span>
              )}
              {project.github_repo && (
                <a
                  href={project.github_repo.startsWith("http") ? project.github_repo : `https://github.com/${project.github_repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-fg"
                >
                  <Github className="h-3.5 w-3.5" />
                  {project.github_repo.replace(/^https?:\/\/github\.com\//, "")}
                </a>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="h-1.5 flex-1 max-w-sm overflow-hidden rounded-full bg-bg-elevated/60">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${project.progress_pct}%` }} />
              </div>
              <span className="font-mono text-xs text-fg-muted">{project.progress_pct}%</span>
            </div>
          </div>

          {canWrite && (
            <div className="flex flex-wrap items-center gap-2">
              <ProjectTimer projectId={project.id} userId={userId} />
              <StatusMenu projectId={project.id} current={project.status} />
              <PinButton projectId={project.id} pinned={project.pinned} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AvatarSm({ profile }: { profile: Profile }) {
  const fallback = profile.theme === "jinwoo" ? "/assets/jinwoo-default.svg" : "/assets/chahaein-default.svg";
  return (
    <div className="relative h-6 w-6 overflow-hidden rounded-full border border-glow/40 bg-bg-elevated">
      <Image src={profile.avatar_url || fallback} alt="" fill className="object-cover" sizes="24px" />
    </div>
  );
}
