/**
 * Delivery Validation — Completion verification before settlement.
 * Supports customer code, QR confirm, merchant confirm, and future photo/signature hooks.
 */
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";

export type ValidationMethod = "customer_code" | "qr_confirm" | "merchant_confirm" | "photo" | "signature";

// ── 1. Validate delivery ──────────────────────────────────
export async function validateDelivery(params: {
  orderId: string;
  dispatchJobId: string;
  method: ValidationMethod;
  validationCode?: string;
  actorUserId?: string;
}) {
  const now = new Date().toISOString();

  // Get the dispatch job
  const { data: job } = await (supabase as any)
    .from("dispatch_jobs_v2")
    .select("dispatch_status")
    .eq("id", params.dispatchJobId)
    .single();

  if (!job) throw new Error("Dispatch job not found");

  // Must be in delivered or delivered_unvalidated state
  const validStates = ["delivered", "in_progress"];
  if (!validStates.includes(job.dispatch_status)) {
    throw new Error(`Cannot validate delivery in state: ${job.dispatch_status}`);
  }

  // For customer_code validation, verify the code matches
  if (params.method === "customer_code" && params.validationCode) {
    const { data: order } = await (supabase as any)
      .from("orders")
      .select("delivery_code")
      .eq("id", params.orderId)
      .single();

    if (order?.delivery_code && order.delivery_code !== params.validationCode) {
      throw new Error("Invalid delivery code");
    }
  }

  // Update dispatch job
  await (supabase as any)
    .from("dispatch_jobs_v2")
    .update({
      dispatch_status: "validated",
      validated_at: now,
      updated_at: now,
    } as any)
    .eq("id", params.dispatchJobId);

  // Update order
  await (supabase as any)
    .from("orders")
    .update({
      delivery_status: "delivered_validated",
      delivery_validated_at: now,
      delivery_validation_method: params.method,
    } as any)
    .eq("id", params.orderId);

  // Emit validation event — triggers settlement
  platformBus.emit("delivery:validated" as any, {
    orderId: params.orderId,
    dispatchJobId: params.dispatchJobId,
    method: params.method,
    validatedAt: now,
  }, "tracking");

  return { ok: true, validatedAt: now };
}

// ── 2. Mark delivered but not yet validated ────────────────
export async function markDeliveredUnvalidated(params: {
  orderId: string;
  dispatchJobId: string;
}) {
  const now = new Date().toISOString();

  await (supabase as any)
    .from("dispatch_jobs_v2")
    .update({
      dispatch_status: "delivered",
      delivered_at: now,
      updated_at: now,
    } as any)
    .eq("id", params.dispatchJobId);

  await (supabase as any)
    .from("orders")
    .update({ delivery_status: "delivered_unvalidated" } as any)
    .eq("id", params.orderId);

  platformBus.emit("delivery:delivered" as any, {
    orderId: params.orderId,
    dispatchJobId: params.dispatchJobId,
    status: "delivered_unvalidated",
  }, "tracking");

  return { ok: true };
}
