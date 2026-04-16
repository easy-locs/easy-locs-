import { db as supabase } from "@/services/db";
import { getMessaging, getToken, deleteToken } from "firebase/messaging";
import { firebaseApp } from "./firebase-config";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? "";

interface CapacitorWindow extends Window {
  Capacitor?: { isNativePlatform?: () => boolean };
}

function isNative(): boolean {
  return !!(window as unknown as CapacitorWindow).Capacitor?.isNativePlatform?.();
}

function isSafeNavigationUrl(url: string): boolean {
  if (url.startsWith("/")) return true;
  try {
    const parsed = new URL(url, window.location.origin);
    const allowedHosts = ["www.easy-locs.com", "app.easy-locs.com", window.location.hostname];
    return allowedHosts.includes(parsed.hostname);
  } catch {
    return false;
  }
}

type PushNotificationsPlugin = Awaited<typeof import("@capacitor/push-notifications")>["PushNotifications"];

async function acquireNativeToken(pn: PushNotificationsPlugin): Promise<string | null> {
  type ListenerHandle = { remove: () => Promise<void> };
  const handles: ListenerHandle[] = [];
  let resolved = false;

  return new Promise<string | null>(async (resolve) => {
    const cleanup = async () => {
      for (const h of handles) {
        try { await h.remove(); } catch {}
      }
    };

    const timeout = setTimeout(async () => {
      if (resolved) return;
      resolved = true;
      await cleanup();
      resolve(null);
    }, 10000);

    const regHandle = await pn.addListener("registration", async (tokenResult) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      await cleanup();
      resolve(tokenResult.value);
    });
    handles.push(regHandle);

    const errHandle = await pn.addListener("registrationError", async (err) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      await cleanup();
      console.warn("[push] Native registration error:", err);
      resolve(null);
    });
    handles.push(errHandle);
  });
}

async function getNativeToken(): Promise<string | null> {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== "granted") return null;

    await PushNotifications.register();

    await setupAndroidChannels();
    await registerNativeActionCategories();

    const token = await acquireNativeToken(PushNotifications);

    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("[push] Foreground notification:", notification.title);
    });

    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const actionId = action.actionId;

      if (actionId === "mark_read") {
        const threadId = action.notification.data?.thread_id;
        if (threadId) {
          console.log("[push] Mark read action for thread:", threadId);
        }
        return;
      }

      if (actionId === "reply") {
        const threadId = action.notification.data?.thread_id;
        if (threadId) {
          const replyUrl = `/orbit/thread/${threadId}`;
          window.location.href = replyUrl;
        }
        return;
      }

      const url = action.notification.data?.url || action.notification.data?.action_url;
      if (url && typeof url === "string" && isSafeNavigationUrl(url)) {
        window.location.href = url;
      }
    });

    return token;
  } catch (e) {
    console.warn("[push] Native push registration failed:", e);
    return null;
  }
}

async function setupAndroidChannels(): Promise<void> {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const channels: Array<{
      id: string;
      name: string;
      description: string;
      importance: 1 | 2 | 3 | 4 | 5;
      sound: string;
      vibration: boolean;
      visibility: -1 | 0 | 1;
    }> = [
      { id: "messages", name: "Messages", description: "Orbit chat messages", importance: 4, sound: "default", vibration: true, visibility: 1 },
      { id: "payments", name: "Payments", description: "Payment confirmations and alerts", importance: 4, sound: "default", vibration: true, visibility: 0 },
      { id: "alerts", name: "Alerts", description: "Important alerts and notifications", importance: 5, sound: "default", vibration: true, visibility: 1 },
      { id: "marketing", name: "Promotions", description: "Deals and promotions", importance: 2, sound: "default", vibration: false, visibility: 1 },
    ];

    for (const channel of channels) {
      try {
        await PushNotifications.createChannel(channel);
      } catch {}
    }
  } catch {}
}

async function registerNativeActionCategories(): Promise<void> {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const pn = PushNotifications as typeof PushNotifications & {
      registerActionTypes?: (opts: { types: Array<{ id: string; actions: Array<{ id: string; title: string; requiresAuthentication?: boolean; foreground?: boolean; destructive?: boolean; input?: boolean }> }> }) => Promise<void>;
    };

    if (typeof pn.registerActionTypes !== "function") return;

    await pn.registerActionTypes({
      types: [
        {
          id: "orbit_message",
          actions: [
            {
              id: "reply",
              title: "Reply",
              foreground: true,
              requiresAuthentication: false,
            },
            {
              id: "mark_read",
              title: "Mark Read",
              foreground: false,
              requiresAuthentication: false,
            },
          ],
        },
        {
          id: "payment_received",
          actions: [
            {
              id: "view_details",
              title: "View Details",
              foreground: true,
            },
          ],
        },
      ],
    });
  } catch (e) {
    console.warn("[push] Native action category registration failed:", e);
  }
}

async function getFcmToken(): Promise<string | null> {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    if (!VAPID_KEY) {
      console.warn("[push] VITE_FIREBASE_VAPID_KEY not configured");
      return null;
    }

    const messaging = getMessaging(firebaseApp);
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    await navigator.serviceWorker.ready;

    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
      appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
    };

    const worker = registration.active ?? registration.waiting ?? registration.installing;
    if (worker) {
      worker.postMessage({ type: "FIREBASE_CONFIG", config: firebaseConfig });
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    return token || null;
  } catch (e) {
    console.warn("[push] FCM token acquisition failed:", e);
    return null;
  }
}

export async function registerPushNotifications(): Promise<{
  token: string | null;
  platform: string;
  registered: boolean;
  native: boolean;
}> {
  const platform =
    /iPhone|iPad|iPod/i.test(navigator.userAgent)
      ? "ios"
      : /Android/i.test(navigator.userAgent)
        ? "android"
        : "web";

  let token: string | null = null;
  let native = false;

  if (isNative()) {
    token = await getNativeToken();
    native = !!token;
  }

  if (!token) {
    token = await getFcmToken();
  }

  if (!token) {
    console.warn("[push] No push token obtained — push notifications unavailable on this device/browser");
    return { token: null, platform, registered: false, native };
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (user && token) {
    try {
      await supabase.from("push_tokens").upsert(
        {
          user_id: user.id,
          token,
          platform: native ? `${platform}_native` : platform,
          device_name: navigator.userAgent.substring(0, 100),
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,token" }
      );
    } catch (e) {
      console.error("[push] Failed to upsert push token:", e);
    }
  }

  return { token, platform, registered: !!user, native };
}

export async function unregisterPushNotifications(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (isNative()) {
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      await PushNotifications.removeAllListeners();
    } catch {}
  }

  try {
    const messaging = getMessaging(firebaseApp);
    await deleteToken(messaging);
  } catch (e) {
    console.error("[push] Failed to delete FCM token:", e);
  }

  await supabase
    .from("push_tokens")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
}

export async function setBadgeCount(count: number): Promise<void> {
  if (!isNative()) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const pn = PushNotifications as typeof PushNotifications & { setBadgeCount?: (opts: { count: number }) => Promise<void> };
    if (typeof pn.setBadgeCount === "function") {
      await pn.setBadgeCount({ count });
    }
  } catch {}
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  eventType?: string
): Promise<void> {
  await supabase.functions.invoke("send-push-notification", {
    body: {
      user_id: userId,
      title,
      body,
      data: data ?? {},
      event_type: eventType ?? "general",
    },
  });
}
