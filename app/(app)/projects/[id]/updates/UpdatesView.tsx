"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Send, Trash2 } from "lucide-react";
import { postProjectUpdate, deleteProjectUpdate } from "@/lib/projects/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectUpdate, Profile } from "@/lib/supabase/database.types";

type SmallProfile = Pick<Profile, "id" | "display_name" | "avatar_url" | "theme">;

export function UpdatesView({
  projectId,
  initialUpdates,
  profiles,
  canWrite,
  currentUserId,
}: {
  projectId: string;
  initialUpdates: ProjectUpdate[];
  profiles: SmallProfile[];
  canWrite: boolean;
  currentUserId: string;
}) {
  const [updates, setUpdates] = useState(initialUpdates);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const byId: Record<string, SmallProfile> = {};
  for (const p of profiles) byId[p.id] = p;

  function publish() {
    const content = draft.trim();
    if (!content || !canWrite) return;
    startTransition(async () => {
      const u = await postProjectUpdate({ project_id: projectId, content });
      setUpdates((cur) => [u as ProjectUpdate, ...cur]);
      setDraft("");
    });
  }

  function remove(u: ProjectUpdate) {
    if (!confirm("Delete this update?")) return;
    setUpdates((cur) => cur.filter((x) => x.id !== u.id));
    startTransition(() => deleteProjectUpdate(u.id));
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-fg-muted">Devlog</p>
        <h2 className="font-display text-2xl font-semibold text-fg">Updates</h2>
        <p className="mt-1 text-sm text-fg-muted">Short progress notes. Mirrors into the main Feed.</p>
      </div>

      {canWrite && (
        <div className="surface p-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Shipped something? Hit a wall? Drop a note."
            rows={3}
          />
          <div className="mt-2 flex justify-end">
            <Button onClick={publish} disabled={pending || !draft.trim()}><Send className="mr-1 h-3.5 w-3.5" /> {pending ? "Posting..." : "Post"}</Button>
          </div>
        </div>
      )}

      {updates.length === 0 ? (
        <div className="surface p-10 text-center text-sm text-fg-muted italic">No updates yet.</div>
      ) : (
        <ul className="space-y-3">
          {updates.map((u) => {
            const p = byId[u.user_id];
            return (
              <li key={u.id} className="surface group p-4">
                <div className="mb-2 flex items-center gap-2">
                  {p && (
                    <div className="relative h-7 w-7 overflow-hidden rounded-full border border-glow/30 bg-bg-elevated">
                      <Image
                        src={p.avatar_url || (p.theme === "jinwoo" ? "/assets/jinwoo-default.svg" : "/assets/chahaein-default.svg")}
                        alt=""
                        fill
                        sizes="28px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <span className="text-sm font-medium text-fg">{p?.display_name ?? "Someone"}</span>
                  <span className="text-[11px] text-fg-muted">· {formatDistanceToNow(parseISO(u.created_at), { addSuffix: true })}</span>
                  {u.user_id === currentUserId && (
                    <button onClick={() => remove(u)} className="ml-auto opacity-0 group-hover:opacity-100 text-fg-muted hover:text-red-400" aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="prose-sm max-w-none text-sm text-fg [&_a]:text-accent [&_a]:underline [&_li]:my-0.5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{u.content}</ReactMarkdown>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
