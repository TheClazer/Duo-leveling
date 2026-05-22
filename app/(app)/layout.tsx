import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThemeProvider, type ThemeKey } from "@/components/theme/ThemeProvider";
import { ParticleLayer } from "@/components/theme/ParticleLayer";
import { TopNav } from "@/components/layout/TopNav";
import { BottomNav } from "@/components/layout/BottomNav";
import type { Profile } from "@/lib/supabase/database.types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as Profile | null;
  if (!profile) redirect("/onboarding");

  return (
    <ThemeProvider initial={profile.theme as ThemeKey}>
      <ParticleLayer />
      <div className="relative z-10 flex min-h-screen flex-col">
        <TopNav />
        <main className="flex-1 pb-24 md:pb-8">{children}</main>
        <BottomNav />
      </div>
    </ThemeProvider>
  );
}
