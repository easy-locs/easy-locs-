export const APP_EVENTS = {
  ORBIT_MESSAGE_SENT: "orbit:message_sent",
  ORBIT_MESSAGE_READ: "orbit:message_read",
  ORBIT_THREAD_UPDATED: "orbit:thread_updated",
  ORBIT_CALL_STARTED: "orbit:call_started",
  ORBIT_CALL_ENDED: "orbit:call_ended",

  WALLET_PAYMENT_SUCCESS: "wallet:payment_success",
  WALLET_PAYMENT_FAILED: "wallet:payment_failed",
  WALLET_BALANCE_UPDATED: "wallet:balance_updated",
  WALLET_QR_SCANNED: "wallet:qr_scanned",

  DASHBOARD_REFRESH: "dashboard:refresh",
  DASHBOARD_COUNTERS_REFRESH: "dashboard:counters_refresh",

  NOTIFICATIONS_REFRESH: "notifications:refresh",
  ME_REFRESH: "me:refresh",

  BROWSER_REPAIR_RUN_COMPLETED: "browser_repair:run_completed",
  BROWSER_REPAIR_ISSUE_FOUND: "browser_repair:issue_found",
  WATCHDOG_STATUS_CHANGED: "watchdog:status_changed",
} as const;

export type AppEventKey = (typeof APP_EVENTS)[keyof typeof APP_EVENTS];
