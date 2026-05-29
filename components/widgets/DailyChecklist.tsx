import { createClient } from "@/lib/supabase/server";
import { DailyChecklistClient } from "./DailyChecklist.client";
import type { ChecklistItem } from "@/lib/supabase/database.types";
import { istDateString, istDateStringOffset } from "@/lib/date";

export async function DailyChecklist({ userId, readOnly = false }: { userId: string; readOnly?: boolean }) {
  const supabase = await createClient();

  // Carry-over: pull yesterday's undone+carry_over items into today (only for own dashboard)
  if (!readOnly) {
    const yesterday = istDateStringOffset(-1);
    const today = istDateString();
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

  const start = istDateString();
  const end = istDateStringOffset(2);
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
