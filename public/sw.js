self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || "/web-app-manifest-192x192.png",
      badge: data.badge || "/favicon-96x96.png",
      data: {
        notificationId: data.notificationId,
        url: data.url,
      },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(openNotificationUrl(event.notification.data?.url));
});

function getSafeAppUrl(rawUrl) {
  const fallback = new URL("/notifications", self.location.origin);

  if (typeof rawUrl !== "string") {
    return fallback.href;
  }

  try {
    const url = new URL(rawUrl, self.location.origin);
    if (url.origin !== self.location.origin) {
      return fallback.href;
    }
    return url.href;
  } catch {
    return fallback.href;
  }
}

async function openNotificationUrl(rawUrl) {
  const targetUrl = getSafeAppUrl(rawUrl);
  const windowClients = await clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of windowClients) {
    const clientUrl = new URL(client.url);
    if (clientUrl.origin === self.location.origin) {
      await client.navigate(targetUrl);
      return client.focus();
    }
  }

  return clients.openWindow(targetUrl);
}
