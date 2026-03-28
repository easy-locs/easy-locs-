/**
 * APP_EVENTS — Single canonical event constant file.
 * ALL event listeners and emitters MUST use this file.
 * Notation: colon (e.g. "orbit:message_sent").
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
  WALLET_TOPUP_INITIATED: "wallet:topup_initiated",
  WALLET_TRANSFER_COMPLETED: "wallet:transfer_completed",

  // Orders
  ORDER_CREATED: "order:created",
  ORDER_CONFIRMED: "order:confirmed",
  ORDER_PREPARING: "order:preparing",
  ORDER_READY: "order:ready",
  ORDER_ASSIGNED: "order:assigned",
  ORDER_DELIVERING: "order:delivering",
  ORDER_COMPLETED: "order:completed",
  ORDER_CANCELLED: "order:cancelled",
  ORDER_REFUNDED: "order:refunded",
  PAYMENT_SUCCESS: "payment:success",
  PAYMENT_FAILED: "payment:failed",

  // Delivery / Mobility
  DELIVERY_DISPATCHED: "delivery:dispatched",
  DELIVERY_DRIVER_ASSIGNED: "delivery:driver_assigned",
  DELIVERY_PICKUP: "delivery:pickup",
  DELIVERY_DELIVERING: "delivery:delivering",
  DELIVERY_COMPLETED: "delivery:completed",
  DELIVERY_FAILED: "delivery:failed",
  MISSION_ACCEPTED: "mission:accepted",
  MISSION_COMPLETED: "mission:completed",

  // Rental
  RENTAL_PROPERTY_CREATED: "rental:property_created",
  RENTAL_PROPERTY_UPDATED: "rental:property_updated",
  RENTAL_TENANT_CREATED: "rental:tenant_created",
  RENTAL_TENANT_UPDATED: "rental:tenant_updated",
  RENTAL_RENT_CALL_CREATED: "rental:rent_call_created",
  RENTAL_RENT_CALL_PAID: "rental:rent_call_paid",
  RENTAL_RECEIPT_GENERATED: "rental:receipt_generated",
  RENTAL_LEASE_GENERATED: "rental:lease_generated",
  RENTAL_MESSAGE_SENT: "rental:message_sent",

  // Seasonal
  SEASONAL_BOOKING_CREATED: "seasonal:booking_created",
  SEASONAL_BOOKING_UPDATED: "seasonal:booking_updated",
  SEASONAL_BOOKING_CANCELLED: "seasonal:booking_cancelled",
  SEASONAL_ICAL_SYNCED: "seasonal:ical_synced",

  // Deals
  DEAL_CREATED: "deal:created",
  DEAL_OFFER_SENT: "deal:offer_sent",
  DEAL_COUNTER_OFFER: "deal:counter_offer",
  DEAL_ACCEPTED: "deal:accepted",
  DEAL_CANCELLED: "deal:cancelled",

  // Concierge
  CONCIERGE_SERVICE_BOOKED: "concierge:service_booked",
  CONCIERGE_BOOKING_UPDATED: "concierge:booking_updated",

  // Groups / Channels
  GROUP_CREATED: "group:created",
  GROUP_MESSAGE_SENT: "group:message_sent",
  CHANNEL_UPDATED: "channel:updated",

  // Storefront
  STOREFRONT_ORDER_PLACED: "storefront:order_placed",
  STOREFRONT_ORDER_COMPLETED: "storefront:order_completed",
  STOREFRONT_PRODUCT_UPDATED: "storefront:product_updated",
  STOREFRONT_MENU_UPDATED: "storefront:menu_updated",

  // Support
  SUPPORT_TICKET_CREATED: "support:ticket_created",
  SUPPORT_TICKET_REPLIED: "support:ticket_replied",
  SUPPORT_TICKET_RESOLVED: "support:ticket_resolved",
  REFUND_REQUESTED: "refund:requested",

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
