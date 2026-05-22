import { createClient } from "@/lib/supabase/server";
import { JournalClient } from "./Journal.client";
import type { Note } from "@/lib/supabase/database.types";

export async function Journal({ userId, readOnly = false }: { userId: string; readOnly?: boolean }) {
  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);

  return <JournalClient initialNotes={(notes ?? []) as Note[]} readOnly={readOnly} />;
}
