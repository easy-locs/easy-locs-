export type TrustLevel = 0 | 1 | 2 | 3 | 4;

export type SecurityFlag = "normal" | "suspicious" | "high_risk" | "blocked";

export interface TrustLevelConfig {
  level: TrustLevel;
  name: string;
  nameKey: string;
  minScore: number;
  dailySendLimit: number;
  dailyReceiveLimit: number;
  singleTxLimit: number;
  largeTxThreshold: number;
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
    singleTxLimit: 0,
    largeTxThreshold: 0,
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
    singleTxLimit: 500,
    largeTxThreshold: 200,
    features: ["wallet_basic", "orbit_basic", "contacts_sync"],
    requiresKyc: false,
    color: "hsl(38 65% 56%)",
  },
  2: {
    level: 2,
    name: "Active",
    nameKey: "trust.level2",
    minScore: 30,
    dailySendLimit: 5000,
    dailyReceiveLimit: 15000,
    singleTxLimit: 2000,
    largeTxThreshold: 500,
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
    singleTxLimit: 10000,
    largeTxThreshold: 2000,
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
    singleTxLimit: 50000,
    largeTxThreshold: 5000,
    features: ["wallet_basic", "orbit_full", "contacts_sync", "qr_payments", "request_money", "payment_links", "recurring_payments", "instant_cashout", "priority_support"],
    requiresKyc: true,
    color: "hsl(270 60% 55%)",
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
