self.addEventListener("push", (event) => {
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || "tempo";
  const options = {
    body: data.body || "Du har en ny påminnelse.",
    tag: data.tag || "tempo-notification",
    data: {
      url: data.url || "/",
    },
    actions: data.actions || [],
    badge: "/icon.svg",
    icon: "/icon.svg",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = new URL(event.notification.data?.url || "/", self.location.origin);

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === url.origin);

    if (existing) {
      await existing.focus();
      existing.navigate(url.href);
      return;
    }

    await clients.openWindow(url.href);
  })());
});
