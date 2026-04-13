import { db as supabase } from "@/services/db";
import {
  releaseEscrowToMerchant,
  postRefundToCustomer,
  postWalletTransaction,
} from "@/lib/wallet/ledger";
import { platformBus } from "@/lib/shared/platform-bus";

export async function settleDeliveredOrder(params: {
  orderId: string;
  merchantUserId: string;
  amount: number;
  currency?: string;
  driverUserId?: string | null;
  driverFee?: number;
  platformFee?: number;
}) {
  const currency = params.currency ?? "AED";
  const driverFee = Number(params.driverFee ?? 0);
  const platformFee = Number(params.platformFee ?? 0);
  const merchantNet = Math.max(0, Number(params.amount || 0) - driverFee - platformFee);

  if (merchantNet > 0) {
    await releaseEscrowToMerchant({
      merchantUserId: params.merchantUserId,
      amount: merchantNet,
      currency,
      orderId: params.orderId,
    });
  }

  if (params.driverUserId && driverFee > 0) {
    await postWalletTransaction({
      ownerUserId: params.driverUserId,
      amount: driverFee,
      currency,
      direction: "in",
      entryType: "payout",
      referenceId: params.orderId,
      referenceType: "order",
      note: "Driver payout",
    });
  }

  const { error } = await supabase
    .from("orders")
    .update({
      settlement_status: "released",
      merchant_net_amount: merchantNet,
      driver_fee_amount: driverFee,
      platform_fee_amount: platformFee,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", params.orderId);

  if (error) throw error;

  platformBus.emit(
    "ORDER_SETTLED",
    {
      orderId: params.orderId,
      merchantUserId: params.merchantUserId,
      merchantNet,
      driverUserId: params.driverUserId ?? null,
      driverFee,
      platformFee,
      currency,
    },
    "system"
  );

  return { orderId: params.orderId, merchantNet, driverFee, platformFee, currency };
}

export async function refundDisputedOrder(params: {
  orderId: string;
  customerUserId: string;
  amount: number;
  currency?: string;
  reason?: string;
}) {
  const currency = params.currency ?? "AED";

  await postRefundToCustomer({
    customerUserId: params.customerUserId,
    amount: params.amount,
    currency,
    orderId: params.orderId,
  });

  const { error } = await supabase
    .from("orders")
    .update({
      status: "refunded",
      settlement_status: "refunded",
      refund_reason: params.reason ?? null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", params.orderId);

  if (error) throw error;

  platformBus.emit(
    "ORDER_REFUNDED",
    {
      orderId: params.orderId,
      customerUserId: params.customerUserId,
      amount: params.amount,
      currency,
      reason: params.reason ?? "",
    },
    "system"
  );

  return { orderId: params.orderId, amount: params.amount, currency };
}

export async function autoSettleCompletedOrders(limit = 50) {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("status", "completed")
    .or("settlement_status.is.null,settlement_status.eq.pending")
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const results: Array<{ orderId: string; ok: boolean; error?: string }> = [];

  for (const order of orders ?? []) {
    try {
      await settleDeliveredOrder({
        orderId: order.id,
        merchantUserId: (order as any).merchant_user_id,
        amount: Number((order as any).total_amount ?? 0),
        currency: (order as any).currency ?? "AED",
        driverUserId: (order as any).driver_id ?? null,
        driverFee: Number((order as any).driver_fee_amount ?? 0),
        platformFee: Number((order as any).platform_fee_amount ?? 0),
      });
      results.push({ orderId: order.id, ok: true });
    } catch (err: any) {
      results.push({ orderId: order.id, ok: false, error: err.message || "Settlement failed" });
    }
  }

  return results;
}
