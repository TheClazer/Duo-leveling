import { createClient } from "@/lib/supabase/server";
import { MemoriesClient } from "./Memories.client";
import type { Memory } from "@/lib/supabase/database.types";

export async function Memories({ coupleId }: { coupleId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memories")
    .select("*")
    .eq("couple_id", coupleId)
    .order("date_of_memory", { ascending: false })
    .limit(60);
  return <MemoriesClient initial={(data ?? []) as Memory[]} />;
}
