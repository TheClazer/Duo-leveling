"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { format, parseISO } from "date-fns";
import { Eye, EyeOff, Plus, Pencil, Save, Trash2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { haptic, notifyXP } from "@/lib/system-fx";
import type { Note } from "@/lib/supabase/database.types";

export function JournalClient({ initialNotes, readOnly }: { initialNotes: Note[]; readOnly: boolean }) {
  const [notes, setNotes] = useState(initialNotes);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftPrivate, setDraftPrivate] = useState(false);
  const [preview, setPreview] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  async function publish() {
    if (!draft.trim() || readOnly) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("notes")
      .insert({ user_id: user.id, content: draft.trim(), date: format(new Date(), "yyyy-MM-dd"), is_private: draftPrivate })
      .select()
      .single();
    if (!error && data) {
      haptic.tap();
      notifyXP("journal_entry");
      setNotes((cur) => [data as Note, ...cur]);
      setDraft("");
      setDraftPrivate(false);
      setComposing(false);
      setPreview(false);
    } else if (error) {
      haptic.err();
    }
  }

  async function saveEdit(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("notes").update({ content: editContent.trim() }).eq("id", id);
    if (!error) {
      setNotes((cur) => cur.map((n) => (n.id === id ? { ...n, content: editContent.trim() } : n)));
      setEditingId(null);
    }
  }

  async function togglePrivate(n: Note) {
    if (readOnly) return;
    const next = !n.is_private;
    setNotes((cur) => cur.map((x) => (x.id === n.id ? { ...x, is_private: next } : x)));
    const supabase = createClient();
    await supabase.from("notes").update({ is_private: next }).eq("id", n.id);
  }

  async function remove(n: Note) {
    if (readOnly) return;
    setNotes((cur) => cur.filter((x) => x.id !== n.id));
    const supabase = createClient();
    await supabase.from("notes").delete().eq("id", n.id);
  }

  return (
    <div className="surface p-5 flex h-full flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Logbook</p>
          <h3 className="text-lg font-semibold text-fg">Journal</h3>
        </div>
        {!readOnly && !composing && (
          <Button size="sm" variant="outline" onClick={() => setComposing(true)}>
            <Plus className="mr-1 h-4 w-4" /> Entry
          </Button>
        )}
      </div>

      {composing && !readOnly && (
        <div className="mb-4 rounded-lg border border-glow/25 bg-bg-elevated/50 p-3">
          {preview ? (
            <Markdown content={draft || "*nothing yet*"} />
          ) : (
            <Textarea
              autoFocus
              rows={6}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Markdown supported. Use ** for bold, # for headings, - for lists."
              className="border-0 bg-transparent focus-visible:ring-0 p-0"
            />
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreview((p) => !p)}
                className="rounded-md border border-glow/30 px-2 py-1 text-[10px] uppercase tracking-widest text-fg-muted hover:text-fg"
              >
                {preview ? "Edit" : "Preview"}
              </button>
              <button
                onClick={() => setDraftPrivate((p) => !p)}
                className={cn(
                  "flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] uppercase tracking-widest",
                  draftPrivate ? "border-accent/60 text-accent" : "border-glow/30 text-fg-muted hover:text-fg",
                )}
              >
                {draftPrivate ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {draftPrivate ? "Private" : "Shared"}
              </button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setComposing(false); setDraft(""); setPreview(false); }}>Cancel</Button>
              <Button size="sm" onClick={publish} disabled={!draft.trim()}>Publish</Button>
            </div>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="rounded-md border border-dashed border-glow/30 bg-bg-card/40 px-4 py-8 text-center text-sm text-fg-muted">
            {readOnly ? "No public entries yet." : "Your logbook is empty. Write the first entry."}
          </p>
        </div>
      ) : (
        <ul className="flex-1 space-y-3 overflow-y-auto">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-glow/15 bg-bg-elevated/30 p-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-fg-muted">
                <span className="font-mono">{format(parseISO(n.date), "MMM d, yyyy")}</span>
                <div className="flex items-center gap-2">
                  {n.is_private && (
                    <span className="flex items-center gap-1 text-accent">
                      <Lock className="h-3 w-3" /> private
                    </span>
                  )}
                  {!readOnly && (
                    <>
                      <button onClick={() => togglePrivate(n)} aria-label={n.is_private ? "Make shared" : "Make private"} className="hover:text-fg" title={n.is_private ? "Make shared" : "Make private"}>
                        {n.is_private ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => { setEditingId(n.id); setEditContent(n.content); }} aria-label="Edit entry" className="hover:text-fg" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <ConfirmButton onConfirm={() => remove(n)} title="Delete this entry?" ariaLabel="Delete entry" className="hover:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </ConfirmButton>
                    </>
                  )}
                </div>
              </div>
              {editingId === n.id ? (
                <div>
                  <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={5} />
                  <div className="mt-2 flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button size="sm" onClick={() => saveEdit(n.id)}><Save className="mr-1 h-3.5 w-3.5" /> Save</Button>
                  </div>
                </div>
              ) : (
                <Markdown content={n.content} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-sm max-w-none text-sm text-fg [&_a]:text-accent [&_a]:underline [&_code]:rounded [&_code]:bg-bg-card [&_code]:px-1 [&_code]:py-0.5 [&_h1]:mt-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mt-2 [&_h2]:text-sm [&_h2]:font-semibold [&_li]:my-0.5 [&_p]:my-1 [&_strong]:text-fg [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
