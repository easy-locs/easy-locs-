/**
 * Canonical Event Payload Schemas — strictly typed, forensic-grade.
 * Every event in the system MUST use one of these schemas.
 * No more Record<string, any> payloads.
 * 
 * RULE: Schemas must match actual consumer usage, not aspirational minimalism.
 */

// ── Wallet Events ──────────────────────────────────────────

export interface WalletTransactionCreatedPayload {
  transactionId: string;
  walletId: string;
  amount: number;
  currency: string;
  type: "credit" | "debit";
  userId?: string;
  _bridgedFrom?: string;
}

export interface WalletPaymentSuccessPayload {
  transactionId: string;
  orderId?: string;
  amount: number;
  currency: string;
  method: string;
  userId?: string;
  _bridgedFrom?: string;
}

export interface WalletPaymentFailedPayload {
  transactionId?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  errorCode: string;
  errorMessage: string;
  userId?: string;
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
  userId?: string;
  amount?: number;
  category?: string;
  subcategory?: string;
  city?: string;
  _bridgedFrom?: string;
}

export interface OrderPaymentUpdatedPayload {
  orderId: string;
  stage: string;
  paymentEvent: string;
}

// ── Orbit / Communication Events ───────────────────────────

export interface OrbitMessageSentPayload {
  threadId?: string;
  conversationId?: string;
  messageId?: string;
  senderUserId?: string;
  userId?: string;
  contentPreview?: string;
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
  userId?: string;
  _bridgedFrom?: string;
}

// ── Entity Events ──────────────────────────────────────────

export interface EntityClickPayload {
  entityId?: string;
  entityType?: string;
  userId?: string;
  category?: string;
  subcategory?: string;
  city?: string;
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
  customer_user_id?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  pickup_label?: string;
  dropoff_label?: string;
  service_level?: string;
  currency?: string;
  zone?: string;
  metadata?: Record<string, unknown>;
  _bridgedFrom?: string;
}

export interface RideDriverAssignedPayload {
  rideId: string;
  driverId: string;
  jobId?: string;
  customerUserId?: string;
  riderUserId?: string;
  _bridgedFrom?: string;
  [key: string]: unknown; // allow spread to Record<string, string>
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
export interface StoryCanonicalPayload {
  storyId: string;
  entityId: string;
  entityType: string;
  vertical: string;
  categoryKey: string;
  subcategoryKey: string;
  [key: string]: unknown;
}

export interface ColonCanonicalEventMap {
  "wallet:transaction_created": WalletTransactionCreatedPayload;
  "wallet:payment_success": WalletPaymentSuccessPayload;
  "wallet:payment_failed": WalletPaymentFailedPayload;
  "wallet:balance_refresh": WalletBalanceRefreshPayload;
  "commerce:intent_prepared": CommercePaymentIntentPayload;
  "commerce:payment_authorized": CommercePaymentAuthorizedPayload;
  "commerce:payment_captured": CommercePaymentCapturedPayload;
  "commerce:payment_settled": CommercePaymentSettledPayload;
  "commerce:payment_reversed": CommercePaymentReversedPayload;
  "order:created": OrderCreatedPayload;
  "order:confirmed": OrderConfirmedPayload;
  "order:completed": OrderCompletedPayload;
  "order:payment_updated": OrderPaymentUpdatedPayload;
  "orbit:message_sent": OrbitMessageSentPayload;
  "orbit:message_received": OrbitMessageReceivedPayload;
  "call:started": OrbitCallStartedPayload;
  "call:ended": OrbitCallEndedPayload;
  "orbit:payment_context": OrbitPaymentContextPayload;
  "notification:payment": NotificationPaymentPayload;
  "listing:created": ListingCreatedPayload;
  "listing:published": ListingPublishedPayload;
  "entity:click": EntityClickPayload;
  "entity:published": EntityPublishedPayload;
  "location:shared": LocationSharedPayload;
  "dashboard:refresh": DashboardRefreshPayload;
  "ride:requested": RideRequestedPayload;
  "ride:driver_assigned": RideDriverAssignedPayload;
  "ride:completed": RideCompletedPayload;
  "ride:cancelled": RideCancelledPayload;
  "story:cta_clicked": StoryCanonicalPayload;
  "story:impression": StoryCanonicalPayload;
  "story:viewed": StoryCanonicalPayload;
  "story:swiped": StoryCanonicalPayload;
  "story:opened": StoryCanonicalPayload;
  "story:closed": StoryCanonicalPayload;
  "intent:save_entity": StoryCanonicalPayload;
  "intent:share_entity": StoryCanonicalPayload;
  "support:session_created": Record<string, unknown>;
  "support:ai_classification": Record<string, unknown>;
  "support:shop_transfer_initiated": Record<string, unknown>;
  "support:shop_transfer_timeout": Record<string, unknown>;
  "support:escalation_triggered": Record<string, unknown>;
  "support:ticket_created": Record<string, unknown>;
  "support:session_resolved": Record<string, unknown>;
  "support:payment_anomaly_detected": Record<string, unknown>;
  "support:agents_started": Record<string, unknown>;
}

export type ColonCanonicalEventName = keyof ColonCanonicalEventMap;
