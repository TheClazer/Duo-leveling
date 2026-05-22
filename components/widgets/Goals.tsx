import { createClient } from "@/lib/supabase/server";
import { GoalsClient } from "./Goals.client";
import type { Goal, Milestone } from "@/lib/supabase/database.types";

export async function Goals({ userId, readOnly = false }: { userId: string; readOnly?: boolean }) {
  const supabase = await createClient();
  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const goalIds = (goals ?? []).map((g) => g.id);
  let milestones: Milestone[] = [];
  if (goalIds.length > 0) {
    const { data } = await supabase
      .from("milestones")
      .select("*")
      .in("goal_id", goalIds)
      .order("order_idx", { ascending: true });
    milestones = data ?? [];
  }

  return (
    <GoalsClient
      initialGoals={(goals ?? []) as Goal[]}
      initialMilestones={milestones}
      readOnly={readOnly}
    />
  );
}
