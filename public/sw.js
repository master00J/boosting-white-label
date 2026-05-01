const CACHE_NAME = "boostplatform-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "New message", body: event.data.text() };
  }

  const {
    title,
    body,
    url,
    icon,
    conversationId,
    senderName,
  } = payload;

  // Use conversationId as tag so multiple messages from the same conversation
  // collapse into ONE notification instead of flooding the tray.
  const tag = conversationId ? `chat-conv-${conversationId}` : "chat-new";

  // Build a deep-link URL to the specific conversation
  const targetUrl = url || (conversationId
    ? `/admin/chat?conversation=${conversationId}`
    : "/admin/chat");

  const notificationOptions = {
    body: body || "",
    icon: icon || "/icons/icon-192.png",
    // Badge must be a small monochrome PNG — SVG is not supported on Android
    badge: "/icons/icon-192.png",
    tag,
    // renotify: play sound/vibrate even when replacing an existing notification
    renotify: true,
    requireInteraction: false,
    silent: false,
    vibrate: [150, 75, 150],
    data: { url: targetUrl, conversationId },
    actions: [
      { action: "open", title: "Open chat" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title || "New message", notificationOptions)
  );
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Respect action buttons
  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/admin/chat";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a matching window is already open, navigate it
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          const siteOrigin = self.location.origin;
          if (clientUrl.origin === siteOrigin && "focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(targetUrl);
            return;
          }
        }
        // No open window — open a new one
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ── Notification close (dismissed by user) ───────────────────────────────────
self.addEventListener("notificationclose", () => {
  // No action needed, but required to ensure clean lifecycle
});
