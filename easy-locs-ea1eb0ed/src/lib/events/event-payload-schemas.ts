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
  "agent:chief_started": AgentEventPayload;
  "agent:chief_completed": AgentEventPayload;
  "agent:subtask_started": AgentEventPayload;
  "agent:subtask_completed": AgentEventPayload;
  "agent:status_changed": AgentStatusPayload;
}

export interface AgentEventPayload {
  correlationId: string;
  agentName?: string;
  command?: string;
  timestamp: number;
}

export interface AgentStatusPayload {
  agentName: string;
  status: string;
  correlationId?: string;
  timestamp: number;
}

export interface PropertyBookingCompletedPayload {
  bookingId: string;
  propertyId: string;
  userId?: string;
  amount?: number;
  _bridgedFrom?: string;
}

export interface PropertyPaymentProcessedPayload {
  paymentId: string;
  propertyId: string;
  amount: number;
  currency?: string;
  _bridgedFrom?: string;
}

export interface MeProfileUpdatedPayload {
  userId: string;
  fields: string[];
  _bridgedFrom?: string;
}

export interface BookingCompletedPayload {
  bookingId: string;
  orderId?: string;
  userId?: string;
  amount?: number;
  currency?: string;
  _bridgedFrom?: string;
}

export interface RadarEntitySelectedPayload {
  entityId: string;
  entityType: string;
  lat?: number;
  lng?: number;
  _bridgedFrom?: string;
}

export interface AgentProtocolPayload {
  correlationId: string;
  source: string;
  target: string;
  [key: string]: unknown;
}

export interface ColonCanonicalEventMapExtended extends ColonCanonicalEventMap {
  "property:booking_completed": PropertyBookingCompletedPayload;
  "property:payment_processed": PropertyPaymentProcessedPayload;
  "me:profile_updated": MeProfileUpdatedPayload;
  "booking:completed": BookingCompletedPayload;
  "radar:entity_selected": RadarEntitySelectedPayload;
  "order:ready": Record<string, unknown>;
  "order:cancelled": Record<string, unknown>;
  "order:refunded": Record<string, unknown>;
  "mission:accepted": Record<string, unknown>;
  "mission:completed": Record<string, unknown>;
  "delivery:completed": Record<string, unknown>;
  "agent:sentinel_to_omega": AgentProtocolPayload;
  "agent:omega_to_repair": AgentProtocolPayload;
  "agent:repair_to_omega": AgentProtocolPayload;
  "agent:omega_to_quarantine": AgentProtocolPayload;
  "wallet:deduct": Record<string, unknown>;
  "payment:capture": Record<string, unknown>;
  "orbit:thread_created": Record<string, unknown>;
}

export type ColonCanonicalEventName = keyof ColonCanonicalEventMapExtended;

// ── Journey Lifecycle Events ───────────────────────────────────
// Phase 1 — Foundation: typed payloads for cross-pillar journey tracking.
// These are not yet emitted by the UI layer — wiring happens in Phase 2.

/** Canonical pillar identifiers. Must stay in sync with navigation-intent.ts Pillar type. */
export type JourneyPillar = "dashboard" | "radar" | "orbit" | "wallet" | "me";

/** A unique identifier for a user journey instance (UUID or nanoid). */
export type JourneyId = string;

/** Identifies which canonical user intent initiated the journey. */
export type UserIntentName =
  | "discovery_browse" | "discovery_search" | "discovery_entity_open"
  | "booking_start" | "booking_confirm" | "booking_cancel" | "booking_reschedule"
  | "order_start" | "order_checkout" | "order_track" | "order_cancel"
  | "ride_request" | "ride_track" | "ride_cancel"
  | "payment_initiate" | "payment_confirm" | "payment_retry" | "payment_topup" | "payment_transfer"
  | "orbit_open_thread" | "orbit_send_message" | "orbit_call_start"
  | "manage_asset_view" | "manage_asset_create" | "manage_asset_edit"
  | "support_open" | "support_escalate" | "support_resolve"
  | "deeplink_resolve" | "resume_interrupted";

export interface JourneyStartedPayload {
  journeyId: JourneyId;
  intent: UserIntentName;
  pillar: JourneyPillar;
  entryRoute: string;
  userId?: string;
  /** Arbitrary step-level context (entity IDs, pre-filled params). */
  context?: Record<string, unknown>;
  startedAt: number;
}

export interface JourneyInterruptedPayload {
  journeyId: JourneyId;
  intent: UserIntentName;
  pillar: JourneyPillar;
  /** The route the user was on when they left. */
  interruptedAtRoute: string;
  /** The step key within the flow (e.g. "address_selection", "payment_pending"). */
  step: string;
  /** Serialisable state snapshot for resume. Must be JSON-serialisable. */
  contextSnapshot: Record<string, unknown>;
  /** Whether the system can offer a resume prompt for this interruption. */
  retryable: boolean;
  interruptedAt: number;
}

export interface JourneyResumedPayload {
  journeyId: JourneyId;
  intent: UserIntentName;
  pillar: JourneyPillar;
  resumedFromRoute: string;
  resumedAt: number;
}

export interface JourneyCompletedPayload {
  journeyId: JourneyId;
  intent: UserIntentName;
  pillar: JourneyPillar;
  completedAt: number;
  /** Duration from first start to completion in milliseconds. */
  durationMs?: number;
}

export interface JourneyFailedPayload {
  journeyId: JourneyId;
  intent: UserIntentName;
  pillar: JourneyPillar;
  errorCode: string;
  errorMessage: string;
  /** Human-readable plain-language description for display (never shows errorCode). */
  userFacingMessage?: string;
  /** Route / action that can recover from this failure state. */
  recoveryRoute?: string;
  failedAt: number;
}

export interface DeepLinkResolvedPayload {
  /** Original raw deep-link URL. */
  rawUrl: string;
  /** Resolved pillar after auth check. */
  resolvedPillar: JourneyPillar;
  /** Resolved route the user will be navigated to. */
  resolvedRoute: string;
  /** Whether the link was deferred through auth (stored as post-login intent). */
  deferredThroughAuth: boolean;
  userId?: string;
  resolvedAt: number;
}

/** Extended event map including journey lifecycle events. */
export interface ColonCanonicalEventMapJourney extends ColonCanonicalEventMapExtended {
  "journey:started": JourneyStartedPayload;
  "journey:interrupted": JourneyInterruptedPayload;
  "journey:resumed": JourneyResumedPayload;
  "journey:completed": JourneyCompletedPayload;
  "journey:failed": JourneyFailedPayload;
  "deeplink:resolved": DeepLinkResolvedPayload;
}

export type CanonicalEventName = keyof ColonCanonicalEventMapJourney;
