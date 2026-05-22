"use client";

import { useEffect, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Plus, Pin, PinOff, Save, Trash2, Edit3 } from "lucide-react";
import { upsertProjectNote, deleteProjectNote } from "@/lib/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ProjectNote } from "@/lib/supabase/database.types";

export function NotesView({ projectId, initialNotes, canWrite }: { projectId: string; initialNotes: ProjectNote[]; canWrite: boolean }) {
  const [notes, setNotes] = useState(initialNotes);
  const [selectedId, setSelectedId] = useState<string | null>(initialNotes[0]?.id ?? null);
  const [editing, setEditing] = useState(initialNotes.length === 0);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, startSave] = useTransition();

  useEffect(() => {
    if (selectedId) {
      const n = notes.find((x) => x.id === selectedId);
      if (n && !editing) {
        setDraftTitle(n.title ?? "");
        setDraftContent(n.content);
      }
    }
  }, [selectedId, notes, editing]);

  function startNew() {
    setSelectedId(null);
    setDraftTitle("");
    setDraftContent("");
    setEditing(true);
    setPreview(false);
  }

  function startEdit(n: ProjectNote) {
    setSelectedId(n.id);
    setDraftTitle(n.title ?? "");
    setDraftContent(n.content);
    setEditing(true);
    setPreview(false);
  }

  function save() {
    startSave(async () => {
      const id = selectedId ?? undefined;
      const isNew = !id;
      await upsertProjectNote({ id, project_id: projectId, title: draftTitle, content: draftContent });
      // optimistic-ish: refetch the row OR just patch local
      if (isNew) {
        const tmp: ProjectNote = {
          id: `tmp-${Math.random()}`, project_id: projectId, title: draftTitle || null, content: draftContent,
          pinned: false, created_by: null, last_edited_by: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        };
        setNotes((cur) => [tmp, ...cur]);
        setSelectedId(tmp.id);
      } else {
        setNotes((cur) => cur.map((n) => (n.id === id ? { ...n, title: draftTitle || null, content: draftContent, updated_at: new Date().toISOString() } : n)));
      }
      setEditing(false);
    });
  }

  function togglePin(n: ProjectNote) {
    if (!canWrite) return;
    const next = !n.pinned;
    setNotes((cur) => cur.map((x) => (x.id === n.id ? { ...x, pinned: next } : x)).sort((a, b) => Number(b.pinned) - Number(a.pinned)));
    startSave(async () => {
      await upsertProjectNote({ id: n.id, project_id: projectId, title: n.title ?? "", content: n.content, pinned: next });
    });
  }

  function remove(n: ProjectNote) {
    if (!canWrite) return;
    if (!confirm("Delete this note?")) return;
    setNotes((cur) => cur.filter((x) => x.id !== n.id));
    if (selectedId === n.id) {
      setSelectedId(null);
      setEditing(false);
    }
    startSave(async () => { await deleteProjectNote(n.id); });
  }

  const selected = selectedId ? notes.find((n) => n.id === selectedId) ?? null : null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
      <aside className="surface p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fg-muted">Notes</p>
          {canWrite && (
            <button onClick={startNew} className="rounded-md p-1 text-fg-muted hover:text-fg"><Plus className="h-4 w-4" /></button>
          )}
        </div>
        {notes.length === 0 ? (
          <p className="px-2 py-4 text-xs text-fg-muted">{canWrite ? "Start by writing one." : "No notes yet."}</p>
        ) : (
          <ul className="space-y-1">
            {notes.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => { setSelectedId(n.id); setEditing(false); setPreview(false); }}
                  className={cn(
                    "group flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                    selectedId === n.id ? "bg-accent/15 text-fg" : "text-fg-muted hover:bg-bg-card hover:text-fg",
                  )}
                >
                  <span className="truncate">{n.title || (n.content.split("\n")[0] || "Untitled").slice(0, 40)}</span>
                  {n.pinned && <Pin className="h-3 w-3 text-accent" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="surface p-4">
        {editing ? (
          <div className="space-y-3">
            <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Title (optional)" />
            {preview ? (
              <div className="prose-sm min-h-[300px] max-w-none rounded-md border border-glow/15 bg-bg-elevated/30 p-3 text-sm text-fg [&_a]:text-accent [&_a]:underline [&_li]:my-0.5 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{draftContent || "*nothing yet*"}</ReactMarkdown>
              </div>
            ) : (
              <Textarea value={draftContent} onChange={(e) => setDraftContent(e.target.value)} rows={14} placeholder="Markdown supported." />
            )}
            <div className="flex items-center justify-between">
              <button onClick={() => setPreview((p) => !p)} className="font-mono text-[10px] uppercase tracking-widest text-fg-muted hover:text-fg">
                {preview ? "Edit" : "Preview"}
              </button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button onClick={save} disabled={saving || !draftContent.trim()}><Save className="mr-1 h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          </div>
        ) : selected ? (
          <article>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-semibold text-fg">{selected.title || "Untitled"}</h2>
                <p className="mt-1 text-[11px] text-fg-muted">Updated {formatDistanceToNow(parseISO(selected.updated_at), { addSuffix: true })}</p>
              </div>
              {canWrite && (
                <div className="flex gap-1">
                  <button onClick={() => togglePin(selected)} className="rounded-md p-1.5 text-fg-muted hover:text-fg" title={selected.pinned ? "Unpin" : "Pin"}>
                    {selected.pinned ? <Pin className="h-4 w-4 text-accent" /> : <PinOff className="h-4 w-4" />}
                  </button>
                  <button onClick={() => startEdit(selected)} className="rounded-md p-1.5 text-fg-muted hover:text-fg" title="Edit">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(selected)} className="rounded-md p-1.5 text-fg-muted hover:text-red-400" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="prose-sm max-w-none text-sm text-fg [&_a]:text-accent [&_a]:underline [&_h1]:mt-3 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_li]:my-0.5 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{selected.content}</ReactMarkdown>
            </div>
          </article>
        ) : (
          <p className="text-sm text-fg-muted italic">Select a note or start a new one.</p>
        )}
      </section>
    </div>
  );
}
