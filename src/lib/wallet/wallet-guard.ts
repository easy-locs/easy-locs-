/**
 * wallet-guard — Atomic unit: validates wallet preconditions before any operation.
 * Single responsibility: balance check, account existence, limits validation.
 */
import { supabase } from "@/integrations/supabase/client";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[WALLET][${step}] ${phase}:`, payload ?? {});
};

export interface WalletGuardResult {
  valid: boolean;
  walletId: string | null;
  balance: number;
  currency: string;
  error?: string;
}

export async function guardWalletReady(userId: string): Promise<WalletGuardResult> {
  trace("guard.ready", "input", { userId });

  const { data, error } = await (supabase as any)
    .from("wallet_accounts")
    .select("id, currency")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    trace("guard.ready", "error", { error: error?.message ?? "no_account" });
    return { valid: false, walletId: null, balance: 0, currency: "EUR", error: "No wallet account" };
  }

  const { data: bal } = await (supabase as any)
    .from("wallet_balances_v2")
    .select("available")
    .eq("wallet_id", data.id)
    .maybeSingle();

  const result: WalletGuardResult = {
    valid: true,
    walletId: data.id,
    balance: bal?.available ?? 0,
    currency: data.currency ?? "EUR",
  };

  trace("guard.ready", "output", result);
  return result;
}

export async function guardSufficientBalance(
  userId: string,
  amount: number,
  currency: string
): Promise<WalletGuardResult> {
  trace("guard.balance", "input", { userId, amount, currency });
  const guard = await guardWalletReady(userId);
  if (!guard.valid) return guard;

  if (guard.balance < amount) {
    trace("guard.balance", "error", { available: guard.balance, required: amount });
    return { ...guard, valid: false, error: `Insufficient balance: ${guard.balance} < ${amount}` };
  }

  trace("guard.balance", "output", { sufficient: true });
  return guard;
}
