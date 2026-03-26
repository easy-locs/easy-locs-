/**
 * Unified notification dispatcher — DEPRECATED.
 * Replaced by notifications_v2 realtime in notificationV2Store.
 * Kept as no-op to avoid import errors during migration.
 */

export function startUnifiedNotificationDispatcher(_userId: string) {
  console.log("[dispatcher] DEPRECATED — use notificationV2Store.startRealtime() instead");
}

export function stopUnifiedNotificationDispatcher() {
  // no-op
}
