"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Save, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Profile, Theme } from "@/lib/supabase/database.types";

const THEMES: { key: Theme; label: string; sub: string; color: string; avatar: string }[] = [
  { key: "jinwoo",   label: "Shadow Monarch", sub: "Sung Jin-Woo", color: "bg-gradient-to-br from-violet-500 to-orange-500", avatar: "/assets/jinwoo-default.svg" },
  { key: "chahaein", label: "S-Rank Hunter",  sub: "Cha Hae-In",   color: "bg-gradient-to-br from-amber-300 to-pink-400",     avatar: "/assets/chahaein-default.svg" },
];

export function ProfileEditor({ profile }: { profile: Profile }) {
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [theme, setTheme] = useState<Theme>(profile.theme);
  const [tagline, setTagline] = useState(profile.tagline ?? "");
  const [about, setAbout] = useState(profile.about ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setSaved(false);
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const supabase = createClient();
        let avatar_url: string | undefined;
        if (file) {
          const path = `${profile.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
          if (upErr) throw new Error(`Avatar upload failed: ${upErr.message}`);
          const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
          avatar_url = pub.publicUrl;
        }
        const { error } = await supabase.from("profiles").update({
          display_name: displayName.trim(),
          theme,
          tagline: tagline.trim() || null,
          about: about.trim() || null,
          ...(avatar_url ? { avatar_url } : {}),
        }).eq("id", profile.id);
        if (error) throw new Error(error.message);
        setSaved(true);
        // Hard-reload so theme + everything refreshes consistently.
        if (theme !== profile.theme) {
          setTimeout(() => { window.location.reload(); }, 600);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "failed");
      }
    });
  }

  const currentAvatar = preview || profile.avatar_url || THEMES.find((t) => t.key === theme)?.avatar;

  return (
    <div className="surface p-5">
      <p className="text-xs uppercase tracking-widest text-fg-muted">Profile</p>

      <div className="mt-3 space-y-3">
        <div>
          <Label>Theme</Label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {THEMES.map((t) => (
              <button
                type="button"
                key={t.key}
                onClick={() => setTheme(t.key)}
                className={cn(
                  "relative overflow-hidden rounded-lg border p-3 text-left transition-all",
                  theme === t.key ? "border-accent/80 shadow-[0_0_18px_rgb(var(--border-glow)/0.3)]" : "border-glow/20 hover:border-glow/40",
                )}
              >
                <div className={cn("absolute inset-0 opacity-15", t.color)} />
                <div className="relative">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-fg-muted">{t.sub}</div>
                  <div className="mt-0.5 text-sm font-medium text-fg">{t.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-full border border-glow/40 bg-bg-elevated">
            {currentAvatar && <Image src={currentAvatar} alt="" fill className="object-cover" sizes="64px" />}
          </div>
          <div className="flex-1">
            <Label htmlFor="avatar">Avatar</Label>
            <Input id="avatar" type="file" accept="image/*" onChange={onPick} className="mt-1.5 file:mr-3 file:rounded file:border-0 file:bg-bg-card file:px-3 file:py-1.5 file:text-xs file:text-fg" />
          </div>
        </div>

        <div>
          <Label htmlFor="name">Display name</Label>
          <Input id="name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="tagline">Tagline</Label>
          <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} className="mt-1.5" maxLength={120} />
        </div>
        <div>
          <Label htmlFor="about">About</Label>
          <Textarea id="about" value={about} onChange={(e) => setAbout(e.target.value)} rows={3} className="mt-1.5" />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {saved && <p className="text-xs text-emerald-400">Saved.</p>}

        <Button onClick={save} disabled={pending || !displayName.trim()}>
          <Save className="mr-1 h-3.5 w-3.5" /> {pending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
