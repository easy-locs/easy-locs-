/**
 * Notification alert preferences — stored in localStorage.
 * Controls browser notifications, sound, vibration, and per-type alerts.
 */

const STORAGE_KEY = "el_notif_prefs";

/** Per-notification-type alert control */
export interface NotifTypeAlerts {
  messages: boolean;
  bookings: boolean;
  payments: boolean;
  documents: boolean;
  maintenance: boolean;
}

export interface NotifAlertPrefs {
  browserNotifications: boolean;
  sound: boolean;
  vibration: boolean;
  /** Per-type alert overrides — if a type is false, no sound/vibration/browser for it */
  typeAlerts: NotifTypeAlerts;
}

const DEFAULT_TYPE_ALERTS: NotifTypeAlerts = {
  messages: true,
  bookings: true,
  payments: true,
  documents: true,
  maintenance: true,
};

const DEFAULTS: NotifAlertPrefs = {
  browserNotifications: true,
  sound: true,
  vibration: true,
  typeAlerts: { ...DEFAULT_TYPE_ALERTS },
};

export function getNotifAlertPrefs(): NotifAlertPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS, typeAlerts: { ...DEFAULT_TYPE_ALERTS } };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...parsed,
      typeAlerts: { ...DEFAULT_TYPE_ALERTS, ...parsed.typeAlerts },
    };
  } catch {
    return { ...DEFAULTS, typeAlerts: { ...DEFAULT_TYPE_ALERTS } };
  }
}

export function setNotifAlertPrefs(prefs: Partial<NotifAlertPrefs>): NotifAlertPrefs {
  const current = getNotifAlertPrefs();
  const next: NotifAlertPrefs = {
    ...current,
    ...prefs,
    typeAlerts: prefs.typeAlerts
      ? { ...current.typeAlerts, ...prefs.typeAlerts }
      : current.typeAlerts,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("notif-prefs-changed", { detail: next }));
  return next;
}

/**
 * Map a notification's type/metadata to a NotifTypeAlerts key.
 */
export function resolveNotifCategory(n: { type?: string; metadata_json?: any }): keyof NotifTypeAlerts {
  const meta = n.metadata_json;
  const targetType = meta?.target_type as string | undefined;

  // Booking types
  if (targetType === "marketplace_booking" || targetType === "concierge_order" || targetType === "booking_request") return "bookings";
  if (n.type === "request") return "bookings";

  // Payment
  if (n.type === "payment" || targetType === "payment" || n.type === "receipt" || targetType === "receipt") return "payments";

  // Document
  if (n.type === "document" || targetType === "document" || targetType === "lease" || n.type === "dunning" || targetType === "dunning") return "documents";

  // Maintenance
  if (targetType === "intervention" || targetType === "expense") return "maintenance";

  // Messages
  if (n.type === "message" || targetType === "message") return "messages";

  // Default to messages for info type
  return "messages";
}

/**
 * Request browser notification permission.
 */
export function requestNotificationPermission(): Promise<NotificationPermission | null> {
  if (!("Notification" in window)) return Promise.resolve(null);
  if (Notification.permission !== "default") return Promise.resolve(Notification.permission);
  return Notification.requestPermission();
}
