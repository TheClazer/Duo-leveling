import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireCron } from "@/lib/cron";
import { sendPush } from "@/lib/push";

// Runs every 10 minutes. Marks any due surprises as delivered and pushes
// a notification to the recipient.
export async function GET(request: Request) {
  const denied = requireCron(request);
  if (denied) return denied;

  const admin = createServiceClient();
  const { data: due } = await admin
    .from("surprises")
    .select("*")
    .eq("delivered", false)
    .lte("deliver_at", new Date().toISOString())
    .limit(50);

  type DueSurprise = { id: string; from_user_id: string; to_user_id: string; content: string | null };
  const rows = (due ?? []) as DueSurprise[];
  let delivered = 0;

  for (const s of rows) {
    await admin.from("surprises").update({ delivered: true }).eq("id", s.id);
    delivered++;
    // get sender name for push body
    const { data: senderRaw } = await admin.from("profiles").select("*").eq("id", s.from_user_id).single();
    const senderName = (senderRaw as { display_name?: string } | null)?.display_name ?? "Someone";
    await sendPush(s.to_user_id, {
      title: `A surprise from ${senderName}`,
      body: s.content?.slice(0, 80) ?? "Tap to open.",
      url: "/shared",
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, delivered });
}
