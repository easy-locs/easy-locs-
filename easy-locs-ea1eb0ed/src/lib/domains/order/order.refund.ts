/**
 * order.refund — Refund calculation and eligibility.
 */

export type RefundType = "full" | "partial" | "store_credit";

export interface OrderRefund {
  orderId: string;
  refundType: RefundType;
  amount: number;
  currency: string;
  reason: string;
  requestedAt: string;
  processedAt?: string;
  status: "requested" | "approved" | "processed" | "rejected";
}

export function calculateRefundAmount(
  orderTotal: number,
  refundType: RefundType,
  partialAmount?: number
): number {
  switch (refundType) {
    case "full":
      return orderTotal;
    case "partial":
      return Math.min(partialAmount ?? 0, orderTotal);
    case "store_credit":
      return orderTotal;
  }
}

export function canRequestRefund(orderStatus: string): boolean {
  return ["delivered", "completed"].includes(orderStatus);
}
