import { createClient } from "@/lib/supabase/server";
import { GiftIdeasClient } from "./GiftIdeas.client";
import type { GiftIdea } from "@/lib/supabase/database.types";

export async function GiftIdeas({ partnerId, partnerName }: { partnerId: string; partnerName: string }) {
  const supabase = await createClient();
  // RLS automatically scopes to by_user_id = auth.uid(), so we ONLY get ideas the caller has saved
  const { data } = await supabase
    .from("gift_ideas")
    .select("*")
    .eq("for_user_id", partnerId)
    .order("created_at", { ascending: false });
  return <GiftIdeasClient initial={(data ?? []) as GiftIdea[]} partnerId={partnerId} partnerName={partnerName} />;
}
