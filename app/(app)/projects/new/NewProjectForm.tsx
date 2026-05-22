"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { User, Users, Github } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createProject } from "@/lib/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: "code",      label: "Code" },
  { key: "learning",  label: "Learning" },
  { key: "creative",  label: "Creative" },
  { key: "business",  label: "Business" },
  { key: "lifestyle", label: "Lifestyle" },
];

export function NewProjectForm({ hasPartner }: { hasPartner: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [targetDate, setTargetDate] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Esc bails back to /projects. Skip while a dialog/palette is open or while
  // typing inside an input/textarea — those handle their own Esc.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // If something else (Radix Dialog, CommandPalette) opened on top, let
      // it handle its own escape.
      if (document.querySelector("[role='dialog'][data-state='open']")) return;
      e.preventDefault();
      router.push("/projects");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  function onCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        let cover_image_url: string | null = null;
        if (coverFile) {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Session lost");
          const path = `${user.id}/${Date.now()}-${coverFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const { error: upErr } = await supabase.storage.from("project-covers").upload(path, coverFile, { upsert: true });
          if (upErr) throw new Error(`Cover upload failed: ${upErr.message}. (Did you create the 'project-covers' bucket? See SETUP.md.)`);
          const { data: pub } = supabase.storage.from("project-covers").getPublicUrl(path);
          cover_image_url = pub.publicUrl;
        }
        await createProject({
          title,
          description,
          is_shared: isShared,
          category: category || undefined,
          target_date: targetDate || null,
          cover_image_url,
          github_repo: githubRepo || null,
        });
        // redirect handled by server action
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "failed");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="surface space-y-5 p-6">
      <div>
        <Label>Project type</Label>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setIsShared(false)}
            className={cn(
              "rounded-lg border p-4 text-left transition-all",
              !isShared ? "border-accent/80 bg-accent/5 shadow-[0_0_18px_rgb(var(--border-glow)/0.3)]" : "border-glow/20 hover:border-glow/40",
            )}
          >
            <User className="mb-2 h-5 w-5 text-accent" />
            <div className="font-medium text-fg">Personal</div>
            <div className="text-xs text-fg-muted">Yours alone. Partner can view but not edit.</div>
          </button>
          <button
            type="button"
            disabled={!hasPartner}
            onClick={() => hasPartner && setIsShared(true)}
            className={cn(
              "rounded-lg border p-4 text-left transition-all",
              isShared ? "border-accent/80 bg-accent/5 shadow-[0_0_18px_rgb(var(--border-glow)/0.3)]" : "border-glow/20 hover:border-glow/40",
              !hasPartner && "cursor-not-allowed opacity-50",
            )}
          >
            <Users className="mb-2 h-5 w-5 text-accent" />
            <div className="font-medium text-fg">Joint</div>
            <div className="text-xs text-fg-muted">{hasPartner ? "Both of you can edit." : "Invite your partner first."}</div>
          </button>
        </div>
      </div>

      <div>
        <Label htmlFor="ptitle">Title</Label>
        <Input id="ptitle" required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" maxLength={120} placeholder="e.g. Learn Rust, Apartment renovation, Build The System" />
      </div>

      <div>
        <Label htmlFor="pdesc">Description</Label>
        <Textarea id="pdesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1.5" placeholder="What is this and why does it matter?" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="pcat">Category</Label>
          <select
            id="pcat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-md border border-glow/30 bg-bg-elevated/60 px-3 text-sm text-fg"
          >
            <option value="">(none)</option>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="pdate">Target date</Label>
          <Input id="pdate" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="mt-1.5" />
        </div>
      </div>

      <div>
        <Label htmlFor="prepo">GitHub repo (optional)</Label>
        <div className="mt-1.5 flex items-center gap-2">
          <Github className="h-4 w-4 text-fg-muted" />
          <Input id="prepo" value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} placeholder="owner/repo or full URL" />
        </div>
        <p className="mt-1 text-[11px] text-fg-muted">Commits will sync to the Activity tab in Phase 4.</p>
      </div>

      <div>
        <Label>Cover image (optional)</Label>
        <div className="mt-1.5 flex items-center gap-3">
          <div className="relative h-16 w-28 overflow-hidden rounded-md border border-glow/30 bg-bg-elevated/60">
            {coverPreview ? (
              <Image src={coverPreview} alt="" fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-fg-muted">no cover</div>
            )}
          </div>
          <Input type="file" accept="image/*" onChange={onCoverPick} className="file:mr-3 file:rounded file:border-0 file:bg-bg-card file:px-3 file:py-1.5 file:text-xs file:text-fg" />
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <Button type="submit" disabled={pending || !title.trim()} size="lg" className="w-full">
        {pending ? "Creating..." : "Create project"}
      </Button>
    </form>
  );
}
