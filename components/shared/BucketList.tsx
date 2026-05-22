import { createClient } from "@/lib/supabase/server";
import { BucketListClient } from "./BucketList.client";
import type { BucketItem } from "@/lib/supabase/database.types";

export async function BucketList({ coupleId }: { coupleId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bucket_items")
    .select("*")
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: false });
  return <BucketListClient initial={(data ?? []) as BucketItem[]} />;
}
