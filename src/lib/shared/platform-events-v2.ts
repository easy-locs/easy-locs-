export const PLATFORM_EVENTS_V2 = {
  // Orbit
  ORBIT_MESSAGE_SENT: "orbit.message.sent",
  ORBIT_MESSAGE_RECEIVED: "orbit.message.received",
  ORBIT_CALL_STARTED: "orbit.call.started",
  ORBIT_CALL_ENDED: "orbit.call.ended",

  // Wallet
  WALLET_PAYMENT_COMPLETED: "wallet.payment.completed",
  WALLET_QR_SCANNED: "wallet.qr.scanned",

  // Bookings
  BOOKING_CREATED: "booking.created",
  BOOKING_CONFIRMED: "booking.confirmed",

  // Marketplace
  MARKETPLACE_MERCHANT_LIVE: "marketplace.merchant.live",
  MARKETPLACE_CONTACT_OPENED: "marketplace.contact.opened",

  // Radar
  RADAR_LOCATION_SHARED: "radar.location.shared",
  RADAR_PIN_SELECTED: "radar.pin.selected",

  // Dashboard
  DASHBOARD_REFRESH: "dashboard.refresh",
  DASHBOARD_COUNTERS_REFRESH: "dashboard.counters.refresh",
} as const;

export type PlatformEventV2Key = keyof typeof PLATFORM_EVENTS_V2;
export type PlatformEventV2Value = (typeof PLATFORM_EVENTS_V2)[PlatformEventV2Key];
