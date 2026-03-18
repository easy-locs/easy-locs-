/**
 * apply-wallet-credit — Credit/debit wallet credits for riders.
 */
import { supabase } from "@/integrations/supabase/client";

export async function applyWalletCredit(params: {
  userId: string;
  amount: number;
  direction: "credit" | "debit";
  reason: string;
  contextType?: string;
  contextId?: string | null;
}) {
  const { userId, amount, direction, reason, contextType, contextId } = params;

  const { data: row } = await supabase
    .from("user_wallet_credits" as any)
    .select("*")
    .eq("user_id", userId)
    .single();

  const current = Number((row as any)?.credits_amount || 0);
  const next =
    direction === "credit"
      ? current + amount
      : Math.max(0, current - amount);

  await supabase.from("user_wallet_credits" as any).upsert({
    user_id: userId,
    credits_amount: next,
    currency: "AED",
    updated_at: new Date().toISOString(),
  } as any);

  await supabase.from("wallet_credit_transactions" as any).insert({
    user_id: userId,
    amount,
    direction,
    reason,
    context_type: contextType ?? null,
    context_id: contextId ?? null,
  } as any);

  return { ok: true, balance: next };
}
