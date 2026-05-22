import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireCron } from "@/lib/cron";
import { sendPush } from "@/lib/push";
import { addYears, addMonths, isAfter, parseISO, differenceInCalendarDays } from "date-fns";

type RecurringType = "anniversary" | "birthday" | "monthly" | "custom";
type R = { id: string; couple_id: string; title: string; anchor_date: string; type: RecurringType; reminder_days_before: number };

function nextOccurrence(anchor: string, type: RecurringType): Date {
  const a = parseISO(anchor);
  const now = new Date();
  if (type === "monthly") {
    let next = new Date(now.getFullYear(), now.getMonth(), a.getDate());
    if (!isAfter(next, now)) next = addMonths(next, 1);
    return next;
  }
  let next = new Date(now.getFullYear(), a.getMonth(), a.getDate());
  if (!isAfter(next, now)) next = addYears(next, 1);
  return next;
}

// 08:00 daily. Push reminders for anchor dates N days out (or on the day).
export async function GET(request: Request) {
  const denied = requireCron(request);
  if (denied) return denied;

  const admin = createServiceClient();
  const { data: rows } = await admin.from("recurring_dates").select("*");
  let sent = 0;

  for (const r of (rows ?? []) as R[]) {
    const next = nextOccurrence(r.anchor_date, r.type);
    const days = differenceInCalendarDays(next, new Date());
    if (days !== r.reminder_days_before && days !== 0) continue;

    const { data: members } = await admin.from("profiles").select("*").eq("couple_id", r.couple_id);
    for (const m of (members ?? []) as Array<{ id: string }>) {
      await sendPush(m.id, {
        title: days === 0 ? `Today: ${r.title}` : `${r.title} in ${days}d`,
        body: r.type === "anniversary" ? "An anchor date approaches." : r.title,
        url: "/shared",
      }).catch(() => {});
      sent++;
    }
  }

  return NextResponse.json({ ok: true, sent });
}
