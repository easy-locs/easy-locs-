/**
 * Delivery Settlement — Triggers wallet settlement after delivery validation.
 * Uses the unified wallet engine (settleOrderPaymentV2) — no separate payment system.
 */
import { supabase } from "@/integrations/supabase/client";
import { settleOrderPaymentV2, reverseOrderPayment } from "@/lib/wallet/wallet-engine";
import { platformBus } from "@/lib/shared/platform-bus";
import { handleSelfDeliverySettlement } from "@/lib/dispatch/dispatch-wallet-link";

// ── 1. Settle validated delivery ──────────────────────────
export async function settleValidatedDelivery(orderId: string) {
  // Get order state
  const { data: order } = await (supabase as any)
    .from("orders")
    .select("id, delivery_status, payment_status, wallet_status, status")
    .eq("id", orderId)
    .single();

  if (!order) throw new Error("Order not found");

  // Guards
  if (order.delivery_status !== "delivered_validated") {
    throw new Error(`Cannot settle: delivery_status is ${order.delivery_status}, expected delivered_validated`);
  }
  if (order.wallet_status === "settled") {
    return { ok: true, alreadySettled: true };
  }
  if (order.wallet_status === "reversed") {
    throw new Error("Cannot settle: order has been reversed");
  }
  if (order.payment_status === "review_required") {
    throw new Error("Cannot settle: order is under review");
  }

  // Check for self-delivery dispatch
  const { data: job } = await (supabase as any)
    .from("dispatch_jobs_v2")
    .select("dispatch_status")
    .eq("order_id", orderId)
    .maybeSingle();

  if (job?.dispatch_status === "self_delivery") {
    await handleSelfDeliverySettlement({ orderId });
  }

  // Settle via unified wallet engine
  const result = await settleOrderPaymentV2({ orderId });

  platformBus.emit("commerce:payment_settled", {
    orderId,
    stage: "delivery_settled",
  }, "wallet");

  return { ok: true, result };
}

// ── 2. Fail delivery ──────────────────────────────────────
export async function failDelivery(orderId: string, reason: string) {
  // Update order
  await (supabase as any)
    .from("orders")
    .update({ delivery_status: "failed_delivery" } as any)
    .eq("id", orderId);

  // Update dispatch job
  await (supabase as any)
    .from("dispatch_jobs_v2")
    .update({
      dispatch_status: "failed",
      ai_dispatch_metadata: { failure_reason: reason },
      updated_at: new Date().toISOString(),
    } as any)
    .eq("order_id", orderId);

  platformBus.emit("delivery:failed" as any, {
    orderId,
    reason,
  }, "tracking");

  // If payment was captured, reverse it
  try {
    await reverseOrderPayment({ orderId, reason: `delivery_failed: ${reason}` });
  } catch (e) {
    console.warn("[delivery-settlement] Reverse after failure skipped:", e);
  }

  return { ok: true };
}

// ── 3. Cancel before pickup ───────────────────────────────
export async function cancelBeforePickup(orderId: string) {
  // Update order
  await (supabase as any)
    .from("orders")
    .update({
      status: "cancelled",
      delivery_status: null,
    } as any)
    .eq("id", orderId);

  // Cancel dispatch job
  await (supabase as any)
    .from("dispatch_jobs_v2")
    .update({
      dispatch_status: "cancelled",
      updated_at: new Date().toISOString(),
    } as any)
    .eq("order_id", orderId);

  // Expire all offers
  await (supabase as any)
    .from("driver_mission_offers")
    .update({ offer_status: "expired" } as any)
    .eq("dispatch_job_id", (
      await (supabase as any)
        .from("dispatch_jobs_v2")
        .select("id")
        .eq("order_id", orderId)
        .maybeSingle()
    ).data?.id)
    .in("offer_status", ["sent"]);

  // Reverse payment
  try {
    await reverseOrderPayment({ orderId, reason: "cancelled_before_pickup" });
  } catch (e) {
    console.warn("[delivery-settlement] Reverse on cancel skipped:", e);
  }

  platformBus.emit("commerce:order_cancelled" as any, {
    orderId,
    reason: "cancelled_before_pickup",
  }, "system");

  return { ok: true };
}
