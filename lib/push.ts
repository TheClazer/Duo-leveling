// Web Push helper. Sends to all of a user's subscribed devices.
// Requires VAPID keys in env (see SETUP.md §"Push notifications").

import { createServiceClient } from "@/lib/supabase/server";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
};

let webpush: typeof import("web-push") | null = null;
async function getWebPush() {
  if (!webpush) {
    // Lazy import so dev builds don't fail when web-push isn't installed yet.
    webpush = await import("web-push").catch(() => null);
    if (webpush && process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT ?? "mailto:noreply@example.com",
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
    }
  }
  return webpush;
}

export async function sendPush(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
  const wp = await getWebPush();
  if (!wp) return { sent: 0, failed: 0 };

  const admin = createServiceClient();
  const { data } = await admin.from("push_subscriptions").select("*").eq("user_id", userId);
  const subs = (data ?? []) as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>;

  let sent = 0, failed = 0;
  for (const s of subs) {
    try {
      await wp.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (err: unknown) {
      failed++;
      // 404/410 = subscription expired or unsubscribed
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", s.id);
      }
    }
  }
  return { sent, failed };
}
