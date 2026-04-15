/**
 * wallet-balance-fetcher — Fetch detailed balance breakdown (available / escrow / pending).
 *
 * SSOT alignment:
 *   - walletId is resolved from useWalletStore first (no wallet_accounts round-trip).
 *   - Falls back to wallet repository query only when store is not yet hydrated.
 *   - All DB access goes through wallet-repository.ts (column adapter layer).
 */
import { withHealthTracking } from "@/lib/runtime/domain-health-bridge";
import { useWalletStore } from "@/stores/walletStore";
import { getWalletDefaultCurrency } from "./wallet-config";
import {
  fetchWalletBalanceByWalletId,
  fetchWalletBalanceByUserId,
  type WalletBalanceBreakdown,
} from "@/repositories/wallet-repository";

export type WalletBalance = WalletBalanceBreakdown;

export async function fetchWalletBalance(userId: string): Promise<WalletBalance | null> {
  return withHealthTracking("wallet", "fetchBalance", async () => {
    const storeWallet = useWalletStore.getState().wallet;
    const walletId: string | null = storeWallet?.walletId ?? null;

    if (walletId) {
      const result = await fetchWalletBalanceByWalletId(walletId);
      if (result) return result;
    }

    return fetchWalletBalanceByUserId(userId);
  });
}
