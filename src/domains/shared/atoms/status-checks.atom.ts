/**
 * ATOM: Status checks — Pure predicates for state machine statuses.
 */
import type { PaymentStatus, OrderStatus, DriverStatus } from "../canonical-types";

const PAYMENT_TERMINAL: ReadonlySet<PaymentStatus> = new Set(["captured", "failed", "refunded", "cancelled"]);
const ORDER_TERMINAL: ReadonlySet<OrderStatus> = new Set(["delivered", "cancelled", "failed"]);
const DRIVER_TERMINAL: ReadonlySet<DriverStatus> = new Set(["completed", "offline"]);

export function isPaymentTerminal(s: PaymentStatus): boolean {
  return PAYMENT_TERMINAL.has(s);
}

export function isOrderTerminal(s: OrderStatus): boolean {
  return ORDER_TERMINAL.has(s);
}

export function isDriverTerminal(s: DriverStatus): boolean {
  return DRIVER_TERMINAL.has(s);
}

export function isPaymentActionable(s: PaymentStatus): boolean {
  return !PAYMENT_TERMINAL.has(s);
}
