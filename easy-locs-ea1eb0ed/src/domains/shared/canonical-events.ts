/**
 * CANONICAL EVENT TAXONOMY — Single source of truth for all domain events.
 *
 * Rules:
 * 1. All events use dot.notation (no colons)
 * 2. Format: domain.entity.action
 * 3. Cross-domain communication ONLY via platformBus
 * 4. No direct imports between domains
 *
 * The platformBus bridge in platform-bus.ts maps legacy colon:notation
 * to these canonical events for backward compatibility.
 */

export const CANONICAL_EVENTS = {
  // ── Auth ──
  AUTH_READY: "auth.ready",
  AUTH_LOGOUT: "auth.logout",

  // ── Profile / Me ──
  PROFILE_LOADED: "me.profile.loaded",
  PROFILE_UPDATED: "me.profile.updated",
  PREFERENCES_UPDATED: "me.preferences.updated",
  PERMISSIONS_CHANGED: "me.permissions.changed",

  // ── Orbit (Communication) ──
  CONVERSATION_CREATED: "orbit.conversation.created",
  MESSAGE_SENT: "orbit.message.sent",
  MESSAGE_RECEIVED: "orbit.message.received",
  MESSAGE_DELIVERED: "orbit.message.delivered",
  MESSAGE_READ: "orbit.message.read",
  MESSAGE_FAILED: "orbit.message.failed",
  MESSAGE_RECONCILED: "orbit.message.reconciled",
  CALL_STARTED: "orbit.call.started",
  CALL_ENDED: "orbit.call.ended",
  CALL_MISSED: "orbit.call.missed",
  PRESENCE_CHANGED: "orbit.presence.changed",
  TYPING_STARTED: "orbit.typing.started",
  TYPING_STOPPED: "orbit.typing.stopped",

  // ── Wallet ──
  WALLET_LOADED: "wallet.loaded",
  WALLET_BALANCE_UPDATED: "wallet.balance.updated",
  WALLET_TRANSACTION_CREATED: "wallet.transaction.created",
  WALLET_PAYMENT_SUCCESS: "wallet.payment.success",
  WALLET_PAYMENT_FAILED: "wallet.payment.failed",
  WALLET_TRANSFER_SENT: "wallet.transfer.sent",
  WALLET_TRANSFER_RECEIVED: "wallet.transfer.received",
  WALLET_ESCROW_LOCKED: "wallet.escrow.locked",
  WALLET_ESCROW_RELEASED: "wallet.escrow.released",
  WALLET_TOPUP_COMPLETED: "wallet.topup.completed",

  // ── Marketplace ──
  LISTING_PUBLISHED: "marketplace.listing.published",
  LISTING_PAUSED: "marketplace.listing.paused",
  BOOKING_CREATED: "marketplace.booking.created",
  BOOKING_CONFIRMED: "marketplace.booking.confirmed",
  BOOKING_CANCELLED: "marketplace.booking.cancelled",
  BOOKING_COMPLETED: "marketplace.booking.completed",
  REVIEW_SUBMITTED: "marketplace.review.submitted",

  // ── Order ──
  ORDER_CREATED: "order.created",
  ORDER_ACCEPTED: "order.accepted",
  ORDER_READY: "order.ready",
  ORDER_ASSIGNED: "order.assigned",
  ORDER_DELIVERED: "order.delivered",
  ORDER_CANCELLED: "order.cancelled",
  ORDER_FAILED: "order.failed",

  // ── Driver / Delivery ──
  DRIVER_ASSIGNED: "delivery.driver.assigned",
  DRIVER_EN_ROUTE: "delivery.driver.en_route",
  DRIVER_ARRIVED: "delivery.driver.arrived",
  DELIVERY_PICKED_UP: "delivery.picked_up",
  DELIVERY_IN_PROGRESS: "delivery.in_progress",
  DELIVERY_COMPLETED: "delivery.completed",
  DELIVERY_FAILED: "delivery.failed",

  // ── Radar / Geo ──
  LOCATION_UPDATED: "radar.location.updated",
  LOCATION_SHARED: "radar.location.shared",
  PIN_SELECTED: "radar.pin.selected",
  GEO_PERMISSION_CHANGED: "radar.geo.permission_changed",

  // ── Dashboard ──
  DASHBOARD_REFRESH: "dashboard.refresh",
  DASHBOARD_COUNTERS_REFRESH: "dashboard.counters.refresh",

  // ── QR ──
  QR_SCANNED: "qr.scan.decoded",
  QR_PAYMENT_INITIATED: "qr.payment.initiated",
  QR_PAYMENT_COMPLETED: "qr.payment.completed",
  QR_PAYMENT_FAILED: "qr.payment.failed",

  // ── System ──
  CURRENCY_CHANGED: "system.currency.changed",
  SYNC_COMPLETED: "system.sync.completed",
  NOTIFICATIONS_REFRESH: "system.notifications.refresh",
} as const;

export type CanonicalEventType = typeof CANONICAL_EVENTS[keyof typeof CANONICAL_EVENTS];
