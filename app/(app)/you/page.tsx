import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CharacterHero } from "@/components/theme/CharacterHero";
import { InvitePartnerCard } from "./InvitePartnerCard";
import { HabitsHeatmap } from "@/components/widgets/HabitsHeatmap";
import { Goals } from "@/components/widgets/Goals";
import { DailyChecklist } from "@/components/widgets/DailyChecklist";
import { Journal } from "@/components/widgets/Journal";
import { ActiveProjects } from "@/components/widgets/ActiveProjects";
import { Leetcode } from "@/components/widgets/Leetcode";
import { Github } from "@/components/widgets/Github";
import { SaveLater } from "@/components/widgets/SaveLater";
import { Achievements } from "@/components/widgets/Achievements";
import { BentoGrid, type BentoItem } from "@/components/layout/BentoGrid";
import type { LayoutItem, Profile } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

const DEFAULT_LAYOUT: BentoItem["defaultLayout"][] = [
  { x: 0, y: 0,  w: 2, h: 5, minW: 2, minH: 3 },   // active projects
  { x: 2, y: 0,  w: 4, h: 5, minW: 3, minH: 4 },   // habits
  { x: 0, y: 5,  w: 3, h: 6, minW: 2, minH: 4 },   // checklist
  { x: 3, y: 5,  w: 3, h: 6, minW: 2, minH: 4 },   // goals
  { x: 0, y: 11, w: 3, h: 6, minW: 2, minH: 4 },   // leetcode
  { x: 3, y: 11, w: 3, h: 6, minW: 2, minH: 4 },   // github
  { x: 0, y: 17, w: 3, h: 7, minW: 2, minH: 4 },   // save later
  { x: 3, y: 17, w: 3, h: 7, minW: 2, minH: 4 },   // journal
  { x: 0, y: 24, w: 6, h: 6, minW: 3, minH: 4 },   // achievements
];

export default async function YouPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRaw } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileRaw as Profile | null;
  if (!profile) redirect("/onboarding");

  const { data: layoutRow } = await supabase
    .from("dashboard_layouts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const storedLayout = ((layoutRow as { layout?: LayoutItem[] } | null)?.layout ?? []) as LayoutItem[];

  const items: BentoItem[] = [
    { id: "projects",  defaultLayout: DEFAULT_LAYOUT[0], children: <ActiveProjects userId={user.id} /> },
    { id: "habits",    defaultLayout: DEFAULT_LAYOUT[1], children: <HabitsHeatmap userId={user.id} /> },
    { id: "checklist", defaultLayout: DEFAULT_LAYOUT[2], children: <DailyChecklist userId={user.id} /> },
    { id: "goals",     defaultLayout: DEFAULT_LAYOUT[3], children: <Goals userId={user.id} /> },
    { id: "leetcode",  defaultLayout: DEFAULT_LAYOUT[4], children: <Leetcode userId={user.id} /> },
    { id: "github",    defaultLayout: DEFAULT_LAYOUT[5], children: <Github userId={user.id} /> },
    { id: "savelater",    defaultLayout: DEFAULT_LAYOUT[6], children: <SaveLater userId={user.id} /> },
    { id: "journal",      defaultLayout: DEFAULT_LAYOUT[7], children: <Journal userId={user.id} /> },
    { id: "achievements", defaultLayout: DEFAULT_LAYOUT[8], children: <Achievements userId={user.id} /> },
  ];

  return (
    <div className="relative">
      <CharacterHero profile={profile} />

      <section className="mx-auto max-w-6xl px-4 pb-12">
        {!profile.couple_id && (
          <div className="mt-2 mb-4">
            <InvitePartnerCard />
          </div>
        )}

        <BentoGrid items={items} initialLayout={storedLayout} />
      </section>
    </div>
  );
}
