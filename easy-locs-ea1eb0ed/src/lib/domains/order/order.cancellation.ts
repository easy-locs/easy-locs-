/**
 * order.cancellation — Cancellation rules and eligibility.
 */

import type { OrderStatus } from "./order.timeline";

export type CancellationReason =
  | "customer_request"
  | "merchant_unavailable"
  | "out_of_stock"
  | "driver_unavailable"
  | "payment_failed"
  | "fraud_detected"
  | "system_error";

export interface OrderCancellation {
  orderId: string;
  cancelledBy: "customer" | "merchant" | "system" | "driver";
  reason: CancellationReason;
  cancelledAt: string;
  refundEligible: boolean;
  penaltyApplied: boolean;
}

const CANCELLABLE_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
];

export function canCancel(status: OrderStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}

export function isRefundEligible(
  status: OrderStatus,
  cancelledBy: OrderCancellation["cancelledBy"]
): boolean {
  if (cancelledBy === "merchant" || cancelledBy === "system") return true;
  return status === "pending" || status === "confirmed";
}
