import { getTrustLevel, getTrustLevelConfig, type TrustLevel, type SecurityFlag, type TrustLevelConfig } from "./trust-levels";

export interface TrustSignals {
  phoneVerified: boolean;
  accountAgeDays: number;
  completedPayments: number;
  failedPayments: number;
  disputesCount: number;
  cancellationsCount: number;
  orbitInteractions: number;
  contactsSynced: boolean;
  deviceStable: boolean;
  deviceChanges30d: number;
  locationCoherent: boolean;
  sessionCount30d: number;
  kycCompleted: boolean;
  kycLevel: number;
  moderationFlags: number;
  reportedByOthers: number;
  averageSessionMinutes: number;
}

export interface UserTrustProfile {
  score: number;
  level: TrustLevel;
  levelConfig: TrustLevelConfig;
  securityFlag: SecurityFlag;
  breakdown: TrustBreakdown;
  lastComputedAt: number;
}

export interface TrustBreakdown {
  identityScore: number;
  activityScore: number;
  financialScore: number;
  behaviorScore: number;
  securityScore: number;
}

const WEIGHTS = {
  identity: 0.25,
  activity: 0.20,
  financial: 0.25,
  behavior: 0.15,
  security: 0.15,
};

function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function computeIdentityScore(signals: TrustSignals): number {
  let score = 0;

  if (signals.phoneVerified) score += 30;
  if (signals.contactsSynced) score += 10;
  if (signals.kycCompleted) score += 25;
  score += Math.min(15, signals.kycLevel * 5);

  const ageFactor = Math.min(20, signals.accountAgeDays * 0.1);
  score += ageFactor;

  return clamp(score);
}

function computeActivityScore(signals: TrustSignals): number {
  let score = 0;

  const sessionFactor = Math.min(30, signals.sessionCount30d * 1.5);
  score += sessionFactor;

  const orbitFactor = Math.min(25, signals.orbitInteractions * 0.5);
  score += orbitFactor;

  if (signals.averageSessionMinutes > 2) score += 10;
  if (signals.averageSessionMinutes > 5) score += 10;
  if (signals.averageSessionMinutes > 15) score += 5;

  const contactBonus = signals.contactsSynced ? 10 : 0;
  score += contactBonus;

  return clamp(score);
}

function computeFinancialScore(signals: TrustSignals): number {
  let score = 20;

  const paymentBonus = Math.min(40, signals.completedPayments * 2);
  score += paymentBonus;

  const failurePenalty = Math.min(25, signals.failedPayments * 5);
  score -= failurePenalty;

  const disputePenalty = Math.min(30, signals.disputesCount * 10);
  score -= disputePenalty;

  const cancelPenalty = Math.min(15, signals.cancellationsCount * 3);
  score -= cancelPenalty;

  return clamp(score);
}

function computeBehaviorScore(signals: TrustSignals): number {
  let score = 60;

  const flagPenalty = Math.min(40, signals.moderationFlags * 15);
  score -= flagPenalty;

  const reportPenalty = Math.min(30, signals.reportedByOthers * 10);
  score -= reportPenalty;

  if (signals.locationCoherent) score += 15;
  if (signals.accountAgeDays > 30) score += 10;
  if (signals.accountAgeDays > 90) score += 5;

  return clamp(score);
}

function computeSecurityScore(signals: TrustSignals): number {
  let score = 50;

  if (signals.phoneVerified) score += 20;
  if (signals.deviceStable) score += 15;
  if (signals.kycCompleted) score += 10;

  const deviceChangePenalty = Math.min(25, signals.deviceChanges30d * 8);
  score -= deviceChangePenalty;

  if (signals.locationCoherent) score += 10;

  return clamp(score);
}

function determineSecurityFlag(
  score: number,
  signals: TrustSignals
): SecurityFlag {
  if (signals.moderationFlags >= 3) return "blocked";
  if (signals.reportedByOthers >= 5) return "blocked";

  if (
    signals.moderationFlags >= 2 ||
    signals.disputesCount >= 3 ||
    signals.deviceChanges30d >= 4 ||
    (signals.reportedByOthers >= 3 && score < 30)
  ) {
    return "high_risk";
  }

  if (
    signals.moderationFlags >= 1 ||
    signals.disputesCount >= 1 ||
    signals.deviceChanges30d >= 2 ||
    signals.reportedByOthers >= 1 ||
    (!signals.phoneVerified && signals.accountAgeDays > 7) ||
    (signals.failedPayments > signals.completedPayments && signals.completedPayments > 0)
  ) {
    return "suspicious";
  }

  return "normal";
}

export function computeUserTrustScore(signals: TrustSignals): UserTrustProfile {
  const identityScore = computeIdentityScore(signals);
  const activityScore = computeActivityScore(signals);
  const financialScore = computeFinancialScore(signals);
  const behaviorScore = computeBehaviorScore(signals);
  const securityScore = computeSecurityScore(signals);

  const rawScore =
    identityScore * WEIGHTS.identity +
    activityScore * WEIGHTS.activity +
    financialScore * WEIGHTS.financial +
    behaviorScore * WEIGHTS.behavior +
    securityScore * WEIGHTS.security;

  const score = clamp(rawScore);
  const level = getTrustLevel(score);
  const securityFlag = determineSecurityFlag(score, signals);

  let adjustedScore = score;
  if (securityFlag === "blocked") adjustedScore = 0;
  else if (securityFlag === "high_risk") adjustedScore = Math.min(adjustedScore, 20);
  else if (securityFlag === "suspicious") adjustedScore = Math.min(adjustedScore, 45);

  const finalLevel = getTrustLevel(adjustedScore);

  return {
    score: adjustedScore,
    level: finalLevel,
    levelConfig: getTrustLevelConfig(adjustedScore),
    securityFlag,
    breakdown: {
      identityScore,
      activityScore,
      financialScore,
      behaviorScore,
      securityScore,
    },
    lastComputedAt: Date.now(),
  };
}

export function getDefaultSignals(): TrustSignals {
  return {
    phoneVerified: false,
    accountAgeDays: 0,
    completedPayments: 0,
    failedPayments: 0,
    disputesCount: 0,
    cancellationsCount: 0,
    orbitInteractions: 0,
    contactsSynced: false,
    deviceStable: true,
    deviceChanges30d: 0,
    locationCoherent: true,
    sessionCount30d: 0,
    kycCompleted: false,
    kycLevel: 0,
    moderationFlags: 0,
    reportedByOthers: 0,
    averageSessionMinutes: 0,
  };
}

export function shouldTriggerKyc(
  signals: TrustSignals,
  currentLevel: TrustLevel,
  targetLevel: TrustLevel
): { required: boolean; reason: string } {
  if (targetLevel >= 3 && !signals.kycCompleted) {
    return { required: true, reason: "level_upgrade" };
  }

  if (signals.completedPayments > 20 && !signals.kycCompleted) {
    return { required: true, reason: "high_volume" };
  }

  if (signals.moderationFlags > 0 && !signals.kycCompleted) {
    return { required: true, reason: "suspicious_activity" };
  }

  if (signals.deviceChanges30d >= 2 && !signals.kycCompleted) {
    return { required: true, reason: "device_changes" };
  }

  return { required: false, reason: "" };
}

export function getSecurityActions(flag: SecurityFlag): {
  limitTransactions: boolean;
  requireVerification: boolean;
  blockAccount: boolean;
  requireKyc: boolean;
  requireManualAudit: boolean;
} {
  switch (flag) {
    case "blocked":
      return {
        limitTransactions: true,
        requireVerification: true,
        blockAccount: true,
        requireKyc: true,
        requireManualAudit: true,
      };
    case "high_risk":
      return {
        limitTransactions: true,
        requireVerification: true,
        blockAccount: false,
        requireKyc: true,
        requireManualAudit: true,
      };
    case "suspicious":
      return {
        limitTransactions: true,
        requireVerification: true,
        blockAccount: false,
        requireKyc: false,
        requireManualAudit: false,
      };
    default:
      return {
        limitTransactions: false,
        requireVerification: false,
        blockAccount: false,
        requireKyc: false,
        requireManualAudit: false,
      };
  }
}
