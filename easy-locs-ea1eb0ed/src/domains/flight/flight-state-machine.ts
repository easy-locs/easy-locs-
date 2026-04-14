import type { FlightStatus } from "./flight-types";

type Machine<S extends string, E extends string> = Record<S, Partial<Record<E, S>>>;

function createTransition<S extends string, E extends string>(machine: Machine<S, E>) {
  return (current: S, event: E): S | null => {
    const next = machine[current]?.[event];
    return next ?? null;
  };
}

export type FlightEvent =
  | "RESULTS_FOUND"
  | "REPRICE"
  | "SELECT"
  | "INITIATE_BOOKING"
  | "REQUEST_PAYMENT"
  | "CONFIRM_PAYMENT"
  | "START_TICKETING"
  | "TICKET_ISSUED"
  | "FAIL"
  | "CANCEL"
  | "REQUEST_REFUND"
  | "REFUND_COMPLETE"
  | "EXPIRE"
  | "RETRY";

export const FLIGHT_MACHINE: Machine<FlightStatus, FlightEvent> = {
  searching:             { RESULTS_FOUND: "priced", FAIL: "failed" },
  priced:                { SELECT: "selected", CANCEL: "cancelled" },
  selected:              { REPRICE: "priced", INITIATE_BOOKING: "booking_pending", CANCEL: "cancelled" },
  booking_pending:       { REQUEST_PAYMENT: "payment_pending", FAIL: "failed", EXPIRE: "cancelled", CANCEL: "cancelled" },
  payment_pending:       { CONFIRM_PAYMENT: "payment_confirmed", FAIL: "failed", EXPIRE: "cancelled", CANCEL: "cancelled" },
  payment_confirmed:     { START_TICKETING: "ticketing_in_progress", FAIL: "failed" },
  ticketing_in_progress: { TICKET_ISSUED: "ticketed", FAIL: "failed", RETRY: "ticketing_in_progress" },
  ticketed:              { REQUEST_REFUND: "refund_pending", CANCEL: "cancelled" },
  failed:                { RETRY: "searching", CANCEL: "cancelled" },
  cancelled:             { REQUEST_REFUND: "refund_pending" },
  refund_pending:        { REFUND_COMPLETE: "refunded", FAIL: "failed" },
  refunded:              {},
};

export const transitionFlight = createTransition(FLIGHT_MACHINE);

export function getValidEvents(status: FlightStatus): FlightEvent[] {
  const transitions = FLIGHT_MACHINE[status];
  return Object.keys(transitions) as FlightEvent[];
}

export function canTransitionFlight(current: FlightStatus, event: FlightEvent): boolean {
  return transitionFlight(current, event) !== null;
}

export function isTerminalState(status: FlightStatus): boolean {
  return Object.keys(FLIGHT_MACHINE[status]).length === 0;
}

export const FLIGHT_STATUS_META: Record<FlightStatus, { label: string; color: string; icon: string }> = {
  searching:             { label: "Searching",       color: "hsl(210 80% 52%)", icon: "🔍" },
  priced:                { label: "Results ready",   color: "hsl(var(--accent))",  icon: "💰" },
  selected:              { label: "Flight selected", color: "hsl(var(--accent))",  icon: "✈️" },
  booking_pending:       { label: "Booking...",      color: "hsl(var(--accent))",  icon: "⏳" },
  payment_pending:       { label: "Payment due",     color: "hsl(var(--accent))",  icon: "💳" },
  payment_confirmed:     { label: "Payment OK",      color: "hsl(142 71% 45%)", icon: "✅" },
  ticketing_in_progress: { label: "Issuing ticket",  color: "hsl(210 80% 52%)", icon: "🎫" },
  ticketed:              { label: "Ticketed",        color: "hsl(142 71% 45%)", icon: "🎟️" },
  failed:                { label: "Failed",          color: "hsl(0 72% 58%)",   icon: "❌" },
  cancelled:             { label: "Cancelled",       color: "hsl(0 0% 55%)",    icon: "🚫" },
  refund_pending:        { label: "Refund pending",  color: "hsl(var(--accent))",  icon: "🔄" },
  refunded:              { label: "Refunded",        color: "hsl(142 71% 45%)", icon: "💸" },
};
