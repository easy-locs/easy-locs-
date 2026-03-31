/**
 * ATOM: Wallet-specific pure predicates.
 */
import type { CurrencyCode } from "@/domains/shared/canonical-types";

export function isValidAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0;
}

export function isValidCurrency(c: string): c is CurrencyCode {
  return ["AED", "USD", "EUR", "SAR", "GBP"].includes(c);
}

export function buildWalletReference(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
