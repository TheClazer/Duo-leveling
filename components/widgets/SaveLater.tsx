import { createClient } from "@/lib/supabase/server";
import { SaveLaterClient } from "./SaveLater.client";
import type { SaveLater as SaveLaterRow } from "@/lib/supabase/database.types";

export async function SaveLater({ userId, readOnly = false }: { userId: string; readOnly?: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("save_later")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);
  return <SaveLaterClient initial={(data ?? []) as SaveLaterRow[]} readOnly={readOnly} />;
}
