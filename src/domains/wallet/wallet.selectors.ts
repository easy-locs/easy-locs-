/**
 * SELECTORS: Wallet — Read-only derived views from wallet state.
 */
import type { CanonicalWalletState, CanonicalWalletTransaction } from "@/domains/shared/canonical-types";
import { formatMoney } from "@/domains/shared/atoms/format-money.atom";
import { isPaymentTerminal } from "@/domains/shared/atoms/status-checks.atom";

export function selectFormattedBalance(state: CanonicalWalletState | null): string {
  if (!state) return "—";
  return formatMoney(state.availableBalance, state.currency);
}

export function selectTotalBalance(state: CanonicalWalletState | null): number {
  if (!state) return 0;
  return state.availableBalance + state.escrowBalance + state.pendingBalance;
}

export function selectPendingTransactions(txs: CanonicalWalletTransaction[]): CanonicalWalletTransaction[] {
  return txs.filter((tx) => tx.status === "pending");
}

export function selectRecentTransactions(txs: CanonicalWalletTransaction[], limit = 10): CanonicalWalletTransaction[] {
  return [...txs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}
