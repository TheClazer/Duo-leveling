"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const THEMES = [
  { key: "jinwoo", label: "Shadow Monarch", sub: "Sung Jin-Woo", color: "bg-gradient-to-br from-violet-500 to-orange-500", avatar: "/assets/jinwoo-default.svg" },
  { key: "chahaein", label: "S-Rank Hunter", sub: "Cha Hae-In", color: "bg-gradient-to-br from-amber-300 to-pink-400", avatar: "/assets/chahaein-default.svg" },
] as const;

export function OnboardingForm({ email, inviteToken }: { email: string; inviteToken?: string }) {
  // If accepting an invite, default to chahaein (partner role); else jinwoo (first user)
  const [theme, setTheme] = useState<"jinwoo" | "chahaein">(inviteToken ? "chahaein" : "jinwoo");
  const [displayName, setDisplayName] = useState("");
  const [tagline, setTagline] = useState("");
  const [about, setAbout] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Session lost. Please sign in again.");
      setSubmitting(false);
      return;
    }

    let avatar_url: string | null = null;
    if (avatarFile) {
      const path = `${user.id}/${Date.now()}-${avatarFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
      if (upErr) {
        setError(`Avatar upload failed: ${upErr.message}`);
        setSubmitting(false);
        return;
      }
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      avatar_url = pub.publicUrl;
    }

    // upsert: if profile already exists (e.g. double-click), update it instead of failing
    const { error: insErr } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: displayName.trim(),
      theme,
      tagline: tagline.trim() || null,
      about: about.trim() || null,
      avatar_url,
    });

    if (insErr) {
      setError(insErr.message);
      setSubmitting(false);
      return;
    }

    if (inviteToken) {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: inviteToken }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(`Couldn't accept invite: ${j.error || res.statusText}. You're signed up — ask your partner to send a fresh invite.`);
        setSubmitting(false);
        window.location.href = "/you";
        return;
      }
    }

    // Hard-navigate so middleware re-reads cookies + (app) layout re-queries the new profile.
    window.location.href = "/you";
  }

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="surface space-y-5 p-6"
    >
      <div>
        <Label>Theme</Label>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {THEMES.map((t) => (
            <button
              type="button"
              key={t.key}
              onClick={() => setTheme(t.key)}
              className={cn(
                "relative overflow-hidden rounded-lg border p-4 text-left transition-all",
                theme === t.key
                  ? "border-accent/80 shadow-[0_0_20px_rgb(var(--border-glow)/0.35)]"
                  : "border-glow/20 hover:border-glow/40",
              )}
            >
              <div className={cn("absolute inset-0 opacity-15", t.color)} />
              <div className="relative">
                <div className="font-mono text-[10px] uppercase tracking-widest text-fg-muted">{t.sub}</div>
                <div className="mt-1 text-base font-medium text-fg">{t.label}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-4">
        <div className="surface relative h-20 w-20 overflow-hidden rounded-full">
          {avatarPreview ? (
            <Image src={avatarPreview} alt="" fill className="object-cover" />
          ) : (
            <Image src={THEMES.find((t) => t.key === theme)!.avatar} alt="" fill className="object-cover" />
          )}
        </div>
        <div className="flex-1">
          <Label htmlFor="avatar">Avatar (optional)</Label>
          <Input id="avatar" type="file" accept="image/*" onChange={onAvatarPick} className="mt-1.5 file:mr-3 file:rounded file:border-0 file:bg-bg-card file:px-3 file:py-1.5 file:text-xs file:text-fg" />
        </div>
      </div>

      <div>
        <Label htmlFor="email-display">Email</Label>
        <Input id="email-display" value={email} disabled className="mt-1.5 opacity-60" />
      </div>

      <div>
        <Label htmlFor="name">Display name</Label>
        <Input id="name" required placeholder="Rayyan" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5" />
      </div>

      <div>
        <Label htmlFor="tagline">Tagline</Label>
        <Input id="tagline" placeholder="Arise." value={tagline} onChange={(e) => setTagline(e.target.value)} className="mt-1.5" maxLength={120} />
      </div>

      <div>
        <Label htmlFor="about">About</Label>
        <Textarea id="about" placeholder="A few lines about you." value={about} onChange={(e) => setAbout(e.target.value)} className="mt-1.5" rows={4} />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <Button type="submit" disabled={submitting || !displayName.trim()} size="lg" className="w-full">
        {submitting ? "Setting up..." : inviteToken ? "Accept invite & enter The System" : "Enter The System"}
      </Button>
    </motion.form>
  );
}
