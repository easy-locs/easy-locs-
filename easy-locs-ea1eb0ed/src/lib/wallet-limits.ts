import { getLimitsForScore, getTrustLevel, type TrustLevel } from "@/lib/trust/trust-levels";

export const DAILY_TRANSFER_LIMITS = {
  default: 5000,
  verified: 20000,
  premium: 100000,
} as const;

export const LARGE_TX_THRESHOLD = 500;

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

export function checkDailyLimitByTrust(
  todaySpent: number,
  amount: number,
  trustScore: number
): { allowed: boolean; remaining: number; limit: number; level: TrustLevel } {
  const limits = getLimitsForScore(trustScore);
  const remaining = Math.max(0, limits.dailySend - todaySpent);
  return {
    allowed: amount <= remaining,
    remaining,
    limit: limits.dailySend,
    level: getTrustLevel(trustScore),
  };
}

export function checkSingleTxLimit(
  amount: number,
  trustScore: number
): { allowed: boolean; limit: number } {
  const limits = getLimitsForScore(trustScore);
  return {
    allowed: amount <= limits.singleTx,
    limit: limits.singleTx,
  };
}

export function isLargeTransaction(amount: number, trustScore?: number): boolean {
  if (trustScore !== undefined) {
    const limits = getLimitsForScore(trustScore);
    return amount >= limits.largeTxThreshold;
  }
  return amount >= LARGE_TX_THRESHOLD;
}

export function formatLimitInfo(remaining: number, limit: number): string {
  const pct = Math.round((remaining / limit) * 100);
  return `${remaining.toLocaleString()} / ${limit.toLocaleString()} LOCS (${pct}%)`;
}

export function getTrustBasedLimits(trustScore: number) {
  const limits = getLimitsForScore(trustScore);
  const level = getTrustLevel(trustScore);
  return {
    level,
    dailySend: limits.dailySend,
    dailyReceive: limits.dailyReceive,
    singleTx: limits.singleTx,
    largeTxThreshold: limits.largeTxThreshold,
  };
}

export function mapTrustLevelToLegacyTier(trustScore: number): keyof typeof DAILY_TRANSFER_LIMITS {
  const level = getTrustLevel(trustScore);
  if (level >= 3) return "premium";
  if (level >= 1) return "verified";
  return "default";
}
