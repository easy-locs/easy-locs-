import { db as supabase } from "@/services/db";
import { getMessaging, getToken, deleteToken } from "firebase/messaging";
import { firebaseApp } from "./firebase-config";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? "";

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
    const registration = await navigator.serviceWorker.ready;
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
}> {
  const platform =
    /iPhone|iPad|iPod/i.test(navigator.userAgent)
      ? "ios"
      : /Android/i.test(navigator.userAgent)
        ? "android"
        : "web";

  const token = await getFcmToken();

  if (!token) {
    console.warn("[push] No FCM token obtained — push notifications unavailable on this device/browser");
    return { token: null, platform, registered: false };
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (user && token) {
    try {
      await supabase.from("push_tokens").upsert(
        {
          user_id: user.id,
          token,
          platform,
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

  return { token, platform, registered: !!user };
}

export async function unregisterPushNotifications(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

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
