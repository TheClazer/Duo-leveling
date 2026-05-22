import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostsFeed } from "@/components/widgets/PostsFeed";
import type { Post, PostReaction, PostComment, Profile, Project } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: meRaw } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const me = meRaw as Profile | null;
  if (!me) redirect("/onboarding");

  // Get partner (if any) so we can fetch posts by both of us
  const userIds: string[] = [me.id];
  let partner: Profile | null = null;
  if (me.couple_id) {
    const { data: partnerRaw } = await supabase
      .from("profiles")
      .select("*")
      .eq("couple_id", me.couple_id)
      .neq("id", me.id)
      .maybeSingle();
    partner = partnerRaw as Profile | null;
    if (partner) userIds.push(partner.id);
  }

  const { data: postsRaw } = await supabase
    .from("posts")
    .select("*")
    .in("user_id", userIds)
    .order("created_at", { ascending: false })
    .limit(100);
  const posts = (postsRaw ?? []) as Post[];

  const postIds = posts.map((p) => p.id);
  const [{ data: reactionsRaw }, { data: commentsRaw }, { data: projectsRaw }] = await Promise.all([
    postIds.length > 0
      ? supabase.from("post_reactions").select("*").in("post_id", postIds)
      : Promise.resolve({ data: [] }),
    postIds.length > 0
      ? supabase.from("post_comments").select("*").in("post_id", postIds).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    (() => {
      const projectIds = Array.from(new Set(posts.map((p) => p.project_id).filter(Boolean) as string[]));
      return projectIds.length > 0
        ? supabase.from("projects").select("*").in("id", projectIds)
        : Promise.resolve({ data: [] });
    })(),
  ]);

  const reactions = (reactionsRaw ?? []) as PostReaction[];
  const comments = (commentsRaw ?? []) as PostComment[];
  const projects = (projectsRaw ?? []) as Pick<Project, "id" | "title">[];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">Two-person feed</p>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-tighter-display text-fg md:text-5xl">Feed</h1>
        <p className="mt-1 text-sm text-fg-muted">Mini-updates from both of you. Replaces the "look at this" texts.</p>
      </div>

      <PostsFeed
        initialPosts={posts}
        initialReactions={reactions}
        initialComments={comments}
        profiles={[me, ...(partner ? [partner] : [])]}
        projects={projects}
        currentUserId={user.id}
      />
    </div>
  );
}
