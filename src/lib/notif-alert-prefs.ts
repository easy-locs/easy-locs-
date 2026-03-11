/**
 * Notification alert preferences — stored in localStorage.
 * Controls browser notifications, sound, and vibration independently.
 */

const STORAGE_KEY = "el_notif_prefs";

export interface NotifAlertPrefs {
  browserNotifications: boolean;
  sound: boolean;
  vibration: boolean;
}

const DEFAULTS: NotifAlertPrefs = {
  browserNotifications: true,
  sound: true,
  vibration: true,
};

export function getNotifAlertPrefs(): NotifAlertPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setNotifAlertPrefs(prefs: Partial<NotifAlertPrefs>): NotifAlertPrefs {
  const current = getNotifAlertPrefs();
  const next = { ...current, ...prefs };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  // Dispatch custom event so other components can react
  window.dispatchEvent(new CustomEvent("notif-prefs-changed", { detail: next }));
  return next;
}

/**
 * Request browser notification permission.
 * Only asks if permission is "default" (not yet decided).
 */
export function requestNotificationPermission(): Promise<NotificationPermission | null> {
  if (!("Notification" in window)) return Promise.resolve(null);
  if (Notification.permission !== "default") return Promise.resolve(Notification.permission);
  return Notification.requestPermission();
}
