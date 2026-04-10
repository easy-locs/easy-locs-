/**
 * Unified notification deep link map.
 * Central source of truth for routing from notification type to app screen.
 */

const DEEP_LINK_MAP: Record<string, string> = {
  // Calls
  incoming_call: "/orbit?section=calls",
  call: "/orbit?section=calls",
  missed_call: "/orbit?section=calls",

  // Messages
  message: "/orbit",
  chat: "/orbit",

  // Money
  wallet_credited: "/wallet",
  wallet_debited: "/wallet",
  payment_received: "/wallet",
  payment_failed: "/wallet",
  payment_request: "/wallet",
  refund: "/wallet",

  // Orders — deep link includes order_id from notification link field
  order_received: "/my-orders",
  order_accepted: "/my-orders",
  order_preparing: "/my-orders",
  order_ready: "/my-orders",
  order_delivered: "/my-orders",
  order_cancelled: "/my-orders",
  order_update: "/my-orders",
  order_paid: "/my-orders",

  // Ride / Delivery
  ride_update: "/mobility/taxi",
  delivery_update: "/my-orders",
  driver_mission: "/dispatch",

  // Booking / Real Estate
  booking_confirmed: "/my-orders",
  booking_cancelled: "/my-orders",
  rent_due: "/property-hub",
  rent_paid: "/property-hub",

  // Business
  new_order: "/pos",
  business_alert: "/seller-hub",

  // Security / System
  security_alert: "/settings",
  system: "/",
};

export function resolveDeepLink(type: string, fallbackLink?: string | null): string {
  return fallbackLink || DEEP_LINK_MAP[type] || "/";
}

export function getDeepLinkMap() {
  return { ...DEEP_LINK_MAP };
}
