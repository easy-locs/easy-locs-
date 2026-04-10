/**
 * Platform Events V2 — Canonical event constants.
 * Unified colon-notation. The notation bridge in platform-bus
 * automatically mirrors dot-notation emitters to these canonical forms.
 */
export const PLATFORM_EVENTS_V2 = {
  // Orbit
  ORBIT_MESSAGE_SENT: "orbit:message_sent",
  ORBIT_MESSAGE_RECEIVED: "orbit:message_received",
  ORBIT_CALL_STARTED: "orbit:call_started",
  ORBIT_CALL_ENDED: "orbit:call_ended",

  // Wallet
  WALLET_PAYMENT_COMPLETED: "wallet:payment_completed",
  WALLET_PAYMENT_SUCCESS: "wallet:payment_success",
  WALLET_PAYMENT_FAILED: "wallet:payment_failed",
  WALLET_QR_SCANNED: "wallet:qr_scanned",
  WALLET_BALANCE_UPDATED: "wallet:balance_updated",

  // Bookings
  BOOKING_CREATED: "marketplace:booking_created",
  BOOKING_CONFIRMED: "marketplace:booking_confirmed",

  // Marketplace
  MARKETPLACE_MERCHANT_LIVE: "marketplace:provider_went_live",
  MARKETPLACE_CONTACT_OPENED: "marketplace:listing_published",

  // Radar
  RADAR_LOCATION_SHARED: "radar:location_shared",
  RADAR_PIN_SELECTED: "radar:pin_selected",

  // Dashboard
  DASHBOARD_REFRESH: "dashboard:refresh",
  DASHBOARD_COUNTERS_REFRESH: "dashboard:counters_refresh",

  // Notifications
  NOTIFICATIONS_REFRESH: "notifications:refresh",
} as const;

export type PlatformEventV2Key = keyof typeof PLATFORM_EVENTS_V2;
export type PlatformEventV2Value = (typeof PLATFORM_EVENTS_V2)[PlatformEventV2Key];
