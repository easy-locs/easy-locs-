/**
 * CANONICAL STATE MACHINES — All critical business status transitions.
 *
 * Every status field in the app MUST use one of these machines.
 * Direct boolean flags for status are BANNED.
 *
 * Usage:
 *   import { transitionPayment, PAYMENT_MACHINE } from "@/domains/shared/state-machines";
 *   const next = transitionPayment(current, "CAPTURE"); // "captured" | null
 */

import type { PaymentStatus, OrderStatus, DriverStatus } from "./canonical-types";

// ── Generic transition function ──
type Machine<S extends string, E extends string> = Record<S, Partial<Record<E, S>>>;

function createTransition<S extends string, E extends string>(machine: Machine<S, E>) {
  return (current: S, event: E): S | null => {
    const next = machine[current]?.[event];
    return next ?? null;
  };
}

// ══════════════════════════════════════════════════
// PAYMENT STATE MACHINE
// ══════════════════════════════════════════════════

type PaymentEvent = "CONFIRM" | "AUTHORIZE" | "CAPTURE" | "FAIL" | "REFUND" | "CANCEL";

export const PAYMENT_MACHINE: Machine<PaymentStatus, PaymentEvent> = {
  created:               { CONFIRM: "pending_confirmation", CANCEL: "cancelled" },
  pending_confirmation:  { AUTHORIZE: "authorized", FAIL: "failed", CANCEL: "cancelled" },
  authorized:            { CAPTURE: "captured", FAIL: "failed", CANCEL: "cancelled" },
  captured:              { REFUND: "refunded" },
  failed:                {},
  refunded:              {},
  cancelled:             {},
};

export const transitionPayment = createTransition(PAYMENT_MACHINE);

// ══════════════════════════════════════════════════
// ORDER STATE MACHINE
// ══════════════════════════════════════════════════

type OrderEvent = "SUBMIT" | "ACCEPT" | "PREPARE" | "READY" | "ASSIGN" | "PICKUP" | "DELIVER" | "CANCEL" | "FAIL";

export const ORDER_MACHINE: Machine<OrderStatus, OrderEvent> = {
  draft:      { SUBMIT: "submitted", CANCEL: "cancelled" },
  submitted:  { ACCEPT: "accepted", CANCEL: "cancelled", FAIL: "failed" },
  accepted:   { PREPARE: "preparing", CANCEL: "cancelled" },
  preparing:  { READY: "ready", CANCEL: "cancelled" },
  ready:      { ASSIGN: "assigned", CANCEL: "cancelled" },
  assigned:   { PICKUP: "picked_up", CANCEL: "cancelled", FAIL: "failed" },
  picked_up:  { DELIVER: "delivered", FAIL: "failed" },
  delivered:  {},
  cancelled:  {},
  failed:     {},
};

export const transitionOrder = createTransition(ORDER_MACHINE);

// ══════════════════════════════════════════════════
// DRIVER STATE MACHINE
// ══════════════════════════════════════════════════

type DriverEvent = "RESERVE" | "ASSIGN" | "EN_ROUTE" | "ARRIVE_PICKUP" | "START_DELIVERY" | "COMPLETE" | "GO_OFFLINE" | "GO_ONLINE" | "RELEASE";

export const DRIVER_MACHINE: Machine<DriverStatus, DriverEvent> = {
  available:          { RESERVE: "reserved", ASSIGN: "assigned", GO_OFFLINE: "offline" },
  reserved:           { ASSIGN: "assigned", RELEASE: "available" },
  assigned:           { EN_ROUTE: "on_route_to_pickup", RELEASE: "available" },
  on_route_to_pickup: { ARRIVE_PICKUP: "waiting_pickup" },
  waiting_pickup:     { START_DELIVERY: "on_delivery" },
  on_delivery:        { COMPLETE: "completed" },
  completed:          { GO_ONLINE: "available", GO_OFFLINE: "offline" },
  offline:            { GO_ONLINE: "available" },
};

export const transitionDriver = createTransition(DRIVER_MACHINE);

// ══════════════════════════════════════════════════
// Re-export existing Orbit machines for completeness
// ══════════════════════════════════════════════════

export {
  transition,
  MESSAGE_MACHINE,
  CALL_MACHINE,
  UPLOAD_MACHINE,
  CONNECTION_MACHINE,
  NOTIFICATION_MACHINE,
  AUTH_SESSION_MACHINE,
  CHECKOUT_MACHINE,
  ONBOARDING_MACHINE,
  BOOKING_MACHINE,
  RESERVATION_MACHINE,
  SUPPORT_TICKET_MACHINE,
  REPAIR_MACHINE,
  SUBSCRIPTION_MACHINE,
} from "@/lib/state-machines/canonical-machines";

export type {
  MessageState,
  CallState,
  UploadState,
  ConnectionState,
  NotificationState,
  AuthSessionState,
  CheckoutState,
  OnboardingState,
  BookingFlowState,
  ReservationState,
  SupportTicketState,
  RepairState,
  SubscriptionState,
} from "@/lib/state-machines/canonical-machines";

export {
  FLIGHT_MACHINE,
  transitionFlight,
  canTransitionFlight,
  getValidEvents as getFlightValidEvents,
  isTerminalState as isFlightTerminal,
  FLIGHT_STATUS_META,
} from "@/domains/flight/flight-state-machine";
export type { FlightEvent } from "@/domains/flight/flight-state-machine";

const lastTransitionMap = new Map<string, { state: string; event: string; at: number }>();
const DUPLICATE_GUARD_MS = 200;

export function safeTransition<S extends string, E extends string>(
  machine: Machine<S, E>,
  flowId: string,
  current: S,
  event: E,
): { next: S | null; blocked: boolean; reason?: string } {
  const now = Date.now();
  const last = lastTransitionMap.get(flowId);
  if (last && last.state === current && last.event === event && now - last.at < DUPLICATE_GUARD_MS) {
    return { next: null, blocked: true, reason: "duplicate_event" };
  }

  const next = machine[current]?.[event] ?? null;
  if (next === null) {
    return { next: null, blocked: true, reason: "forbidden_transition" };
  }

  lastTransitionMap.set(flowId, { state: current, event, at: now });

  if (lastTransitionMap.size > 500) {
    const cutoff = now - 60_000;
    for (const [k, v] of lastTransitionMap) {
      if (v.at < cutoff) lastTransitionMap.delete(k);
    }
    if (lastTransitionMap.size > 500) {
      const entries = [...lastTransitionMap.entries()].sort((a, b) => a[1].at - b[1].at);
      const toRemove = entries.slice(0, entries.length - 250);
      for (const [k] of toRemove) lastTransitionMap.delete(k);
    }
  }

  return { next, blocked: false };
}

const TERMINAL_STATES: Record<string, Set<string>> = {
  payment: new Set(["failed", "refunded", "cancelled"]),
  order: new Set(["delivered", "cancelled", "failed"]),
  driver: new Set([]),
  message: new Set(["read"]),
  call: new Set(["ended", "missed", "declined"]),
  upload: new Set(["completed", "cancelled"]),
  notification: new Set(["read", "dismissed"]),
  auth_session: new Set([]),
  checkout: new Set(["completed", "cancelled"]),
  onboarding: new Set(["completed", "skipped"]),
  booking: new Set(["refunded"]),
  reservation: new Set(["completed", "cancelled", "no_show"]),
  support_ticket: new Set(["closed"]),
  repair: new Set(["paid", "cancelled"]),
  subscription: new Set(["cancelled"]),
  listing: new Set(["completed", "removed"]),
  match: new Set(["completed", "expired", "declined"]),
  moderation: new Set(["removed"]),
};

export function isTerminal(machineType: string, state: string): boolean {
  return TERMINAL_STATES[machineType]?.has(state) ?? false;
}

export function getValidEventsForState<S extends string, E extends string>(
  machine: Machine<S, E>,
  state: S,
): E[] {
  const transitions = machine[state];
  if (!transitions) return [];
  return Object.keys(transitions) as E[];
}

// ══════════════════════════════════════════════════
// LOCAL LISTING STATE MACHINE
// Phase 0 Foundation — definition only, no runtime wiring
// ══════════════════════════════════════════════════

import type { LocalListingStatus, MatchStatus, ModerationStatus } from "./canonical-types";

type ListingEvent =
  | "SUBMIT"
  | "APPROVE"
  | "ACTIVATE"
  | "RESERVE"
  | "COMPLETE"
  | "EXPIRE"
  | "REMOVE"
  | "FLAG"
  | "QUARANTINE"
  | "REINSTATE"
  | "UNRESERVE";

export const LISTING_MACHINE: Machine<LocalListingStatus, ListingEvent> = {
  draft:          { SUBMIT: "pending_review", REMOVE: "removed" },
  pending_review: { APPROVE: "active", FLAG: "flagged", QUARANTINE: "quarantined", REMOVE: "removed" },
  active:         { RESERVE: "reserved", EXPIRE: "expired", REMOVE: "removed", FLAG: "flagged", QUARANTINE: "quarantined" },
  reserved:       { COMPLETE: "completed", UNRESERVE: "active", EXPIRE: "expired", REMOVE: "removed" },
  completed:      {},
  expired:        { REINSTATE: "active", REMOVE: "removed" },
  removed:        {},
  flagged:        { REINSTATE: "active", QUARANTINE: "quarantined", REMOVE: "removed" },
  quarantined:    { REINSTATE: "active", REMOVE: "removed" },
};

export const transitionListing = createTransition(LISTING_MACHINE);

// ══════════════════════════════════════════════════
// LOCAL MATCH STATE MACHINE
// Phase 0 Foundation — definition only, no runtime wiring
// ══════════════════════════════════════════════════

type MatchEvent =
  | "PRESENT"
  | "ACKNOWLEDGE"
  | "CONTACT"
  | "COMPLETE"
  | "EXPIRE"
  | "DECLINE";

export const MATCH_MACHINE: Machine<MatchStatus, MatchEvent> = {
  candidate:    { PRESENT: "presented", EXPIRE: "expired" },
  presented:    { ACKNOWLEDGE: "acknowledged", EXPIRE: "expired", DECLINE: "declined" },
  acknowledged: { CONTACT: "contacted", EXPIRE: "expired", DECLINE: "declined" },
  contacted:    { COMPLETE: "completed", EXPIRE: "expired", DECLINE: "declined" },
  completed:    {},
  expired:      {},
  declined:     {},
};

export const transitionMatch = createTransition(MATCH_MACHINE);

// ══════════════════════════════════════════════════
// MODERATION STATE MACHINE
// Phase 0 Foundation — definition only, no runtime wiring
// ══════════════════════════════════════════════════

type ModerationEvent =
  | "AUTO_APPROVE"
  | "AUTO_FLAG"
  | "AUTO_REJECT"
  | "MANUAL_APPROVE"
  | "MANUAL_FLAG"
  | "QUARANTINE"
  | "REMOVE"
  | "REINSTATE";

export const MODERATION_MACHINE: Machine<ModerationStatus, ModerationEvent> = {
  pending_review: { AUTO_APPROVE: "approved", AUTO_FLAG: "flagged", AUTO_REJECT: "removed", MANUAL_APPROVE: "approved", MANUAL_FLAG: "flagged", QUARANTINE: "quarantined" },
  approved:       { MANUAL_FLAG: "flagged", QUARANTINE: "quarantined", REMOVE: "removed" },
  flagged:        { REINSTATE: "approved", QUARANTINE: "quarantined", REMOVE: "removed" },
  quarantined:    { REINSTATE: "approved", REMOVE: "removed" },
  removed:        {},
};
