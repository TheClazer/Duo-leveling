"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Url = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Url);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushPrompt() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "serviceWorker" in navigator && "PushManager" in window;
    setSupported(ok);
    if (ok) {
      setPermission(Notification.permission);
      navigator.serviceWorker.getRegistration("/push-sw.js").then((reg) => {
        reg?.pushManager.getSubscription().then((s) => setSubscribed(!!s));
      });
    }
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!pubKey) {
        alert("VAPID public key not configured. See SETUP.md §Push notifications.");
        return;
      }
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;
      const reg = await navigator.serviceWorker.register("/push-sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pubKey) as BufferSource,
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
      });
      setSubscribed(true);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;
  if (subscribed === null) return null;

  return subscribed ? (
    <Button size="sm" variant="ghost" onClick={disable} disabled={busy}>
      <BellOff className="mr-1 h-3.5 w-3.5" /> Disable notifications
    </Button>
  ) : (
    <Button size="sm" variant="outline" onClick={enable} disabled={busy || permission === "denied"}>
      <Bell className="mr-1 h-3.5 w-3.5" /> {permission === "denied" ? "Notifications blocked" : "Enable notifications"}
    </Button>
  );
}
