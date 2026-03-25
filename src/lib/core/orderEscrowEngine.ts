import { supabase } from "@/integrations/supabase/client";

export type CreateEscrowInput = {
  orderId: string;
  customerUserId: string;
  merchantUserId?: string | null;
  amount: number;
  currency?: string;
};

const PLATFORM_RATE = 0.05; // 5%
const DRIVER_RATE = 0.10;   // 10%

export async function createOrderEscrow(input: CreateEscrowInput) {
  const currency = input.currency ?? "AED";

  const { data, error } = await (supabase as any)
    .from("wallet_ledger_entries")
    .insert({
      wallet_account_id: null,
      amount: Number(input.amount ?? 0),
      currency,
      direction: "out",
      entry_type: "escrow_hold",
      reference_id: input.orderId,
      reference_type: "order",
      status: "posted",
      metadata: { type: "escrow_hold", customer_user_id: input.customerUserId },
    })
    .select("*")
    .single();

  if (error) throw error;

  const { error: orderErr } = await supabase
    .from("orders")
    .update({
      payment_status: "captured",
      settlement_status: "pending",
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", input.orderId);

  if (orderErr) throw orderErr;

  return data;
}

export async function releaseOrderEscrow(params: {
  orderId: string;
  merchantUserId?: string | null;
  driverUserId?: string | null;
  amount: number;
  currency?: string;
}) {
  const currency = params.currency ?? "AED";
  const totalAmount = Number(params.amount ?? 0);
  const platformAmount = Math.round(totalAmount * PLATFORM_RATE * 100) / 100;
  const driverAmount = params.driverUserId
    ? Math.round(totalAmount * DRIVER_RATE * 100) / 100
    : 0;
  const storeAmount = Math.round((totalAmount - platformAmount - driverAmount) * 100) / 100;

  // 1. Escrow release ledger entry
  const { error: ledgerErr } = await (supabase as any)
    .from("wallet_ledger_entries")
    .insert({
      wallet_account_id: null,
      amount: totalAmount,
      currency,
      direction: "in",
      entry_type: "escrow_release",
      reference_id: params.orderId,
      reference_type: "order",
      status: "posted",
      metadata: { merchant_user_id: params.merchantUserId },
    });

  if (ledgerErr) throw ledgerErr;

  // 2. Commission split
  const { error: splitErr } = await (supabase as any)
    .from("commission_splits")
    .insert({
      order_id: params.orderId,
      total_amount: totalAmount,
      currency,
      platform_amount: platformAmount,
      platform_rate: PLATFORM_RATE,
      store_amount: storeAmount,
      store_rate: 1 - PLATFORM_RATE - (params.driverUserId ? DRIVER_RATE : 0),
      driver_amount: driverAmount,
      driver_rate: params.driverUserId ? DRIVER_RATE : 0,
      store_user_id: params.merchantUserId ?? null,
      driver_user_id: params.driverUserId ?? null,
      status: "settled",
      settled_at: new Date().toISOString(),
    });

  if (splitErr) console.error("[escrow] commission_splits insert failed:", splitErr.message);

  // 3. Settlement ledger
  const { error: settlErr } = await (supabase as any)
    .from("settlement_ledger")
    .insert({
      merchant_id: params.merchantUserId ?? null,
      order_id: params.orderId,
      gross_amount: totalAmount,
      platform_fee: platformAmount,
      processing_fee: 0,
      net_amount: storeAmount,
      currency,
      status: "settled",
    });

  if (settlErr) console.error("[escrow] settlement_ledger insert failed:", settlErr.message);

  // 4. Update order
  const { error: orderErr } = await supabase
    .from("orders")
    .update({
      settlement_status: "released",
      platform_commission_amount: platformAmount,
      merchant_net_amount: storeAmount,
      driver_amount: driverAmount,
      gross_amount: totalAmount,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", params.orderId);

  if (orderErr) throw orderErr;

  return { totalAmount, platformAmount, storeAmount, driverAmount };
}

export async function refundOrderEscrow(params: {
  orderId: string;
  customerUserId: string;
  amount: number;
  currency?: string;
  reason?: string;
}) {
  const currency = params.currency ?? "AED";

  const { data, error } = await (supabase as any)
    .from("wallet_ledger_entries")
    .insert({
      wallet_account_id: null,
      amount: Number(params.amount ?? 0),
      currency,
      direction: "in",
      entry_type: "refund",
      reference_id: params.orderId,
      reference_type: "order",
      status: "posted",
      metadata: { reason: params.reason ?? "refund", customer_user_id: params.customerUserId },
    })
    .select("*")
    .single();

  if (error) throw error;

  const { error: orderErr } = await supabase
    .from("orders")
    .update({
      status: "refunded",
      payment_status: "refunded",
      settlement_status: "refunded",
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", params.orderId);

  if (orderErr) throw orderErr;

  return data;
}
