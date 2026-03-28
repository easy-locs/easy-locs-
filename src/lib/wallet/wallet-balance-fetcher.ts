/**
 * wallet-balance-fetcher — Atomic unit: fetch wallet balance from DB.
 * Single responsibility: read wallet balance state.
 */
import { supabase } from "@/integrations/supabase/client";
import { withHealthTracking } from "@/lib/runtime/domain-health-bridge";

export interface WalletBalance {
  walletId: string;
  available: number;
  escrow: number;
  pending: number;
  currency: string;
}

export async function fetchWalletBalance(userId: string): Promise<WalletBalance | null> {
  return withHealthTracking("wallet", "fetchBalance", async () => {
    const { data: account } = await (supabase as any)
      .from("wallet_accounts")
      .select("id, currency")
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (!account) return null;

    const { data: bal } = await (supabase as any)
      .from("wallet_balances_v2")
      .select("available, escrow, pending")
      .eq("wallet_id", account.id)
      .maybeSingle();

    return {
      walletId: account.id,
      available: bal?.available ?? 0,
      escrow: bal?.escrow ?? 0,
      pending: bal?.pending ?? 0,
      currency: account.currency ?? "AED",
    };
  });
}
