import { createClient } from "@/lib/supabase/server";
import { AchievementsClient } from "./Achievements.client";
import type { Achievement } from "@/lib/supabase/database.types";

export async function Achievements({ userId, readOnly = false }: { userId: string; readOnly?: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("achievements")
    .select("*")
    .eq("user_id", userId)
    .order("pinned", { ascending: false })
    .order("unlocked_at", { ascending: false });
  return <AchievementsClient initial={(data ?? []) as Achievement[]} readOnly={readOnly} />;
}
