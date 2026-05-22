import { createClient } from "@/lib/supabase/server";
import { DailyChecklistClient } from "./DailyChecklist.client";
import type { ChecklistItem } from "@/lib/supabase/database.types";
import { format, addDays, subDays } from "date-fns";

export async function DailyChecklist({ userId, readOnly = false }: { userId: string; readOnly?: boolean }) {
  const supabase = await createClient();

  // Carry-over: pull yesterday's undone+carry_over items into today (only for own dashboard)
  if (!readOnly) {
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: stale } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("user_id", userId)
      .eq("date", yesterday)
      .eq("done", false)
      .eq("carry_over", true);
    if (stale && stale.length > 0) {
      // bump them to today (UPDATE, don't dupe)
      await supabase
        .from("checklist_items")
        .update({ date: today })
        .in("id", stale.map((s) => s.id));
    }
  }

  const start = format(subDays(new Date(), 0), "yyyy-MM-dd");
  const end = format(addDays(new Date(), 2), "yyyy-MM-dd");
  const { data: items } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end)
    .order("order_idx", { ascending: true })
    .order("created_at", { ascending: true });

  return <DailyChecklistClient initialItems={(items ?? []) as ChecklistItem[]} readOnly={readOnly} />;
}
