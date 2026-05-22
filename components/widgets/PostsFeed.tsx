"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Send, Heart, MessageCircle, Trash2, FolderKanban } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createPost, deletePost, toggleReaction, commentOnPost, deleteComment } from "@/lib/shared/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Post, PostReaction, PostComment, Profile, Project } from "@/lib/supabase/database.types";

type SmallProfile = Pick<Profile, "id" | "display_name" | "avatar_url" | "theme">;
type SmallProject = Pick<Project, "id" | "title">;

const QUICK_EMOJI = ["❤️", "🔥", "🎯", "😂", "👀"];

export function PostsFeed({
  initialPosts,
  initialReactions,
  initialComments,
  profiles,
  projects,
  currentUserId,
}: {
  initialPosts: Post[];
  initialReactions: PostReaction[];
  initialComments: PostComment[];
  profiles: SmallProfile[];
  projects: SmallProject[];
  currentUserId: string;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [reactions, setReactions] = useState(initialReactions);
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());

  const profilesById = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const projectsById = Object.fromEntries(projects.map((p) => [p.id, p]));

  // Realtime subscription for partner posts (Bible §7.11 says partner's post appears immediately)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
        const newPost = payload.new as Post;
        setPosts((cur) => (cur.some((p) => p.id === newPost.id) ? cur : [newPost, ...cur]));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_reactions" }, (payload) => {
        const r = payload.new as PostReaction;
        setReactions((cur) => (cur.some((x) => x.id === r.id) ? cur : [...cur, r]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "post_reactions" }, (payload) => {
        const r = payload.old as { id: string };
        setReactions((cur) => cur.filter((x) => x.id !== r.id));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_comments" }, (payload) => {
        const c = payload.new as PostComment;
        setComments((cur) => (cur.some((x) => x.id === c.id) ? cur : [...cur, c]));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  function publish() {
    const content = draft.trim();
    if (!content) return;
    startTransition(async () => {
      const post = await createPost({ content, project_id: projectId || undefined });
      if (post) setPosts((cur) => [post as Post, ...cur.filter((p) => p.id !== (post as Post).id)]);
      setDraft("");
      setProjectId("");
    });
  }

  function react(postId: string, emoji: string) {
    // optimistic toggle
    const existing = reactions.find((r) => r.post_id === postId && r.user_id === currentUserId && r.emoji === emoji);
    if (existing) {
      setReactions((cur) => cur.filter((r) => r.id !== existing.id));
    } else {
      const tmp: PostReaction = { id: `opt-${Math.random()}`, post_id: postId, user_id: currentUserId, emoji, created_at: new Date().toISOString() };
      setReactions((cur) => [...cur, tmp]);
    }
    startTransition(() => toggleReaction(postId, emoji));
  }

  function remove(post: Post) {
    if (!confirm("Delete this post?")) return;
    setPosts((cur) => cur.filter((p) => p.id !== post.id));
    startTransition(() => deletePost(post.id));
  }

  return (
    <div className="space-y-4">
      <div className="surface p-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What just happened?"
          rows={3}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          {projects.length > 0 ? (
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-md border border-glow/30 bg-bg-elevated/60 px-2 py-1 text-xs text-fg"
            >
              <option value="">no project tag</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>📁 {p.title}</option>
              ))}
            </select>
          ) : <span />}
          <Button onClick={publish} disabled={pending || !draft.trim()} size="sm">
            <Send className="mr-1 h-3.5 w-3.5" /> {pending ? "Posting..." : "Post"}
          </Button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="surface p-12 text-center text-sm text-fg-muted italic">
          Your feed is empty. Be the first to drop something.
        </div>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => {
            const author = profilesById[post.user_id];
            const postReactions = reactions.filter((r) => r.post_id === post.id);
            const postComments = comments.filter((c) => c.post_id === post.id);
            const reactionsByEmoji = postReactions.reduce<Record<string, PostReaction[]>>((acc, r) => {
              (acc[r.emoji] = acc[r.emoji] ?? []).push(r);
              return acc;
            }, {});
            const project = post.project_id ? projectsById[post.project_id] : null;
            const commentsOpen = openComments.has(post.id);

            return (
              <li key={post.id} className="surface p-4">
                <div className="mb-2 flex items-center gap-2">
                  {author && <Avatar profile={author} />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-fg">{author?.display_name ?? "Someone"}</div>
                    <div className="text-[11px] text-fg-muted">{formatDistanceToNow(parseISO(post.created_at), { addSuffix: true })}</div>
                  </div>
                  {project && (
                    <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1 rounded-full border border-glow/30 bg-bg-elevated/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-fg-muted hover:text-fg">
                      <FolderKanban className="h-3 w-3" /> {project.title}
                    </Link>
                  )}
                  {post.user_id === currentUserId && (
                    <button onClick={() => remove(post)} className="text-fg-muted hover:text-red-400" aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {post.content && (
                  <div className="prose-sm max-w-none text-sm text-fg [&_a]:text-accent [&_a]:underline [&_li]:my-0.5 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{post.content}</ReactMarkdown>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-1">
                  {QUICK_EMOJI.map((e) => {
                    const set = reactionsByEmoji[e] ?? [];
                    const reactedByMe = set.some((r) => r.user_id === currentUserId);
                    return (
                      <button
                        key={e}
                        onClick={() => react(post.id, e)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                          reactedByMe ? "border-accent/60 bg-accent/15 text-accent" : "border-glow/20 bg-bg-card/40 text-fg-muted hover:text-fg",
                        )}
                      >
                        {e} {set.length > 0 && <span className="font-mono text-[10px]">{set.length}</span>}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setOpenComments((cur) => {
                      const next = new Set(cur);
                      if (next.has(post.id)) next.delete(post.id); else next.add(post.id);
                      return next;
                    })}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                      commentsOpen ? "border-accent/60 text-accent" : "border-glow/20 text-fg-muted hover:text-fg",
                    )}
                  >
                    <MessageCircle className="h-3 w-3" />
                    {postComments.length > 0 ? postComments.length : "Reply"}
                  </button>
                </div>

                {commentsOpen && (
                  <CommentsThread
                    postId={post.id}
                    comments={postComments}
                    profilesById={profilesById}
                    currentUserId={currentUserId}
                    onAdd={(content) => {
                      const tmp: PostComment = { id: `opt-${Math.random()}`, post_id: post.id, user_id: currentUserId, content, created_at: new Date().toISOString() };
                      setComments((cur) => [...cur, tmp]);
                      startTransition(() => commentOnPost(post.id, content));
                    }}
                    onDelete={(c) => {
                      setComments((cur) => cur.filter((x) => x.id !== c.id));
                      startTransition(() => deleteComment(c.id));
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Avatar({ profile }: { profile: SmallProfile }) {
  const fallback = profile.theme === "jinwoo" ? "/assets/jinwoo-default.svg" : "/assets/chahaein-default.svg";
  return (
    <div className="relative h-8 w-8 overflow-hidden rounded-full border border-glow/40 bg-bg-elevated">
      <Image src={profile.avatar_url || fallback} alt="" fill className="object-cover" sizes="32px" />
    </div>
  );
}

function CommentsThread({
  postId,
  comments,
  profilesById,
  currentUserId,
  onAdd,
  onDelete,
}: {
  postId: string;
  comments: PostComment[];
  profilesById: Record<string, SmallProfile>;
  currentUserId: string;
  onAdd: (content: string) => void;
  onDelete: (c: PostComment) => void;
}) {
  const [input, setInput] = useState("");
  return (
    <div className="mt-3 space-y-2 border-t border-glow/10 pt-3">
      {comments.map((c) => {
        const author = profilesById[c.user_id];
        return (
          <div key={c.id} className="group flex items-start gap-2 text-sm">
            {author && <Avatar profile={author} />}
            <div className="min-w-0 flex-1 rounded-md bg-bg-elevated/40 px-3 py-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-fg">{author?.display_name ?? "Someone"}</span>
                <span className="text-[10px] text-fg-muted">{formatDistanceToNow(parseISO(c.created_at), { addSuffix: true })}</span>
                {c.user_id === currentUserId && (
                  <button onClick={() => onDelete(c)} className="ml-auto opacity-0 transition-opacity group-hover:opacity-100 text-fg-muted hover:text-red-400">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <p className="text-fg whitespace-pre-wrap">{c.content}</p>
            </div>
          </div>
        );
      })}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Reply..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              const text = input.trim();
              setInput("");
              onAdd(text);
            }
          }}
        />
      </div>
    </div>
  );
}
