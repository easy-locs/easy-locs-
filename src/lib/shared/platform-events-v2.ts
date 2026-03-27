export const PLATFORM_EVENTS_V2 = {
  ORBIT_MESSAGE_SENT: "orbit.message.sent",
  ORBIT_CALL_STARTED: "orbit.call.started",
  ORBIT_CALL_ENDED: "orbit.call.ended",

  WALLET_PAYMENT_COMPLETED: "wallet.payment.completed",
  WALLET_QR_SCANNED: "wallet.qr.scanned",

  BOOKING_CREATED: "booking.created",
  BOOKING_CONFIRMED: "booking.confirmed",

  MARKETPLACE_MERCHANT_LIVE: "marketplace.merchant.live",
  MARKETPLACE_CONTACT_OPENED: "marketplace.contact.opened",

  RADAR_LOCATION_SHARED: "radar.location.shared",
  RADAR_MAP_PIN_SELECTED: "radar.map.pin.selected",

  DASHBOARD_COUNTERS_REFRESH: "dashboard.counters.refresh",
} as const;

export type PlatformEventV2Key = keyof typeof PLATFORM_EVENTS_V2;
export type PlatformEventV2Value = (typeof PLATFORM_EVENTS_V2)[PlatformEventV2Key];
