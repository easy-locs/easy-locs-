/**
 * APP_EVENTS — Single canonical event constant file.
 * ALL event listeners and emitters MUST use this file.
 * Notation: colon (e.g. "orbit:message_sent").
 * 
 * Replaces the former CANONICAL_APP_EVENTS (deleted — was identical).
 */
export const APP_EVENTS = {
  // App lifecycle
  APP_BOOTSTRAPPED: "app:bootstrapped",
  APP_READY: "app:ready",

  // Orbit / Communication
  ORBIT_THREAD_SELECTED: "orbit:thread_selected",
  ORBIT_MESSAGE_SENT: "orbit:message_sent",
  ORBIT_MESSAGE_RECEIVED: "orbit:message_received",
  ORBIT_MESSAGE_READ: "orbit:message_read",
  ORBIT_THREAD_UPDATED: "orbit:thread_updated",
  ORBIT_CALL_STARTED: "orbit:call_started",
  ORBIT_CALL_ENDED: "orbit:call_ended",

  // Wallet
  WALLET_PAYMENT_SUCCESS: "wallet:payment_success",
  WALLET_PAYMENT_FAILED: "wallet:payment_failed",
  WALLET_BALANCE_UPDATED: "wallet:balance_updated",
  WALLET_QR_SCANNED: "wallet:qr_scanned",
  WALLET_POS_UPDATED: "wallet:pos_updated",

  // Radar
  RADAR_ENTITY_SELECTED: "radar:entity_selected",
  RADAR_VIEW_CHANGED: "radar:view_changed",
  RADAR_GEO_UPDATED: "radar:geo_updated",

  // Dashboard
  DASHBOARD_REFRESH: "dashboard:refresh",
  DASHBOARD_COUNTERS_REFRESH: "dashboard:counters_refresh",

  // System
  NOTIFICATIONS_REFRESH: "notifications:refresh",
  ME_REFRESH: "me:refresh",

  // Watchdog / Repair
  WATCHDOG_ALERT: "watchdog:alert",
  WATCHDOG_STATUS_CHANGED: "watchdog:status_changed",
  BROWSER_REPAIR_RUN_COMPLETED: "browser_repair:run_completed",
  BROWSER_REPAIR_ISSUE_FOUND: "browser_repair:issue_found",
  BROWSER_REPAIR_COMPLETED: "browser_repair:completed",
} as const;

export type AppEventKey = (typeof APP_EVENTS)[keyof typeof APP_EVENTS];
