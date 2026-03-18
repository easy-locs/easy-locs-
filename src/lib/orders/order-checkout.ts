import { supabase } from "@/integrations/supabase/client";
import { updateOrderStatus } from "@/lib/orders/orders-core";
import { settleOrderPayment } from "@/lib/wallet/payments-v1";
import { createDispatchFromOrder } from "@/lib/orders/order-dispatch-bridge";

export async function checkoutFoodDeliveryOrder(params: {
  orderId: string;
  buyerWalletId: string;
  merchantWalletId: string;
  platformWalletId?: string;
  feePct?: number;
}) {
  const { data: order, error } = await (supabase as any)
    .from("orders")
    .select("*")
    .eq("id", params.orderId)
    .single();

  if (error) throw error;

  await updateOrderStatus({ orderId: order.id, status: "pending_payment" });

  await settleOrderPayment({
    workspaceId: order.workspace_id ?? undefined,
    buyerWalletId: params.buyerWalletId,
    merchantWalletId: params.merchantWalletId,
    platformWalletId: params.platformWalletId,
    amount: Number(order.total_amount),
    feePct: params.feePct ?? 0,
    currency: order.currency ?? "AED",
    orderId: order.id,
  });

  await updateOrderStatus({ orderId: order.id, status: "paid" });
  return createDispatchFromOrder(order.id);
}
