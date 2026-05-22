import { createClient } from "@/lib/supabase/server";
import { SurpriseSenderClient } from "./SurpriseSender.client";
import type { Surprise } from "@/lib/supabase/database.types";

export async function SurpriseSender({ partnerId, partnerName }: { partnerId: string; partnerName: string }) {
  const supabase = await createClient();
  // RLS automatically filters to ones I sent (or ones delivered to me — but for this widget we only show sent)
  const { data } = await supabase
    .from("surprises")
    .select("*")
    .eq("to_user_id", partnerId)
    .order("deliver_at", { ascending: true });
  return <SurpriseSenderClient initial={(data ?? []) as Surprise[]} partnerId={partnerId} partnerName={partnerName} />;
}
