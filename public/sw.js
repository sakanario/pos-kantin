// Service worker notifikasi pesanan online (CR-005 Tahap 4). Hanya menangani push; tidak menyimpan cache.
self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {}
  e.waitUntil(
    self.registration.showNotification(d.title || "Pesanan baru", {
      body: d.body || "",
      tag: d.tag,
      renotify: !!d.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: d.url || "/pesanan" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "/pesanan", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && "focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
