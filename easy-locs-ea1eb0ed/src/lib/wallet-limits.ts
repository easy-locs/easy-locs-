import { getLimitsForScore, getTrustLevel, getEffectiveLimits, type TrustLevel, type SecurityFlag } from "@/lib/trust/trust-levels";
import { resolveEffectiveLimits, type ResolvedLimits } from "@/lib/trust/country-limits";

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
  trustScore: number,
  securityFlag: SecurityFlag = "normal"
): { allowed: boolean; remaining: number; limit: number; level: TrustLevel } {
  const limits = getEffectiveLimits(trustScore, securityFlag);
  const remaining = Math.max(0, limits.dailySend - todaySpent);
  return {
    allowed: amount <= remaining,
    remaining,
    limit: limits.dailySend,
    level: getTrustLevel(trustScore),
  };
}

export function checkWeeklyLimitByTrust(
  weekSpent: number,
  amount: number,
  trustScore: number,
  securityFlag: SecurityFlag = "normal"
): { allowed: boolean; remaining: number; limit: number } {
  const limits = getEffectiveLimits(trustScore, securityFlag);
  const remaining = Math.max(0, limits.weeklySend - weekSpent);
  return {
    allowed: amount <= remaining,
    remaining,
    limit: limits.weeklySend,
  };
}

export function checkSingleTxLimit(
  amount: number,
  trustScore: number,
  securityFlag: SecurityFlag = "normal"
): { allowed: boolean; limit: number } {
  const limits = getEffectiveLimits(trustScore, securityFlag);
  return {
    allowed: amount <= limits.singleTx,
    limit: limits.singleTx,
  };
}

export function checkTopUpLimit(
  amount: number,
  trustScore: number,
  securityFlag: SecurityFlag = "normal"
): { allowed: boolean; limit: number } {
  const limits = getEffectiveLimits(trustScore, securityFlag);
  return {
    allowed: amount <= limits.topUp,
    limit: limits.topUp,
  };
}

export function checkReceiveLimit(
  todayReceived: number,
  amount: number,
  trustScore: number,
  securityFlag: SecurityFlag = "normal"
): { allowed: boolean; remaining: number; limit: number } {
  const limits = getEffectiveLimits(trustScore, securityFlag);
  const remaining = Math.max(0, limits.dailyReceive - todayReceived);
  return {
    allowed: amount <= remaining,
    remaining,
    limit: limits.dailyReceive,
  };
}

export function isLargeTransaction(amount: number, trustScore?: number, securityFlag?: SecurityFlag): boolean {
  if (trustScore !== undefined) {
    const limits = getEffectiveLimits(trustScore, securityFlag || "normal");
    return amount >= limits.largeTxThreshold;
  }
  return amount >= LARGE_TX_THRESHOLD;
}

export function formatLimitInfo(remaining: number, limit: number): string {
  if (limit === 0) return "0 / 0 (no limit)";
  const pct = Math.round((remaining / limit) * 100);
  return `${remaining.toLocaleString()} / ${limit.toLocaleString()} LOCS (${pct}%)`;
}

export function getTrustBasedLimits(trustScore: number, securityFlag: SecurityFlag = "normal") {
  const limits = getEffectiveLimits(trustScore, securityFlag);
  const level = getTrustLevel(trustScore);
  return {
    level,
    dailySend: limits.dailySend,
    dailyReceive: limits.dailyReceive,
    weeklySend: limits.weeklySend,
    singleTx: limits.singleTx,
    topUp: limits.topUp,
    largeTxThreshold: limits.largeTxThreshold,
  };
}

export function getCountryAwareLimits(
  trustScore: number,
  securityFlag: SecurityFlag,
  countryCode: string
): ResolvedLimits {
  const level = getTrustLevel(trustScore);
  return resolveEffectiveLimits(level, securityFlag, countryCode);
}

export function mapTrustLevelToLegacyTier(trustScore: number): keyof typeof DAILY_TRANSFER_LIMITS {
  const level = getTrustLevel(trustScore);
  if (level >= 3) return "premium";
  if (level >= 1) return "verified";
  return "default";
}

export function preflightTransactionCheck(params: {
  amount: number;
  todaySpent: number;
  weekSpent: number;
  todayReceived?: number;
  trustScore: number;
  securityFlag: SecurityFlag;
  countryCode?: string;
  action: "send" | "receive" | "topup";
}): {
  allowed: boolean;
  reason: string | null;
  limits: ResolvedLimits;
} {
  const effectiveLimits = params.countryCode
    ? getCountryAwareLimits(params.trustScore, params.securityFlag, params.countryCode)
    : getCountryAwareLimits(params.trustScore, params.securityFlag, "US");

  if (params.action === "send") {
    if (params.amount > effectiveLimits.singleTx) {
      return { allowed: false, reason: "single_tx_limit_exceeded", limits: effectiveLimits };
    }
    if (params.amount > effectiveLimits.dailySend - params.todaySpent) {
      return { allowed: false, reason: "daily_send_limit_exceeded", limits: effectiveLimits };
    }
    if (params.amount > effectiveLimits.weeklySend - params.weekSpent) {
      return { allowed: false, reason: "weekly_send_limit_exceeded", limits: effectiveLimits };
    }
  }

  if (params.action === "receive" && params.todayReceived !== undefined) {
    if (params.amount > effectiveLimits.dailyReceive - params.todayReceived) {
      return { allowed: false, reason: "daily_receive_limit_exceeded", limits: effectiveLimits };
    }
  }

  if (params.action === "topup") {
    if (params.amount > effectiveLimits.topUp) {
      return { allowed: false, reason: "topup_limit_exceeded", limits: effectiveLimits };
    }
  }

  return { allowed: true, reason: null, limits: effectiveLimits };
}
