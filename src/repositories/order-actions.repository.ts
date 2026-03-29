/**
 * order-actions.repository — All storefront order mutation ops.
 */
import { supabase } from "@/integrations/supabase/client";

export async function updateOrderStatus(orderId: string, status: string) {
  await (supabase as any).from("storefront_orders")
    .update({ status, updated_at: new Date().toISOString() }).eq("id", orderId);
}

export async function updatePaymentStatus(orderId: string, updates: Record<string, any>) {
  await (supabase as any).from("storefront_orders").update(updates).eq("id", orderId);
}

export async function invokeDispatchRide(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("dispatch-ride", { body });
  if (error) throw error;
  return data;
}

export async function updateOrderDeliveryJob(orderId: string, jobId: string) {
  await (supabase as any).from("storefront_orders").update({
    delivery_job_id: jobId, delivery_requested: true,
    delivery_status: "searching", status: "preparing",
  }).eq("id", orderId);
}

export async function completeOrder(orderId: string) {
  await (supabase as any).from("storefront_orders").update({
    status: "completed", payment_status: "released",
    updated_at: new Date().toISOString(),
  }).eq("id", orderId);
}

export async function cancelOrder(orderId: string, reason?: string) {
  await (supabase as any).from("storefront_orders").update({
    status: "cancelled", notes: reason || "Cancelled by user",
    updated_at: new Date().toISOString(),
  }).eq("id", orderId);
}
