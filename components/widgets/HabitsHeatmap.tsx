import { createClient } from "@/lib/supabase/server";
import { HabitsHeatmapClient } from "./HabitsHeatmap.client";
import { subDays, format } from "date-fns";
import type { Habit, HabitEntry } from "@/lib/supabase/database.types";

export async function HabitsHeatmap({ userId, readOnly = false }: { userId: string; readOnly?: boolean }) {
  const supabase = await createClient();

  const { data: habits } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("order_idx", { ascending: true });

  const habitIds = (habits ?? []).map((h) => h.id);
  let entries: HabitEntry[] = [];
  if (habitIds.length > 0) {
    const cutoff = format(subDays(new Date(), 380), "yyyy-MM-dd");
    const { data } = await supabase
      .from("habit_entries")
      .select("*")
      .in("habit_id", habitIds)
      .gte("date", cutoff);
    entries = data ?? [];
  }

  return (
    <HabitsHeatmapClient
      initialHabits={(habits ?? []) as Habit[]}
      initialEntries={entries}
      readOnly={readOnly}
    />
  );
}
