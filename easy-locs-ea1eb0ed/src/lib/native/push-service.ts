export interface PushToken {
  value: string;
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

type PushCallback = (notification: PushNotification) => void;

let registrationCallbacks: Array<(token: PushToken) => void> = [];
let notificationCallbacks: PushCallback[] = [];
let actionCallbacks: PushCallback[] = [];

export async function registerPushNotifications(): Promise<PushToken | null> {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive !== "granted") {
      const requestResult = await PushNotifications.requestPermissions();
      if (requestResult.receive !== "granted") {
        return null;
      }
    }

    return new Promise((resolve) => {
      PushNotifications.addListener("registration", (token) => {
        const pushToken: PushToken = { value: token.value };
        registrationCallbacks.forEach((cb) => cb(pushToken));
        resolve(pushToken);
      });

      PushNotifications.addListener("registrationError", (error) => {
        console.error("[Push] Registration error:", error);
        resolve(null);
      });

      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        const pushNotif: PushNotification = {
          id: notification.id ?? crypto.randomUUID(),
          title: notification.title ?? "",
          body: notification.body ?? "",
          data: notification.data,
        };
        notificationCallbacks.forEach((cb) => cb(pushNotif));
      });

      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const pushNotif: PushNotification = {
          id: action.notification.id ?? crypto.randomUUID(),
          title: action.notification.title ?? "",
          body: action.notification.body ?? "",
          data: action.notification.data,
        };
        actionCallbacks.forEach((cb) => cb(pushNotif));
      });

      PushNotifications.register();
    });
  } catch (err) {
    console.debug("[push] Capacitor push unavailable, using Web Push:", err instanceof Error ? err.message : err);
    return fallbackWebPush();
  }
}

async function fallbackWebPush(): Promise<PushToken | null> {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
    });
    return { value: JSON.stringify(subscription.toJSON()) };
  } catch (err) {
    console.debug("[push] Web Push unavailable:", err instanceof Error ? err.message : err);
    return null;
  }
}

export function onPushRegistration(callback: (token: PushToken) => void): () => void {
  registrationCallbacks.push(callback);
  return () => {
    registrationCallbacks = registrationCallbacks.filter((cb) => cb !== callback);
  };
}

export function onPushNotificationReceived(callback: PushCallback): () => void {
  notificationCallbacks.push(callback);
  return () => {
    notificationCallbacks = notificationCallbacks.filter((cb) => cb !== callback);
  };
}

export function onPushNotificationAction(callback: PushCallback): () => void {
  actionCallbacks.push(callback);
  return () => {
    actionCallbacks = actionCallbacks.filter((cb) => cb !== callback);
  };
}

export async function getDeliveredNotifications(): Promise<PushNotification[]> {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const result = await PushNotifications.getDeliveredNotifications();
    return result.notifications.map((n) => ({
      id: n.id ?? "",
      title: n.title ?? "",
      body: n.body ?? "",
      data: n.data,
    }));
  } catch (err) {
    console.debug("[push] getDeliveredNotifications unavailable:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function removeDeliveredNotifications(ids: string[]): Promise<void> {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.removeDeliveredNotifications({
      notifications: ids.map((id) => ({ id, title: "", body: "" })),
    });
  } catch (err) {
    console.debug("[push] removeDeliveredNotifications unavailable:", err instanceof Error ? err.message : err);
  }
}
