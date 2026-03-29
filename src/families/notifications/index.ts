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
  fetchNotifications,
  markNotificationRead,
  dismissNotification,
} from "@/repositories/notifications.repository";

// Notifications family owns: in-app notifications, message/call/wallet/order/system
// notifications, preference handling, badge counts
