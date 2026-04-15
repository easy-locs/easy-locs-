importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

let firebaseInitialized = false;

function initFirebase(config) {
  if (firebaseInitialized) return;
  if (!config?.apiKey) return;

  try {
    firebase.initializeApp(config);
    firebaseInitialized = true;

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const notification = payload.notification ?? {};
      const data = payload.data ?? {};

      const title = notification.title ?? data.title ?? "New notification";
      const body = notification.body ?? data.body ?? "";

      const rawUrl = data.action_url ?? data.deep_link ?? "/";
      const clickUrl = isSafeUrl(rawUrl) ? rawUrl : "/";

      const options = {
        body,
        icon: "/pwa-192x192.png",
        badge: "/favicon-32x32.png",
        tag: data.dedupe_key ?? data.event_type ?? "default",
        data: {
          url: clickUrl,
          event_type: data.event_type ?? "general",
        },
        actions: clickUrl !== "/"
          ? [{ action: "open", title: "View" }]
          : [],
      };

      self.registration.showNotification(title, options);
    });
  } catch (e) {
    console.error("[firebase-messaging-sw] init error:", e);
  }
}

function isSafeUrl(url) {
  if (!url) return false;
  if (url.startsWith("/")) return true;
  try {
    const parsed = new URL(url, self.location.origin);
    return parsed.origin === self.location.origin;
  } catch {
    return false;
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "FIREBASE_CONFIG") {
    self.__fcmConfig = event.data.config;
    initFirebase(event.data.config);
  }
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
  if (self.__fcmConfig && !firebaseInitialized) {
    initFirebase(self.__fcmConfig);
  }
});

self.addEventListener("push", (event) => {
  if (firebaseInitialized) return;

  try {
    const data = event.data?.json() ?? {};
    const notification = data.notification ?? {};
    const payload = data.data ?? {};

    const title = notification.title ?? payload.title ?? "Notification";
    const body = notification.body ?? payload.body ?? "";

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: "/pwa-192x192.png",
        badge: "/favicon-32x32.png",
        tag: payload.event_type ?? "default",
        data: {
          url: isSafeUrl(payload.action_url) ? payload.action_url : "/",
          event_type: payload.event_type ?? "general",
        },
      })
    );
  } catch (e) {
    console.error("[firebase-messaging-sw] push fallback error:", e);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url ?? "/";
  const url = isSafeUrl(rawUrl) ? rawUrl : "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        return clients.openWindow(url);
      })
  );
});
