export const CANONICAL_APP_EVENTS = {
  APP_BOOTSTRAPPED: "app:bootstrapped",
  APP_READY: "app:ready",

  ORBIT_THREAD_SELECTED: "orbit:thread_selected",
  ORBIT_MESSAGE_SENT: "orbit:message_sent",
  ORBIT_MESSAGE_RECEIVED: "orbit:message_received",
  ORBIT_MESSAGE_READ: "orbit:message_read",
  ORBIT_CALL_STARTED: "orbit:call_started",
  ORBIT_CALL_ENDED: "orbit:call_ended",

  WALLET_PAYMENT_SUCCESS: "wallet:payment_success",
  WALLET_PAYMENT_FAILED: "wallet:payment_failed",
  WALLET_BALANCE_UPDATED: "wallet:balance_updated",
  WALLET_QR_SCANNED: "wallet:qr_scanned",
  WALLET_POS_UPDATED: "wallet:pos_updated",

  RADAR_ENTITY_SELECTED: "radar:entity_selected",
  RADAR_VIEW_CHANGED: "radar:view_changed",
  RADAR_GEO_UPDATED: "radar:geo_updated",

  DASHBOARD_REFRESH: "dashboard:refresh",
  DASHBOARD_COUNTERS_REFRESH: "dashboard:counters_refresh",

  NOTIFICATIONS_REFRESH: "notifications:refresh",
  ME_REFRESH: "me:refresh",

  WATCHDOG_ALERT: "watchdog:alert",
  BROWSER_REPAIR_COMPLETED: "browser_repair:completed",
} as const;

export type CanonicalAppEvent =
  (typeof CANONICAL_APP_EVENTS)[keyof typeof CANONICAL_APP_EVENTS];
