import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ThemeSwap } from "../them/ThemeSwap";
import { CoupleHero } from "@/components/shared/CoupleHero";
import { EventsWidget } from "@/components/shared/EventsWidget";
import { BucketList } from "@/components/shared/BucketList";
import { Memories } from "@/components/shared/Memories";
import { Anniversaries } from "@/components/shared/Anniversaries";
import { DecisionsLog } from "@/components/shared/DecisionsLog";
import { GiftIdeas } from "@/components/shared/GiftIdeas";
import { SurpriseSender } from "@/components/shared/SurpriseSender";
import type { Profile, Couple } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function SharedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: meRaw } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const me = meRaw as Profile | null;
  if (!me) redirect("/onboarding");

  if (!me.couple_id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ThemeSwap theme="shared" />
        <div className="surface p-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">Together</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tighter-display text-fg">No partner yet.</h1>
          <p className="mt-2 text-sm text-fg-muted">The Shared layer activates once you invite your partner.</p>
        </div>
      </div>
    );
  }

  const [{ data: partnerRaw }, { data: coupleRaw }, jointProjects, bucketDone, memoriesCount, decisionsCount] = await Promise.all([
    supabase.from("profiles").select("*").eq("couple_id", me.couple_id).neq("id", me.id).maybeSingle(),
    supabase.from("couples").select("*").eq("id", me.couple_id).single(),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("couple_id", me.couple_id).eq("is_shared", true).eq("status", "done"),
    supabase.from("bucket_items").select("id", { count: "exact", head: true }).eq("couple_id", me.couple_id).eq("status", "done"),
    supabase.from("memories").select("id", { count: "exact", head: true }).eq("couple_id", me.couple_id),
    supabase.from("decisions").select("id", { count: "exact", head: true }).eq("couple_id", me.couple_id),
  ]);

  const partner = partnerRaw as Profile | null;
  const couple = coupleRaw as Couple | null;

  if (!partner || !couple) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ThemeSwap theme="shared" />
        <div className="surface p-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">Waiting</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-fg">Your partner hasn't completed setup yet.</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ThemeSwap theme="shared" />
      <CoupleHero
        me={me}
        partner={partner}
        couple={couple}
        stats={{
          jointProjects: jointProjects.count ?? 0,
          bucketDone: bucketDone.count ?? 0,
          memories: memoriesCount.count ?? 0,
          decisions: decisionsCount.count ?? 0,
        }}
      />

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EventsWidget coupleId={couple.id} />
        <Anniversaries coupleId={couple.id} />
        <div className="lg:col-span-2"><BucketList coupleId={couple.id} /></div>
        <div className="lg:col-span-2"><Memories coupleId={couple.id} /></div>
        <DecisionsLog coupleId={couple.id} />
        <GiftIdeas partnerId={partner.id} partnerName={partner.display_name} />
        <div className="lg:col-span-2"><SurpriseSender partnerId={partner.id} partnerName={partner.display_name} /></div>
      </section>
    </div>
  );
}
