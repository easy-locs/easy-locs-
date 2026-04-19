/**
 * Journey Wiring — Phase 2.
 *
 * Mounts platformBus listeners that drive the journey lifecycle registry.
 * Covers: booking, ride, order (confirmed lifecycle only), wallet, orbit call,
 * and support session.
 *
 * Canonical wallet correlation strategy (emitter-typed dispatch — no fallback):
 *   PayRidePage chain           → key = event.correlationId  (set in busOptions)
 *   orbit-payment-bridge chain  → key = payload.transactionId (DB UUID, no correlationId)
 *   bridgePayNow chain          → key = payload.transactionId (DB UUID, no correlationId)
 *   close-flow-engine emitter   → excluded (no anchor key — skipped without registering)
 *
 * taxiFlowStore: intentionally excluded from Phase 2.
 *   Ride lifecycle is fully covered by bus events (ride:status_updated,
 *   ride:driver_assigned, ride:completed, ride:cancelled).
 *   Zustand store subscriptions are architecturally forbidden in this module.
 *   No taxiFlowStore wiring is required in any future phase — ride bus events
 *   are the canonical signal.
 *
 * Order scope: confirmed lifecycle only.
 *   Journey starts at order:status_changed { to: "confirmed" }.
 *   Pre-confirmation order intent is not tracked.
 */

import { platformBus } from "@/lib/shared/platform-bus";
import type { PlatformEvent } from "@/lib/shared/platform-bus";
import {
  startJourney,
  updateJourney,
  interruptJourney,
  completeJourney,
  failJourney,
  getAllJourneys,
} from "@/lib/journey/journey-registry";
import type { JourneyId } from "@/lib/events/event-payload-schemas";

// ── Correlation map ───────────────────────────────────────────────────────────
// Maps a domain-specific anchor key (bookingId, jobId, orderId, transactionId,
// correlationId, callId, sessionId) to the journeyId stored in the registry.

const correlationMap = new Map<string, JourneyId>();

// ── ID generation ─────────────────────────────────────────────────────────────

function newJourneyId(): JourneyId {
  return crypto.randomUUID();
}

// ── Booking handlers ──────────────────────────────────────────────────────────

function handleBookingRequested(event: PlatformEvent): void {
  const p = event.payload as Record<string, unknown>;
  const booking = p?.booking as Record<string, unknown> | undefined;
  const bookingId = booking?.id as string | undefined;
  if (!bookingId) return;
  if (correlationMap.has(bookingId)) return;

  const journeyId = newJourneyId();
  startJourney({
    journeyId,
    intent: "booking_start",
    pillar: "radar",
    observedRoute: window.location.pathname,
    contextSnapshot: { domainId: bookingId },
  });
  correlationMap.set(bookingId, journeyId);
}

function handleBookingPaymentFailed(event: PlatformEvent): void {
  const p = event.payload as Record<string, unknown>;
  const bookingId = p?.bookingId as string | undefined;
  if (!bookingId) return;
  const journeyId = correlationMap.get(bookingId);
  if (!journeyId) return;
  failJourney(journeyId, { errorCode: "booking_payment_failed", retryable: true });
}

function handleBookingCancelled(event: PlatformEvent): void {
  const p = event.payload as Record<string, unknown>;
  const bookingId = p?.bookingId as string | undefined;
  if (!bookingId) return;
  const journeyId = correlationMap.get(bookingId);
  if (!journeyId) return;
  interruptJourney(journeyId, {
    interruptedAtRoute: window.location.pathname,
    step: "cancelled",
    contextSnapshot: {},
    retryable: false,
  });
}

function handleBookingCompleted(event: PlatformEvent): void {
  const p = event.payload as Record<string, unknown>;
  const bookingId = p?.bookingId as string | undefined;
  if (!bookingId) return;
  const journeyId = correlationMap.get(bookingId);
  if (!journeyId) return;
  completeJourney(journeyId);
}

// ── Ride handlers ─────────────────────────────────────────────────────────────

function handleRideStatusUpdated(event: PlatformEvent): void {
  const p = event.payload as Record<string, unknown>;
  const status = p?.status as string | undefined;
  const jobId = p?.jobId as string | undefined;
  if (!jobId || status !== "searching") return;
  if (correlationMap.has(jobId)) return;

  const journeyId = newJourneyId();
  startJourney({
    journeyId,
    intent: "ride_request",
    pillar: "radar",
    observedRoute: window.location.pathname,
    contextSnapshot: { domainId: jobId },
  });
  correlationMap.set(jobId, journeyId);
}

function handleRideDriverAssigned(event: PlatformEvent): void {
  const p = event.payload as Record<string, unknown>;
  const jobId = p?.jobId as string | undefined;
  if (!jobId) return;
  const journeyId = correlationMap.get(jobId);
  if (!journeyId) return;
  updateJourney(journeyId, { currentStep: "driver_assigned" });
}

function handleRideCompleted(event: PlatformEvent): void {
  const p = event.payload as Record<string, unknown>;
  // ride-lifecycle.handler emits ridePayload (jobId), RideCompletedPayload types rideId.
  // Both fields covered for forward compatibility.
  const jobId = (p?.jobId ?? p?.rideId) as string | undefined;
  if (!jobId) return;
  const journeyId = correlationMap.get(jobId);
  if (!journeyId) return;
  completeJourney(journeyId);
}

function handleRideCancelled(event: PlatformEvent): void {
  const p = event.payload as Record<string, unknown>;
  const jobId = (p?.jobId ?? p?.rideId) as string | undefined;
  if (!jobId) return;
  const journeyId = correlationMap.get(jobId);
  if (!journeyId) return;
  interruptJourney(journeyId, {
    interruptedAtRoute: window.location.pathname,
    step: "cancelled",
    contextSnapshot: {},
    retryable: false,
  });
}

// ── Order handler ─────────────────────────────────────────────────────────────
// Subscribes to order:status_changed (emitted by order-lifecycle.ts).
// Journey starts at to === "confirmed"; ends at to === "delivered"|"completed";
// interrupted at to === "cancelled". All other transitions are ignored.

function handleOrderStatusChanged(event: PlatformEvent): void {
  const p = event.payload as Record<string, unknown>;
  const orderId = p?.orderId as string | undefined;
  const to = p?.to as string | undefined;
  if (!orderId || !to) return;

  if (to === "confirmed") {
    if (correlationMap.has(orderId)) return;
    const journeyId = newJourneyId();
    startJourney({
      journeyId,
      intent: "order_start",
      pillar: "radar",
      observedRoute: window.location.pathname,
      contextSnapshot: { domainId: orderId },
    });
    correlationMap.set(orderId, journeyId);
    return;
  }

  const journeyId = correlationMap.get(orderId);
  if (!journeyId) return;

  if (to === "delivered" || to === "completed") {
    completeJourney(journeyId);
  } else if (to === "cancelled") {
    interruptJourney(journeyId, {
      interruptedAtRoute: window.location.pathname,
      step: "cancelled",
      contextSnapshot: {},
      retryable: false,
    });
  }
}

// ── Wallet handlers ───────────────────────────────────────────────────────────

function handleWalletPaymentRequested(event: PlatformEvent): void {
  const p = event.payload as Record<string, unknown>;

  // Canonical wallet correlation: emitter-typed dispatch, not a fallback chain.
  // PayRidePage emitter always sets event.correlationId via busOptions.
  // orbit-payment-bridge and bridgePayNow always set payload.transactionId and
  // never set correlationId. close-flow-engine sets neither — excluded.
  let domainKey: string | undefined;
  if (event.correlationId) {
    domainKey = event.correlationId;
  } else if (p?.transactionId) {
    domainKey = p.transactionId as string;
  } else {
    return;
  }

  if (correlationMap.has(domainKey)) return;
  const journeyId = newJourneyId();
  startJourney({
    journeyId,
    intent: "payment_initiate",
    pillar: "wallet",
    observedRoute: window.location.pathname,
    contextSnapshot: { domainId: domainKey },
  });
  correlationMap.set(domainKey, journeyId);
}

function handleWalletPaymentSuccess(event: PlatformEvent): void {
  const p = event.payload as Record<string, unknown>;
  // PayRidePage chain: event.correlationId is set; transactionId is also in payload.
  // orbit/bridgePayNow chains: only transactionId is set.
  const domainKey = event.correlationId ?? (p?.transactionId as string | undefined);
  if (!domainKey) return;
  const journeyId = correlationMap.get(domainKey);
  if (!journeyId) return;
  completeJourney(journeyId);
}

function handleWalletPaymentFailed(event: PlatformEvent): void {
  const p = event.payload as Record<string, unknown>;
  const domainKey = event.correlationId ?? (p?.transactionId as string | undefined);
  if (!domainKey) return;
  const journeyId = correlationMap.get(domainKey);
  if (!journeyId) return;
  failJourney(journeyId, { errorCode: "wallet_payment_failed", retryable: true });
}

function handleWalletPaymentCompleted(event: PlatformEvent): void {
  // Emitted by orbit-payment-bridge only. Key is always payload.transactionId.
  const p = event.payload as Record<string, unknown>;
  const transactionId = p?.transactionId as string | undefined;
  if (!transactionId) return;
  const journeyId = correlationMap.get(transactionId);
  if (!journeyId) return;
  completeJourney(journeyId);
}

// ── Orbit call handlers ───────────────────────────────────────────────────────

function handleOrbitCallStarted(event: PlatformEvent): void {
  const p = event.payload as Record<string, unknown>;
  const callId = p?.callId as string | undefined;
  if (!callId) return;
  if (correlationMap.has(callId)) return;

  const journeyId = newJourneyId();
  startJourney({
    journeyId,
    intent: "orbit_call_start",
    pillar: "orbit",
    observedRoute: window.location.pathname,
    contextSnapshot: { domainId: callId },
  });
  correlationMap.set(callId, journeyId);
}

function handleOrbitCallEnded(event: PlatformEvent): void {
  const p = event.payload as Record<string, unknown>;
  const callId = p?.callId as string | undefined;
  if (!callId) return;
  const journeyId = correlationMap.get(callId);
  if (!journeyId) return;
  completeJourney(journeyId);
}

// ── Support session handlers ──────────────────────────────────────────────────

function handleSupportSessionStarted(event: PlatformEvent): void {
  const p = event.payload as Record<string, unknown>;
  const sessionId = p?.sessionId as string | undefined;
  if (!sessionId) return;
  if (correlationMap.has(sessionId)) return;

  const journeyId = newJourneyId();
  startJourney({
    journeyId,
    intent: "support_open",
    pillar: "me",
    observedRoute: window.location.pathname,
    contextSnapshot: { domainId: sessionId },
  });
  correlationMap.set(sessionId, journeyId);
}

function handleSupportSessionResolved(event: PlatformEvent): void {
  const p = event.payload as Record<string, unknown>;
  const sessionId = p?.sessionId as string | undefined;
  if (!sessionId) return;
  const journeyId = correlationMap.get(sessionId);
  if (!journeyId) return;
  completeJourney(journeyId);
}

// ── Central dispatcher ────────────────────────────────────────────────────────
// Used both by live bus subscriptions and by the bus-log replay on mount.

function dispatch(type: string, event: PlatformEvent): void {
  switch (type) {
    case "booking:requested":        handleBookingRequested(event); break;
    case "booking:payment_failed":   handleBookingPaymentFailed(event); break;
    case "booking:cancelled":        handleBookingCancelled(event); break;
    case "booking:completed":        handleBookingCompleted(event); break;
    case "ride:status_updated":      handleRideStatusUpdated(event); break;
    case "ride:driver_assigned":     handleRideDriverAssigned(event); break;
    case "ride:completed":           handleRideCompleted(event); break;
    case "ride:cancelled":           handleRideCancelled(event); break;
    case "order:status_changed":     handleOrderStatusChanged(event); break;
    case "wallet:payment_requested": handleWalletPaymentRequested(event); break;
    case "wallet:payment_success":   handleWalletPaymentSuccess(event); break;
    case "wallet:payment_failed":    handleWalletPaymentFailed(event); break;
    case "wallet:payment_completed": handleWalletPaymentCompleted(event); break;
    case "orbit:call_started":       handleOrbitCallStarted(event); break;
    case "orbit:call_ended":         handleOrbitCallEnded(event); break;
    case "support:session_started":  handleSupportSessionStarted(event); break;
    case "support:session_resolved": handleSupportSessionResolved(event); break;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

const WIRED_EVENTS = [
  "booking:requested",
  "booking:payment_failed",
  "booking:cancelled",
  "booking:completed",
  "ride:status_updated",
  "ride:driver_assigned",
  "ride:completed",
  "ride:cancelled",
  "order:status_changed",
  "wallet:payment_requested",
  "wallet:payment_success",
  "wallet:payment_failed",
  "wallet:payment_completed",
  "orbit:call_started",
  "orbit:call_ended",
  "support:session_started",
  "support:session_resolved",
] as const;

/**
 * Mount journey wiring.
 *
 * Call once at app init (Stage 3b idle block in event-init.ts).
 * Returns a cleanup function that unregisters all bus listeners.
 *
 * Idempotent per domain key: duplicate events for the same anchor key are
 * ignored via correlationMap.has() guards.
 */
export function mountJourneyWiring(): () => void {
  // Step 0 — warm correlationMap from any journeys already in sessionStorage
  // (covers page-reload case where journeys pre-date this mount).
  for (const record of getAllJourneys()) {
    if (record.status === "active" || record.status === "interrupted") {
      const domainId = record.contextSnapshot?.domainId as string | undefined;
      if (domainId && !correlationMap.has(domainId)) {
        correlationMap.set(domainId, record.journeyId);
      }
    }
  }

  // Step 1 — register live bus listeners.
  const unsubs: Array<() => void> = [];
  for (const eventType of WIRED_EVENTS) {
    unsubs.push(platformBus.on(eventType, (event) => dispatch(eventType, event)));
  }

  // Step 2 — replay the bus log to process events that fired before mount.
  for (const event of platformBus.getLog()) {
    dispatch(event.type as string, event);
  }

  // Step 3 — return cleanup.
  return () => unsubs.forEach((fn) => fn());
}
