import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CharacterHero } from "@/components/theme/CharacterHero";
import { ThemeSwap } from "./ThemeSwap";
import { HabitsHeatmap } from "@/components/widgets/HabitsHeatmap";
import { Goals } from "@/components/widgets/Goals";
import { DailyChecklist } from "@/components/widgets/DailyChecklist";
import { Journal } from "@/components/widgets/Journal";
import { ActiveProjects } from "@/components/widgets/ActiveProjects";
import { Leetcode } from "@/components/widgets/Leetcode";
import { SaveLater } from "@/components/widgets/SaveLater";
import { Achievements } from "@/components/widgets/Achievements";
import { BentoGrid, type BentoItem } from "@/components/layout/BentoGrid";
import { WidgetSkeleton } from "@/components/ui/widget-skeleton";
import type { LayoutItem, Profile } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function ThemPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: meRaw } = await supabase.from("profiles").select("id, couple_id").eq("id", user.id).single();
  const me = meRaw as Pick<Profile, "id" | "couple_id"> | null;
  if (!me) redirect("/onboarding");

  if (!me.couple_id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="surface p-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">No partner yet</p>
          <h1 className="mt-2 text-2xl font-semibold text-fg">Send your partner an invite first.</h1>
          <p className="mt-2 text-sm text-fg-muted">Once they accept, their dashboard will appear here.</p>
        </div>
      </div>
    );
  }

  const { data: partnerRaw } = await supabase
    .from("profiles")
    .select("*")
    .eq("couple_id", me.couple_id)
    .neq("id", me.id)
    .maybeSingle();
  const partner = partnerRaw as Profile | null;

  if (!partner) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="surface p-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">Waiting</p>
          <h1 className="mt-2 text-2xl font-semibold text-fg">Your partner hasn't completed setup yet.</h1>
        </div>
      </div>
    );
  }

  const { data: layoutRow } = await supabase
    .from("dashboard_layouts")
    .select("layout")
    .eq("user_id", partner.id)
    .maybeSingle();
  const storedLayout = ((layoutRow as { layout?: LayoutItem[] } | null)?.layout ?? []) as LayoutItem[];

  // Same Suspense streaming as /you — partner widgets stream independently.
  const items: BentoItem[] = [
    { id: "projects", defaultLayout: { x: 0, y: 0,  w: 2, h: 5 }, children: (
      <Suspense fallback={<WidgetSkeleton minHeight={360} label="Loading projects" />}>
        <ActiveProjects userId={partner.id} readOnly />
      </Suspense>
    )},
    { id: "habits", defaultLayout: { x: 2, y: 0,  w: 4, h: 5 }, children: (
      <Suspense fallback={<WidgetSkeleton minHeight={360} label="Loading habits" />}>
        <HabitsHeatmap userId={partner.id} readOnly />
      </Suspense>
    )},
    { id: "checklist", defaultLayout: { x: 0, y: 5,  w: 3, h: 6 }, children: (
      <Suspense fallback={<WidgetSkeleton minHeight={440} label="Loading checklist" />}>
        <DailyChecklist userId={partner.id} readOnly />
      </Suspense>
    )},
    { id: "goals", defaultLayout: { x: 3, y: 5,  w: 3, h: 6 }, children: (
      <Suspense fallback={<WidgetSkeleton minHeight={440} label="Loading goals" />}>
        <Goals userId={partner.id} readOnly />
      </Suspense>
    )},
    { id: "leetcode", defaultLayout: { x: 0, y: 11, w: 3, h: 6 }, children: (
      <Suspense fallback={<WidgetSkeleton minHeight={440} label="Loading LeetCode" />}>
        <Leetcode userId={partner.id} readOnly />
      </Suspense>
    )},
    { id: "savelater", defaultLayout: { x: 0, y: 17, w: 3, h: 7 }, children: (
      <Suspense fallback={<WidgetSkeleton minHeight={520} label="Loading save-later" />}>
        <SaveLater userId={partner.id} readOnly />
      </Suspense>
    )},
    { id: "journal", defaultLayout: { x: 3, y: 17, w: 3, h: 7 }, children: (
      <Suspense fallback={<WidgetSkeleton minHeight={520} label="Loading journal" />}>
        <Journal userId={partner.id} readOnly />
      </Suspense>
    )},
    { id: "achievements", defaultLayout: { x: 0, y: 24, w: 6, h: 6 }, children: (
      <Suspense fallback={<WidgetSkeleton minHeight={440} label="Loading achievements" />}>
        <Achievements userId={partner.id} readOnly />
      </Suspense>
    )},
  ];

  return (
    <div>
      <ThemeSwap theme={partner.theme} />
      <CharacterHero profile={partner} readOnly />
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <BentoGrid items={items} initialLayout={storedLayout} readOnly />
      </section>
    </div>
  );
}
