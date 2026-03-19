/**
 * kitchen-guard.ts — Ensures payment is captured before pushing to kitchen.
 */
import { supabase } from "@/integrations/supabase/client";

export async function pushOrderToKitchenIfPaid(orderId: string) {
  const { data: order } = await (supabase as any)
    .from("orders")
    .select("wallet_status")
    .eq("id", orderId)
    .single();

  if (order?.wallet_status !== "captured") {
    throw new Error("Kitchen push blocked: payment not captured");
  }

  await (supabase as any)
    .from("pos_orders")
    .update({ kitchen_status: "new" })
    .eq("order_id", orderId);

  return { ok: true };
}
