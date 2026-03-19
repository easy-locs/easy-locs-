/**
 * settlement-guard.ts — Settlement only proceeds if delivery is validated
 * and no review flags are present.
 */
import { supabase } from "@/integrations/supabase/client";
import { settleOrderPaymentV2 } from "@/lib/wallet/wallet-engine";

export async function settleOnlyIfValidated(orderId: string) {
  const { data: order } = await (supabase as any)
    .from("orders")
    .select("delivery_status, wallet_status, payment_status")
    .eq("id", orderId)
    .single();

  if (!order) throw new Error("Order not found");

  if (order.delivery_status !== "delivered_validated") {
    throw new Error("Settlement blocked: delivery not validated");
  }

  if (order.payment_status === "review_required") {
    throw new Error("Settlement blocked: review required");
  }

  return settleOrderPaymentV2({ orderId });
}
