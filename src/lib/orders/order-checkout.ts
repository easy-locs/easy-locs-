import { supabase } from "@/integrations/supabase/client";
import { updateOrderStatus } from "@/lib/orders/orders-core";
import { walletTransfer } from "@/payments/wallet-hooks";
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

  // Use wallet transfer for payment
  await walletTransfer({
    senderId: params.buyerWalletId,
    recipientId: params.merchantWalletId,
    amount: Number(order.total_amount),
    currency: order.currency ?? "AED",
    contextType: "order",
    contextId: order.id,
    title: "Order payment",
  });

  await updateOrderStatus({ orderId: order.id, status: "paid" });
  return createDispatchFromOrder(order.id);
}
