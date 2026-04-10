/**
 * wallet-balance-fetcher — Fetch detailed balance breakdown (available / escrow / pending).
 * Reads from wallet_balances_v2 (breakdown table — distinct from wallet_accounts.balance).
 *
 * SSOT alignment:
 *   - walletId is resolved from useWalletStore first (no wallet_accounts round-trip).
 *   - Falls back to wallet_accounts query only when store is not yet hydrated.
 */
import { db } from "@/services/db";
import { withHealthTracking } from "@/lib/runtime/domain-health-bridge";
import { useWalletStore } from "@/stores/walletStore";
import { getWalletDefaultCurrency } from "./wallet-config";

export interface WalletBalance {
  walletId: string;
  available: number;
  escrow: number;
  pending: number;
  currency: string;
}

export async function fetchWalletBalance(userId: string): Promise<WalletBalance | null> {
  return withHealthTracking("wallet", "fetchBalance", async () => {
    // Try to get walletId from canonical store first — eliminates wallet_accounts round-trip
    const storeWallet = useWalletStore.getState().wallet;
    let walletId: string | null = storeWallet?.walletId ?? null;
    let currency: string = storeWallet?.currency ?? getWalletDefaultCurrency();

    if (!walletId) {
      // Store not hydrated — fall back to DB for walletId resolution
      const { data: account } = await db
        .from("wallet_accounts")
        .select("id, currency")
        .eq("owner_user_id", userId)
        .maybeSingle();

      if (!account) return null;
      walletId = account.id as string;
      currency = account.currency ?? getWalletDefaultCurrency();
    }

    // Always read the detailed breakdown from wallet_balances_v2
    // (this table is distinct from wallet_accounts.balance and is the SSOT for available/escrow/pending)
    const { data: bal } = await db
      .from("wallet_balances_v2")
      .select("available, escrow, pending")
      .eq("wallet_id", walletId)
      .maybeSingle();

    return {
      walletId,
      available: bal?.available ?? 0,
      escrow: bal?.escrow ?? 0,
      pending: bal?.pending ?? 0,
      currency,
    };
  });
}
