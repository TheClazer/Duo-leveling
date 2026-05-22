import { createClient } from "@/lib/supabase/server";
import { LeetcodeClient } from "./Leetcode.client";
import type { LeetcodeProfile } from "@/lib/supabase/database.types";

export async function Leetcode({ userId, readOnly = false }: { userId: string; readOnly?: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase.from("leetcode_profiles").select("*").eq("user_id", userId).maybeSingle();
  const profile = data as LeetcodeProfile | null;
  return <LeetcodeClient initial={profile} readOnly={readOnly} />;
}
