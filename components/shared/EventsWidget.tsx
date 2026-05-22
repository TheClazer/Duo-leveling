import { createClient } from "@/lib/supabase/server";
import { EventsWidgetClient } from "./EventsWidget.client";
import type { EventRow } from "@/lib/supabase/database.types";

export async function EventsWidget({ coupleId }: { coupleId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("couple_id", coupleId)
    .gte("datetime", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("datetime", { ascending: true })
    .limit(20);
  return <EventsWidgetClient initial={(data ?? []) as EventRow[]} />;
}
