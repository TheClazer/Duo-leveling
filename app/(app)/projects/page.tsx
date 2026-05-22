import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectsFilterBar, type OwnerFilter, type StatusFilter } from "./ProjectsFilterBar";
import type { Profile, Project } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const owner: OwnerFilter = (sp.owner as OwnerFilter) || "all";
  const status: StatusFilter = (sp.status as StatusFilter) || "all";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: meRaw } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const me = meRaw as Profile | null;
  if (!me) redirect("/onboarding");

  const { data: partnerRaw } = me.couple_id
    ? await supabase.from("profiles").select("*").eq("couple_id", me.couple_id).neq("id", me.id).maybeSingle()
    : { data: null };
  const partner = partnerRaw as Profile | null;

  let q = supabase.from("projects").select("*").order("pinned", { ascending: false }).order("updated_at", { ascending: false });

  if (owner === "mine") q = q.eq("owner_id", me.id).eq("is_shared", false);
  if (owner === "theirs" && partner) q = q.eq("owner_id", partner.id).eq("is_shared", false);
  if (owner === "ours") q = q.eq("is_shared", true);
  if (status !== "all") q = q.eq("status", status);

  const { data: projectsRaw } = await q;
  const list = (projectsRaw ?? []) as Project[];

  const profilesById: Record<string, Profile> = {};
  if (me) profilesById[me.id] = me;
  if (partner) profilesById[partner.id] = partner;
  const pinned = list.filter((p) => p.pinned && p.status === "active");
  const rest = list.filter((p) => !(p.pinned && p.status === "active"));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">Builder's Hub</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tighter-display text-fg md:text-5xl">Projects</h1>
          <p className="mt-1 text-sm text-fg-muted">Personal and joint. Every quest you're on.</p>
        </div>
        <Button asChild>
          <Link href="/projects/new"><Plus className="mr-1 h-4 w-4" /> New project</Link>
        </Button>
      </div>

      <ProjectsFilterBar
        owner={owner}
        status={status}
        hasPartner={!!partner}
        partnerName={partner?.display_name ?? null}
      />

      {pinned.length > 0 && (
        <section className="mb-6">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-fg-muted">Pinned · Active</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pinned.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                owner={profilesById[p.owner_id] ?? null}
                partner={p.is_shared ? Object.values(profilesById).find((x) => x.id !== p.owner_id) ?? null : null}
              />
            ))}
          </div>
        </section>
      )}

      {rest.length === 0 && pinned.length === 0 ? (
        <div className="surface mt-8 p-12 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">Empty</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-fg">No projects yet.</h2>
          <p className="mt-1 text-sm text-fg-muted">Every monarch starts with one quest.</p>
          <Button asChild className="mt-5"><Link href="/projects/new">Start your first project</Link></Button>
        </div>
      ) : rest.length > 0 ? (
        <section>
          {pinned.length > 0 && <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-fg-muted">All</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                owner={profilesById[p.owner_id] ?? null}
                partner={p.is_shared ? Object.values(profilesById).find((x) => x.id !== p.owner_id) ?? null : null}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
