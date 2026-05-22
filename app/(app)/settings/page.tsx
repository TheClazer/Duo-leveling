import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PushPrompt } from "@/components/theme/PushPrompt";
import { ProfileEditor } from "./ProfileEditor";
import { rankFromLevel, xpForLevel } from "@/lib/xp";
import type { Profile, Couple } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRaw } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileRaw as Profile | null;
  if (!profile) redirect("/onboarding");

  let couple: Couple | null = null;
  if (profile.couple_id) {
    const { data } = await supabase.from("couples").select("*").eq("id", profile.couple_id).maybeSingle();
    couple = data as Couple | null;
  }

  let partner: Pick<Profile, "display_name" | "theme"> | null = null;
  if (couple) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, theme")
      .eq("couple_id", couple.id)
      .neq("id", user.id)
      .maybeSingle();
    partner = data as Pick<Profile, "display_name" | "theme"> | null;
  }

  const nextLevelXP = xpForLevel(profile.level + 1);
  const thisLevelXP = xpForLevel(profile.level);
  const progressPct = Math.max(0, Math.min(100, ((profile.xp - thisLevelXP) / Math.max(1, nextLevelXP - thisLevelXP)) * 100));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">Settings</p>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-tighter-display text-fg">{profile.display_name}</h1>
        <p className="mt-1 text-sm text-fg-muted">{user.email}</p>
      </div>

      {/* Rank + Level + XP card */}
      <div className="surface mb-4 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-fg-muted">Rank</p>
            <div className="font-display text-4xl font-semibold text-fg">{rankFromLevel(profile.level)}</div>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fg-muted">Level</p>
            <div className="font-display text-4xl font-semibold text-fg">{profile.level}</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated/60">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mt-1.5 font-mono text-[10px] text-fg-muted">
            {profile.xp} / {nextLevelXP} XP · {Math.max(0, nextLevelXP - profile.xp)} to next level
          </p>
        </div>
      </div>

      {/* Profile editor */}
      <ProfileEditor profile={profile} />

      {/* Partner */}
      <div className="surface mt-4 p-5">
        <div className="text-xs uppercase tracking-widest text-fg-muted">Partner</div>
        {partner ? (
          <p className="mt-2 text-sm text-fg">Linked with <span className="font-medium">{partner.display_name}</span> ({partner.theme})</p>
        ) : (
          <p className="mt-2 text-sm text-fg-muted">Not linked yet. Generate an invite from the You dashboard.</p>
        )}
      </div>

      {/* Notifications */}
      <div className="surface mt-4 p-5">
        <div className="text-xs uppercase tracking-widest text-fg-muted">Notifications</div>
        <p className="mt-2 text-sm text-fg-muted">Enable push for surprise deliveries, anniversaries, and partner milestones.</p>
        <div className="mt-3"><PushPrompt /></div>
      </div>

      <form action="/api/auth/signout" method="post" className="mt-6">
        <Button type="submit" variant="outline" className="w-full">Sign out</Button>
      </form>
    </div>
  );
}
