import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CharacterHero } from "@/components/theme/CharacterHero";
import { InvitePartnerCard } from "./InvitePartnerCard";
import { HabitsHeatmap } from "@/components/widgets/HabitsHeatmap";
import { Goals } from "@/components/widgets/Goals";
import { DailyChecklist } from "@/components/widgets/DailyChecklist";
import { Journal } from "@/components/widgets/Journal";
import { ActiveProjects } from "@/components/widgets/ActiveProjects";
import { StatsStrip, StatsStripSkeleton } from "@/components/widgets/StatsStrip";
import { Leetcode } from "@/components/widgets/Leetcode";
import { SaveLater } from "@/components/widgets/SaveLater";
import { Achievements } from "@/components/widgets/Achievements";
import { BentoGrid, type BentoItem } from "@/components/layout/BentoGrid";
import { WidgetSkeleton } from "@/components/ui/widget-skeleton";
import type { LayoutItem, Profile } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

const DEFAULT_LAYOUT: BentoItem["defaultLayout"][] = [
  { x: 0, y: 0,  w: 2, h: 5, minW: 2, minH: 3 },   // active projects
  { x: 2, y: 0,  w: 4, h: 5, minW: 3, minH: 4 },   // habits
  { x: 0, y: 5,  w: 3, h: 6, minW: 2, minH: 4 },   // checklist
  { x: 3, y: 5,  w: 3, h: 6, minW: 2, minH: 4 },   // goals
  { x: 0, y: 11, w: 3, h: 6, minW: 2, minH: 4 },   // leetcode
  { x: 3, y: 11, w: 3, h: 6, minW: 2, minH: 4 },   // (unused — GitHub widget removed)
  { x: 0, y: 17, w: 3, h: 7, minW: 2, minH: 4 },   // save later
  { x: 3, y: 17, w: 3, h: 7, minW: 2, minH: 4 },   // journal
  { x: 0, y: 24, w: 6, h: 6, minW: 3, minH: 4 },   // achievements
];

export default async function YouPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch profile + saved layout in parallel — one round-trip instead of two.
  const [{ data: profileRaw }, { data: layoutRow }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("dashboard_layouts").select("layout").eq("user_id", user.id).maybeSingle(),
  ]);
  const profile = profileRaw as Profile | null;
  if (!profile) redirect("/onboarding");
  const storedLayout = ((layoutRow as { layout?: LayoutItem[] } | null)?.layout ?? []) as LayoutItem[];

  // Each widget wrapped in <Suspense> so it streams in independently.
  // A slow Github sync no longer blocks the rest of the bento.
  const items: BentoItem[] = [
    { id: "projects", defaultLayout: DEFAULT_LAYOUT[0], children: (
      <Suspense fallback={<WidgetSkeleton minHeight={360} label="Loading projects" />}>
        <ActiveProjects userId={user.id} />
      </Suspense>
    )},
    { id: "habits", defaultLayout: DEFAULT_LAYOUT[1], children: (
      <Suspense fallback={<WidgetSkeleton minHeight={360} label="Loading habits" />}>
        <HabitsHeatmap userId={user.id} />
      </Suspense>
    )},
    { id: "checklist", defaultLayout: DEFAULT_LAYOUT[2], children: (
      <Suspense fallback={<WidgetSkeleton minHeight={440} label="Loading checklist" />}>
        <DailyChecklist userId={user.id} />
      </Suspense>
    )},
    { id: "goals", defaultLayout: DEFAULT_LAYOUT[3], children: (
      <Suspense fallback={<WidgetSkeleton minHeight={440} label="Loading goals" />}>
        <Goals userId={user.id} />
      </Suspense>
    )},
    { id: "leetcode", defaultLayout: DEFAULT_LAYOUT[4], children: (
      <Suspense fallback={<WidgetSkeleton minHeight={440} label="Loading LeetCode" />}>
        <Leetcode userId={user.id} />
      </Suspense>
    )},
    { id: "savelater", defaultLayout: DEFAULT_LAYOUT[6], children: (
      <Suspense fallback={<WidgetSkeleton minHeight={520} label="Loading save-later" />}>
        <SaveLater userId={user.id} />
      </Suspense>
    )},
    { id: "journal", defaultLayout: DEFAULT_LAYOUT[7], children: (
      <Suspense fallback={<WidgetSkeleton minHeight={520} label="Loading journal" />}>
        <Journal userId={user.id} />
      </Suspense>
    )},
    { id: "achievements", defaultLayout: DEFAULT_LAYOUT[8], children: (
      <Suspense fallback={<WidgetSkeleton minHeight={440} label="Loading achievements" />}>
        <Achievements userId={user.id} />
      </Suspense>
    )},
  ];

  return (
    <div className="relative">
      <CharacterHero profile={profile} />

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="mb-4 mt-2">
          <Suspense fallback={<StatsStripSkeleton />}>
            <StatsStrip userId={user.id} level={profile.level} xp={profile.xp} />
          </Suspense>
        </div>

        {!profile.couple_id && (
          <div className="mb-4">
            <InvitePartnerCard />
          </div>
        )}

        <BentoGrid items={items} initialLayout={storedLayout} />
      </section>
    </div>
  );
}
