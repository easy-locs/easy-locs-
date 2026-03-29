/**
 * FAMILY: NOTIFICATIONS — Canonical notification management.
 * Single source of truth for all in-app notification types.
 *
 * All modules MUST import notification logic from this family.
 */

// ── Notification center hook ──
export { useNotificationsCenter } from "@/hooks/useNotificationsCenter";

// ── Notification store ──
export { useNotificationV2Store } from "@/stores/notificationV2Store";

// ── Notification dispatcher ──
export { sendInAppNotification } from "@/lib/notifications/notification-dispatcher";

// ── Repository ──
export {
  createNotification,
  type NotificationPayload,
} from "@/repositories/notifications.repository";

// ── Device Bridge ──
export { NotificationDeviceBridge, useNotificationPreferences } from "./notification-device-bridge";
export type { NotificationChannel, NotificationPriority } from "./notification-device-bridge";

// Notifications family owns: in-app notifications, message/call/wallet/order/system
// notifications, preference handling, badge counts, device bridge, quiet hours.
