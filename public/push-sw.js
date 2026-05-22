// Web Push handler for The System.
// next-pwa generates its own service worker; this is a tiny companion registered
// alongside for push events. (next-pwa doesn't include push handlers by default.)

self.addEventListener("push", (event) => {
  let data = { title: "The System", body: "", url: "/you" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_e) {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url },
      tag: data.tag,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/you";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
