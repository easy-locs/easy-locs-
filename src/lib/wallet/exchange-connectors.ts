import { supabase } from "@/integrations/supabase/client";
import { postWalletEntry, refreshWalletBalance } from "@/lib/wallet/wallet-core";

export async function createExchangeQuote(params: {
  connectorId?: string;
  pairCode: string;
  side: "buy" | "sell";
  baseCurrency: string;
  quoteCurrency: string;
  baseAmount: number;
  rate: number;
  feeRate?: number;
  expiresInMinutes?: number;
}) {
  const feeRate = params.feeRate ?? 0.01;
  const quoteAmount = Number((params.baseAmount * params.rate).toFixed(8));
  const feeAmount = Number((quoteAmount * feeRate).toFixed(8));
  const expiresAt = new Date(Date.now() + (params.expiresInMinutes ?? 10) * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("exchange_quotes")
    .insert({
      connector_id: params.connectorId ?? null,
      pair_code: params.pairCode,
      side: params.side,
      base_currency: params.baseCurrency,
      quote_currency: params.quoteCurrency,
      base_amount: params.baseAmount,
      quote_amount: quoteAmount,
      rate: params.rate,
      fee_amount: feeAmount,
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function createExchangeOrder(params: {
  workspaceId?: string;
  userId?: string;
  walletAccountId?: string;
  connectorId?: string;
  quoteId?: string;
  side: "buy" | "sell";
  pairCode: string;
  baseCurrency: string;
  quoteCurrency: string;
  baseAmount: number;
  quoteAmount: number;
  executedRate: number;
  feeAmount?: number;
}) {
  const { data, error } = await supabase
    .from("exchange_orders")
    .insert({
      workspace_id: params.workspaceId ?? null,
      user_id: params.userId ?? null,
      wallet_account_id: params.walletAccountId ?? null,
      connector_id: params.connectorId ?? null,
      quote_id: params.quoteId ?? null,
      side: params.side,
      pair_code: params.pairCode,
      base_currency: params.baseCurrency,
      quote_currency: params.quoteCurrency,
      base_amount: params.baseAmount,
      quote_amount: params.quoteAmount,
      executed_rate: params.executedRate,
      fee_amount: params.feeAmount ?? 0,
      status: "submitted",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function settleExchangeOrder(params: {
  orderId: string;
  walletAccountId: string;
  side: "buy" | "sell";
  settlementCurrency: string;
  settlementAmount: number;
}) {
  await postWalletEntry({
    walletAccountId: params.walletAccountId,
    direction: params.side === "buy" ? "credit" : "debit",
    amount: params.settlementAmount,
    currency: params.settlementCurrency,
    entryType: "exchange_settlement",
    referenceType: "exchange_order",
    referenceId: params.orderId,
  });

  await refreshWalletBalance(params.walletAccountId);

  const { data, error } = await supabase
    .from("exchange_orders")
    .update({
      status: "filled",
      completed_at: new Date().toISOString(),
    })
    .eq("id", params.orderId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
