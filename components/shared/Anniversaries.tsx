import { createClient } from "@/lib/supabase/server";
import { AnniversariesClient } from "./Anniversaries.client";
import type { RecurringDate } from "@/lib/supabase/database.types";

export async function Anniversaries({ coupleId }: { coupleId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recurring_dates")
    .select("*")
    .eq("couple_id", coupleId)
    .order("anchor_date", { ascending: true });
  return <AnniversariesClient initial={(data ?? []) as RecurringDate[]} />;
}
