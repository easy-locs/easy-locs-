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
} from "@/lib/state-machines/canonical-machines";

export type {
  MessageState,
  CallState,
  UploadState,
  ConnectionState,
} from "@/lib/state-machines/canonical-machines";
