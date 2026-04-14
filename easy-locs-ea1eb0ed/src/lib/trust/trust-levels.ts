export type TrustLevel = 0 | 1 | 2 | 3 | 4;

export type SecurityFlag = "normal" | "low_risk" | "suspicious" | "high_risk" | "restricted" | "blocked" | "review_required";

export interface TrustLevelConfig {
  level: TrustLevel;
  name: string;
  nameKey: string;
  minScore: number;
  dailySendLimit: number;
  dailyReceiveLimit: number;
  weeklySendLimit: number;
  singleTxLimit: number;
  largeTxThreshold: number;
  topUpLimit: number;
  maxRapidTxPerHour: number;
  features: string[];
  requiresKyc: boolean;
  color: string;
}

export const TRUST_LEVELS: Record<TrustLevel, TrustLevelConfig> = {
  0: {
    level: 0,
    name: "Unverified",
    nameKey: "trust.level0",
    minScore: 0,
    dailySendLimit: 0,
    dailyReceiveLimit: 0,
    weeklySendLimit: 0,
    singleTxLimit: 0,
    largeTxThreshold: 0,
    topUpLimit: 0,
    maxRapidTxPerHour: 0,
    features: [],
    requiresKyc: false,
    color: "hsl(0 0% 60%)",
  },
  1: {
    level: 1,
    name: "Verified",
    nameKey: "trust.level1",
    minScore: 10,
    dailySendLimit: 2000,
    dailyReceiveLimit: 5000,
    weeklySendLimit: 8000,
    singleTxLimit: 500,
    largeTxThreshold: 200,
    topUpLimit: 2000,
    maxRapidTxPerHour: 10,
    features: ["wallet_basic", "orbit_basic", "contacts_sync"],
    requiresKyc: false,
    color: "hsl(var(--accent))",
  },
  2: {
    level: 2,
    name: "Active",
    nameKey: "trust.level2",
    minScore: 30,
    dailySendLimit: 5000,
    dailyReceiveLimit: 15000,
    weeklySendLimit: 25000,
    singleTxLimit: 2000,
    largeTxThreshold: 500,
    topUpLimit: 5000,
    maxRapidTxPerHour: 20,
    features: ["wallet_basic", "orbit_full", "contacts_sync", "qr_payments", "request_money"],
    requiresKyc: false,
    color: "hsl(142 71% 45%)",
  },
  3: {
    level: 3,
    name: "Trusted",
    nameKey: "trust.level3",
    minScore: 60,
    dailySendLimit: 20000,
    dailyReceiveLimit: 50000,
    weeklySendLimit: 80000,
    singleTxLimit: 10000,
    largeTxThreshold: 2000,
    topUpLimit: 20000,
    maxRapidTxPerHour: 40,
    features: ["wallet_basic", "orbit_full", "contacts_sync", "qr_payments", "request_money", "payment_links", "recurring_payments"],
    requiresKyc: true,
    color: "hsl(220 70% 55%)",
  },
  4: {
    level: 4,
    name: "Premium",
    nameKey: "trust.level4",
    minScore: 85,
    dailySendLimit: 100000,
    dailyReceiveLimit: 200000,
    weeklySendLimit: 500000,
    singleTxLimit: 50000,
    largeTxThreshold: 5000,
    topUpLimit: 100000,
    maxRapidTxPerHour: 80,
    features: ["wallet_basic", "orbit_full", "contacts_sync", "qr_payments", "request_money", "payment_links", "recurring_payments", "instant_cashout", "priority_support", "business_tools"],
    requiresKyc: true,
    color: "hsl(270 60% 55%)",
  },
};

export interface SecurityFlagConfig {
  flag: SecurityFlag;
  scoreCap: number | null;
  limitMultiplier: number;
  requireOtp: boolean;
  requireKyc: boolean;
  blockSensitiveActions: boolean;
  blockAllTransactions: boolean;
  requireManualReview: boolean;
  orbitRestricted: boolean;
  radarDemoted: boolean;
}

export const SECURITY_FLAG_CONFIGS: Record<SecurityFlag, SecurityFlagConfig> = {
  normal: {
    flag: "normal",
    scoreCap: null,
    limitMultiplier: 1.0,
    requireOtp: false,
    requireKyc: false,
    blockSensitiveActions: false,
    blockAllTransactions: false,
    requireManualReview: false,
    orbitRestricted: false,
    radarDemoted: false,
  },
  low_risk: {
    flag: "low_risk",
    scoreCap: null,
    limitMultiplier: 0.8,
    requireOtp: false,
    requireKyc: false,
    blockSensitiveActions: false,
    blockAllTransactions: false,
    requireManualReview: false,
    orbitRestricted: false,
    radarDemoted: false,
  },
  suspicious: {
    flag: "suspicious",
    scoreCap: 45,
    limitMultiplier: 0.5,
    requireOtp: true,
    requireKyc: false,
    blockSensitiveActions: true,
    blockAllTransactions: false,
    requireManualReview: false,
    orbitRestricted: true,
    radarDemoted: true,
  },
  review_required: {
    flag: "review_required",
    scoreCap: 35,
    limitMultiplier: 0.3,
    requireOtp: true,
    requireKyc: true,
    blockSensitiveActions: true,
    blockAllTransactions: false,
    requireManualReview: true,
    orbitRestricted: true,
    radarDemoted: true,
  },
  high_risk: {
    flag: "high_risk",
    scoreCap: 20,
    limitMultiplier: 0.1,
    requireOtp: true,
    requireKyc: true,
    blockSensitiveActions: true,
    blockAllTransactions: false,
    requireManualReview: true,
    orbitRestricted: true,
    radarDemoted: true,
  },
  restricted: {
    flag: "restricted",
    scoreCap: 10,
    limitMultiplier: 0,
    requireOtp: true,
    requireKyc: true,
    blockSensitiveActions: true,
    blockAllTransactions: true,
    requireManualReview: true,
    orbitRestricted: true,
    radarDemoted: true,
  },
  blocked: {
    flag: "blocked",
    scoreCap: 0,
    limitMultiplier: 0,
    requireOtp: true,
    requireKyc: true,
    blockSensitiveActions: true,
    blockAllTransactions: true,
    requireManualReview: true,
    orbitRestricted: true,
    radarDemoted: true,
  },
};

export function getTrustLevel(score: number): TrustLevel {
  if (score >= 85) return 4;
  if (score >= 60) return 3;
  if (score >= 30) return 2;
  if (score >= 10) return 1;
  return 0;
}

export function getTrustLevelConfig(score: number): TrustLevelConfig {
  return TRUST_LEVELS[getTrustLevel(score)];
}

export function getEffectiveLimits(
  score: number,
  flag: SecurityFlag
): {
  dailySend: number;
  dailyReceive: number;
  weeklySend: number;
  singleTx: number;
  topUp: number;
  largeTxThreshold: number;
} {
  const config = getTrustLevelConfig(score);
  const flagConfig = SECURITY_FLAG_CONFIGS[flag];
  const m = flagConfig.limitMultiplier;
  return {
    dailySend: Math.round(config.dailySendLimit * m),
    dailyReceive: Math.round(config.dailyReceiveLimit * m),
    weeklySend: Math.round(config.weeklySendLimit * m),
    singleTx: Math.round(config.singleTxLimit * m),
    topUp: Math.round(config.topUpLimit * m),
    largeTxThreshold: Math.round(config.largeTxThreshold * m),
  };
}

export function getLimitsForScore(score: number): {
  dailySend: number;
  dailyReceive: number;
  singleTx: number;
  largeTxThreshold: number;
} {
  const config = getTrustLevelConfig(score);
  return {
    dailySend: config.dailySendLimit,
    dailyReceive: config.dailyReceiveLimit,
    singleTx: config.singleTxLimit,
    largeTxThreshold: config.largeTxThreshold,
  };
}

export function hasFeature(score: number, feature: string): boolean {
  const config = getTrustLevelConfig(score);
  return config.features.includes(feature);
}

export function getNextLevel(currentLevel: TrustLevel): TrustLevelConfig | null {
  const next = (currentLevel + 1) as TrustLevel;
  if (next > 4) return null;
  return TRUST_LEVELS[next];
}

export function getProgressToNextLevel(score: number): {
  currentLevel: TrustLevel;
  nextLevel: TrustLevel | null;
  progress: number;
  pointsNeeded: number;
} {
  const current = getTrustLevel(score);
  if (current >= 4) return { currentLevel: 4, nextLevel: null, progress: 100, pointsNeeded: 0 };

  const next = (current + 1) as TrustLevel;
  const nextConfig = TRUST_LEVELS[next];
  const currentConfig = TRUST_LEVELS[current];
  const range = nextConfig.minScore - currentConfig.minScore;
  const earned = score - currentConfig.minScore;
  const progress = Math.min(100, Math.round((earned / range) * 100));

  return {
    currentLevel: current,
    nextLevel: next,
    progress,
    pointsNeeded: Math.max(0, nextConfig.minScore - score),
  };
}

export function isActionAllowed(flag: SecurityFlag, action: "send" | "receive" | "topup" | "request" | "orbit_message" | "orbit_invite"): boolean {
  const fc = SECURITY_FLAG_CONFIGS[flag];
  if (fc.blockAllTransactions && ["send", "receive", "topup", "request"].includes(action)) return false;
  if (fc.orbitRestricted && ["orbit_invite"].includes(action)) return false;
  if (fc.blockSensitiveActions && ["topup"].includes(action)) return false;
  return true;
}
