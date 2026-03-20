import { supabase } from "@/integrations/supabase/client";

export type CreateEscrowInput = {
  orderId: string;
  customerUserId: string;
  merchantUserId?: string | null;
  amount: number;
  currency?: string;
};

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
      note: "Order escrow hold",
      owner_user_id: input.customerUserId,
      status: "posted",
    })
    .select("*")
    .single();

  if (error) throw error;

  const { error: orderErr } = await supabase
    .from("orders")
    .update({
      payment_status: "captured",
      settlement_status: "pending",
      escrow_amount: Number(input.amount ?? 0),
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", input.orderId);

  if (orderErr) throw orderErr;

  return data;
}

export async function releaseOrderEscrow(params: {
  orderId: string;
  merchantUserId?: string | null;
  amount: number;
  currency?: string;
}) {
  const currency = params.currency ?? "AED";

  const { data, error } = await (supabase as any)
    .from("wallet_ledger_entries")
    .insert({
      wallet_account_id: null,
      amount: Number(params.amount ?? 0),
      currency,
      direction: "in",
      entry_type: "escrow_release",
      reference_id: params.orderId,
      reference_type: "order",
      note: "Escrow release to merchant",
      owner_user_id: params.merchantUserId ?? null,
      status: "posted",
    })
    .select("*")
    .single();

  if (error) throw error;

  const { error: orderErr } = await supabase
    .from("orders")
    .update({
      settlement_status: "released",
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", params.orderId);

  if (orderErr) throw orderErr;

  return data;
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
      note: params.reason ?? "Order refund",
      owner_user_id: params.customerUserId,
      status: "posted",
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
