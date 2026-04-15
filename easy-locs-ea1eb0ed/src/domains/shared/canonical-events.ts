/**
 * CANONICAL EVENT TAXONOMY — Single source of truth for all domain events.
 *
 * Rules:
 * 1. All events use colon:notation (e.g. "wallet:payment_success")
 * 2. Format: domain:entity_action
 * 3. Cross-domain communication ONLY via platformBus
 * 4. No direct imports between domains
 */

export const CANONICAL_EVENTS = {
  AUTH_READY: "auth:ready",
  AUTH_LOGOUT: "auth:logout",

  PROFILE_LOADED: "me:profile_loaded",
  PROFILE_UPDATED: "me:profile_updated",
  PREFERENCES_UPDATED: "me:preferences_updated",
  PERMISSIONS_CHANGED: "me:permissions_changed",

  CONVERSATION_CREATED: "orbit:conversation_created",
  MESSAGE_SENT: "orbit:message_sent",
  MESSAGE_RECEIVED: "orbit:message_received",
  MESSAGE_DELIVERED: "orbit:message_delivered",
  MESSAGE_READ: "orbit:message_read",
  MESSAGE_FAILED: "orbit:message_failed",
  MESSAGE_RECONCILED: "orbit:message_reconciled",
  CALL_STARTED: "orbit:call_started",
  CALL_ENDED: "orbit:call_ended",
  CALL_MISSED: "orbit:call_missed",
  PRESENCE_CHANGED: "orbit:presence_changed",
  TYPING_STARTED: "orbit:typing_started",
  TYPING_STOPPED: "orbit:typing_stopped",

  WALLET_LOADED: "wallet:loaded",
  WALLET_BALANCE_UPDATED: "wallet:balance_updated",
  WALLET_TRANSACTION_CREATED: "wallet:transaction_created",
  WALLET_PAYMENT_SUCCESS: "wallet:payment_success",
  WALLET_PAYMENT_FAILED: "wallet:payment_failed",
  WALLET_TRANSFER_SENT: "wallet:transfer_sent",
  WALLET_TRANSFER_RECEIVED: "wallet:transfer_received",
  WALLET_ESCROW_LOCKED: "wallet:escrow_locked",
  WALLET_ESCROW_RELEASED: "wallet:escrow_released",
  WALLET_TOPUP_COMPLETED: "wallet:topup_completed",

  LISTING_PUBLISHED: "marketplace:listing_published",
  LISTING_PAUSED: "marketplace:listing_paused",
  BOOKING_CREATED: "marketplace:booking_created",
  BOOKING_CONFIRMED: "marketplace:booking_confirmed",
  BOOKING_CANCELLED: "marketplace:booking_cancelled",
  BOOKING_COMPLETED: "marketplace:booking_completed",
  REVIEW_SUBMITTED: "marketplace:review_submitted",

  ORDER_CREATED: "order:created",
  ORDER_ACCEPTED: "order:accepted",
  ORDER_READY: "order:ready",
  ORDER_ASSIGNED: "order:assigned",
  ORDER_DELIVERED: "order:delivered",
  ORDER_CANCELLED: "order:cancelled",
  ORDER_FAILED: "order:failed",

  DRIVER_ASSIGNED: "delivery:driver_assigned",
  DRIVER_EN_ROUTE: "delivery:driver_en_route",
  DRIVER_ARRIVED: "delivery:driver_arrived",
  DELIVERY_PICKED_UP: "delivery:picked_up",
  DELIVERY_IN_PROGRESS: "delivery:in_progress",
  DELIVERY_COMPLETED: "delivery:completed",
  DELIVERY_FAILED: "delivery:failed",

  LOCATION_UPDATED: "radar:location_updated",
  LOCATION_SHARED: "radar:location_shared",
  PIN_SELECTED: "radar:pin_selected",
  GEO_PERMISSION_CHANGED: "radar:geo_permission_changed",

  DASHBOARD_REFRESH: "dashboard:refresh",
  DASHBOARD_COUNTERS_REFRESH: "dashboard:counters_refresh",

  QR_SCANNED: "qr:scan_decoded",
  QR_PAYMENT_INITIATED: "qr:payment_initiated",
  QR_PAYMENT_COMPLETED: "qr:payment_completed",
  QR_PAYMENT_FAILED: "qr:payment_failed",

  CURRENCY_CHANGED: "system:currency_changed",
  SYNC_COMPLETED: "system:sync_completed",
  NOTIFICATIONS_REFRESH: "system:notifications_refresh",
} as const;

export type CanonicalEventType = typeof CANONICAL_EVENTS[keyof typeof CANONICAL_EVENTS];
