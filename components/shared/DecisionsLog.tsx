import { createClient } from "@/lib/supabase/server";
import { DecisionsLogClient } from "./DecisionsLog.client";
import type { Decision } from "@/lib/supabase/database.types";

export async function DecisionsLog({ coupleId }: { coupleId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("decisions")
    .select("*")
    .eq("couple_id", coupleId)
    .order("decided_at", { ascending: false })
    .limit(100);
  return <DecisionsLogClient initial={(data ?? []) as Decision[]} />;
}
