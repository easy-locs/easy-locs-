/**
 * wallet-selectors — Atomic unit: derived wallet state selectors.
 * Single responsibility: compute display values from wallet balance.
 */
import type { WalletBalance } from "./wallet-balance-fetcher";

export function selectTotalBalance(b: WalletBalance | null): number {
  if (!b) return 0;
  return b.available + b.escrow + b.pending;
}

export function selectAvailableBalance(b: WalletBalance | null): number {
  return b?.available ?? 0;
}

export function selectHasEscrow(b: WalletBalance | null): boolean {
  return (b?.escrow ?? 0) > 0;
}

export function selectIsLowBalance(b: WalletBalance | null, threshold = 10): boolean {
  return (b?.available ?? 0) < threshold;
}

export function selectBalanceSummary(b: WalletBalance | null) {
  if (!b) return { available: 0, escrow: 0, pending: 0, total: 0, currency: "AED" };
  return {
    available: b.available,
    escrow: b.escrow,
    pending: b.pending,
    total: b.available + b.escrow + b.pending,
    currency: b.currency,
  };
}
