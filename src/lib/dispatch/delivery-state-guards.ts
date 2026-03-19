/**
 * Delivery State Guards — Service-level validation for milestone transitions.
 */
import type { DeliveryMilestone } from "@/lib/dispatch/dispatch-live-tracking";

const MILESTONE_ORDER: DeliveryMilestone[] = [
  "driver_arriving_pickup",
  "picked_up",
  "in_progress",
  "delivered",
];

const DISPATCH_STATUS_RANK: Record<string, number> = {
  assigned: 0,
  accepted: 0,
  driver_arriving_pickup: 1,
  picked_up: 2,
  in_progress: 3,
  delivered: 4,
  validated: 5,
};

export function canAdvanceToMilestone(currentDispatchStatus: string, target: DeliveryMilestone): { ok: boolean; reason?: string } {
  const currentRank = DISPATCH_STATUS_RANK[currentDispatchStatus];
  const targetRank = DISPATCH_STATUS_RANK[target];

  if (currentRank === undefined) return { ok: false, reason: `Cannot advance from status: ${currentDispatchStatus}` };
  if (targetRank === undefined) return { ok: false, reason: `Unknown target milestone: ${target}` };
  if (targetRank <= currentRank) return { ok: false, reason: `Already at or past ${target}` };
  if (targetRank > currentRank + 1) return { ok: false, reason: `Must complete intermediate milestones first` };

  return { ok: true };
}

export function canValidateDelivery(deliveryStatus: string | null): { ok: boolean; reason?: string } {
  if (deliveryStatus !== "delivered_unvalidated") {
    return { ok: false, reason: `Cannot validate: delivery status is ${deliveryStatus}, expected delivered_unvalidated` };
  }
  return { ok: true };
}

export function canSettleDelivery(deliveryStatus: string | null, walletStatus: string | null, paymentStatus: string | null): { ok: boolean; reason?: string } {
  if (deliveryStatus !== "delivered_validated") return { ok: false, reason: "Delivery not yet validated" };
  if (walletStatus === "settled") return { ok: false, reason: "Already settled" };
  if (walletStatus === "reversed") return { ok: false, reason: "Already reversed" };
  if (paymentStatus === "review_required") return { ok: false, reason: "Payment under review" };
  return { ok: true };
}

export function isTerminalStatus(status: string): boolean {
  return ["delivered", "validated", "failed", "cancelled", "expired"].includes(status);
}
