/**
 * Unified notification dispatcher — DEPRECATED.
 * Replaced by notifications_v2 realtime in notification.store (useNotificationStore).
 * Kept as no-op to avoid import errors during migration.
 */

export function startUnifiedNotificationDispatcher(_userId: string) {
  console.log("[dispatcher] DEPRECATED — use notification.store useNotificationStore.startRealtime() instead");
}

export function stopUnifiedNotificationDispatcher() {
  // no-op
}
