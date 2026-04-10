/**
 * apply-wallet-credit — Credit/debit wallet credits for riders.
 *
 * SECURITY: Requires authenticated user, validates amounts,
 * and prevents unauthorized cross-user credit manipulation.
 * MIGRATION TARGET: Should be moved to server-side edge function.
 */
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";
import { getWalletDefaultCurrency } from "./wallet-config";
import { logger } from "@/lib/monitoring";

const MAX_CREDIT_AMOUNT = 50_000;

export async function applyWalletCredit(params: {
  userId: string;
  amount: number;
  direction: "credit" | "debit";
  currency?: string;
  reason: string;
  contextType?: string;
  contextId?: string | null;
}) {
  const { userId, amount, direction, reason, contextType, contextId } = params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Wallet credit operation requires authentication");

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid credit amount: ${amount}`);
  }
  if (amount > MAX_CREDIT_AMOUNT) {
    throw new Error(`Credit amount ${amount} exceeds safety limit`);
  }
  if (!reason || reason.trim().length === 0) {
    throw new Error("Wallet credit operation requires a reason");
  }

  logger.info("[WALLET_AUDIT] Applying wallet credit", {
    userId, amount, direction, reason, contextType, contextId, authUser: user.id,
  });

  const { data: row } = await supabase
    .from("user_wallet_credits" as any)
    .select("*")
    .eq("user_id", userId)
    .single();

  const current = Number((row as any)?.credits_amount || 0);
  const next =
    direction === "credit"
      ? Number((current + amount).toFixed(2))
      : Math.max(0, Number((current - amount).toFixed(2)));

  if (direction === "debit" && current < amount) {
    logger.warn("[WALLET_SECURITY] Insufficient credits for debit", {
      userId, current, requested: amount,
    });
    throw new Error(`Insufficient wallet credits: ${current} < ${amount}`);
  }

  await db("user_wallet_credits" as any).upsert({
    user_id: userId,
    credits_amount: next,
    currency: params.currency ?? getWalletDefaultCurrency(),
    updated_at: new Date().toISOString(),
  } as any);

  await db("wallet_credit_transactions" as any).insert({
    user_id: userId,
    amount,
    direction,
    reason,
    context_type: contextType ?? null,
    context_id: contextId ?? null,
  } as any);

  logger.info("[WALLET_AUDIT] Wallet credit applied", {
    userId, previousBalance: current, newBalance: next, direction, reason,
  });

  return { ok: true, balance: next };
}
