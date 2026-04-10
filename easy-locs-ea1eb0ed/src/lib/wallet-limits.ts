/**
 * wallet-limits — Daily transfer limits & large transaction warnings
 * PASS61: Wallet Hardening
 */

/** Daily LOCS transfer limits per tier */
export const DAILY_TRANSFER_LIMITS = {
  default: 5000,
  verified: 20000,
  premium: 100000,
} as const;

/** Threshold for "large transaction" warning */
export const LARGE_TX_THRESHOLD = 500;

/** Check if a transfer amount would exceed daily limit */
export function checkDailyLimit(
  todaySpent: number,
  amount: number,
  tier: keyof typeof DAILY_TRANSFER_LIMITS = "default"
): { allowed: boolean; remaining: number; limit: number } {
  const limit = DAILY_TRANSFER_LIMITS[tier];
  const remaining = Math.max(0, limit - todaySpent);
  return {
    allowed: amount <= remaining,
    remaining,
    limit,
  };
}

/** Returns true if the amount triggers a large transaction warning */
export function isLargeTransaction(amount: number): boolean {
  return amount >= LARGE_TX_THRESHOLD;
}

/** Format limit info for display */
export function formatLimitInfo(remaining: number, limit: number): string {
  const pct = Math.round((remaining / limit) * 100);
  return `${remaining.toLocaleString()} / ${limit.toLocaleString()} LOCS (${pct}%)`;
}
