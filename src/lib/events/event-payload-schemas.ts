/**
 * Canonical Event Payload Schemas — strictly typed, forensic-grade.
 * Every event in the system MUST use one of these schemas.
 * No more Record<string, any> payloads.
 */

// ── Wallet Events ──────────────────────────────────────────

export interface WalletTransactionCreatedPayload {
  transactionId: string;
  walletId: string;
  amount: number;
  currency: string;
  type: "credit" | "debit";
  _bridgedFrom?: string;
}

export interface WalletPaymentSuccessPayload {
  transactionId: string;
  orderId?: string;
  amount: number;
  currency: string;
  method: string;
  _bridgedFrom?: string;
}

export interface WalletPaymentFailedPayload {
  transactionId?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  errorCode: string;
  errorMessage: string;
  _bridgedFrom?: string;
}

export interface WalletBalanceRefreshPayload {
  walletId?: string;
  userId?: string;
  _bridgedFrom?: string;
}

// ── Commerce Payment Events ────────────────────────────────

export interface CommercePaymentIntentPayload {
  orderId: string;
  stage: string;
  amount?: number;
  currency?: string;
  _bridgedFrom?: string;
}

export interface CommercePaymentAuthorizedPayload {
  orderId: string;
  stage: string;
  transactionId?: string;
  _bridgedFrom?: string;
}

export interface CommercePaymentCapturedPayload {
  orderId: string;
  stage: string;
  transactionId?: string;
  amount?: number;
  _bridgedFrom?: string;
}

export interface CommercePaymentSettledPayload {
  orderId: string;
  stage: string;
  settlementId?: string;
  _bridgedFrom?: string;
}

export interface CommercePaymentReversedPayload {
  orderId: string;
  stage: string;
  reason?: string;
  _bridgedFrom?: string;
}

// ── Order Events ───────────────────────────────────────────

export interface OrderCreatedPayload {
  orderId: string;
  shopId?: string;
  userId?: string;
  amount?: number;
  currency?: string;
  _bridgedFrom?: string;
}

export interface OrderConfirmedPayload {
  orderId: string;
  confirmedBy?: string;
  _bridgedFrom?: string;
}

export interface OrderCompletedPayload {
  orderId: string;
  completedAt?: string;
  _bridgedFrom?: string;
}

export interface OrderPaymentUpdatedPayload {
  orderId: string;
  stage: string;
  paymentEvent: string;
}

// ── Orbit / Communication Events ───────────────────────────

export interface OrbitMessageSentPayload {
  threadId: string;
  messageId?: string;
  senderUserId?: string;
  _bridgedFrom?: string;
}

export interface OrbitMessageReceivedPayload {
  threadId: string;
  messageId?: string;
  senderUserId?: string;
  _bridgedFrom?: string;
}

export interface OrbitCallStartedPayload {
  callId?: string;
  callerOrbitId?: string;
  receiverOrbitId?: string;
  _bridgedFrom?: string;
}

export interface OrbitCallEndedPayload {
  callId?: string;
  duration?: number;
  _bridgedFrom?: string;
}

export interface OrbitPaymentContextPayload {
  orderId: string;
  stage: string;
  notifType: string;
}

// ── Notification Events ────────────────────────────────────

export interface NotificationPaymentPayload {
  orderId: string;
  stage: string;
  type: string;
}

// ── Listing Events ─────────────────────────────────────────

export interface ListingCreatedPayload {
  listingId: string;
  userId?: string;
  _bridgedFrom?: string;
}

export interface ListingPublishedPayload {
  listingId: string;
  _bridgedFrom?: string;
}

// ── Entity Events ──────────────────────────────────────────

export interface EntityClickPayload {
  entityId?: string;
  entityType?: string;
  _bridgedFrom?: string;
}

export interface EntityPublishedPayload {
  entityId?: string;
  vertical?: string;
  _bridgedFrom?: string;
}

// ── Location / Radar Events ────────────────────────────────

export interface LocationSharedPayload {
  lat?: number;
  lng?: number;
  userId?: string;
  _bridgedFrom?: string;
}

// ── Dashboard Events ───────────────────────────────────────

export interface DashboardRefreshPayload {
  module?: string;
  _bridgedFrom?: string;
}

// ── Ride Events ────────────────────────────────────────────

export interface RideRequestedPayload {
  rideId: string;
  userId?: string;
  _bridgedFrom?: string;
}

export interface RideDriverAssignedPayload {
  rideId: string;
  driverId: string;
  _bridgedFrom?: string;
}

export interface RideCompletedPayload {
  rideId: string;
  fare?: number;
  _bridgedFrom?: string;
}

export interface RideCancelledPayload {
  rideId: string;
  cancelledBy?: string;
  reason?: string;
  _bridgedFrom?: string;
}

// ── Master Event Map ───────────────────────────────────────

/**
 * Canonical mapping from event name → payload type.
 * Used for compile-time type safety across the event mesh.
 */
export interface CanonicalEventMap {
  // Wallet — SPLIT from lossy "wallet.updated"
  "wallet.transaction.created": WalletTransactionCreatedPayload;
  "wallet.payment.success": WalletPaymentSuccessPayload;
  "wallet.payment.failed": WalletPaymentFailedPayload;
  "wallet.balance.refresh": WalletBalanceRefreshPayload;

  // Commerce payments — each stage distinct
  "commerce.intent.prepared": CommercePaymentIntentPayload;
  "commerce.payment.authorized": CommercePaymentAuthorizedPayload;
  "commerce.payment.captured": CommercePaymentCapturedPayload;
  "commerce.payment.settled": CommercePaymentSettledPayload;
  "commerce.payment.reversed": CommercePaymentReversedPayload;

  // Orders
  "order.created": OrderCreatedPayload;
  "order.confirmed": OrderConfirmedPayload;
  "order.completed": OrderCompletedPayload;
  "order.payment.updated": OrderPaymentUpdatedPayload;

  // Orbit / Communication
  "message.sent": OrbitMessageSentPayload;
  "message.received": OrbitMessageReceivedPayload;
  "call.started": OrbitCallStartedPayload;
  "call.ended": OrbitCallEndedPayload;
  "orbit.payment.context": OrbitPaymentContextPayload;

  // Notifications
  "notification.payment": NotificationPaymentPayload;

  // Listings
  "listing.created": ListingCreatedPayload;
  "listing.published": ListingPublishedPayload;

  // Entity
  "entity.click": EntityClickPayload;
  "entity.published": EntityPublishedPayload;

  // Location
  "location.shared": LocationSharedPayload;

  // Dashboard
  "dashboard.refresh": DashboardRefreshPayload;

  // Rides
  "ride.requested": RideRequestedPayload;
  "ride.driver.assigned": RideDriverAssignedPayload;
  "ride.completed": RideCompletedPayload;
  "ride.cancelled": RideCancelledPayload;
}

export type CanonicalEventName = keyof CanonicalEventMap;
