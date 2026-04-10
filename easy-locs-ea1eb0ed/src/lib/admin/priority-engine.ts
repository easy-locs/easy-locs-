/**
 * Admin Priority Engine
 * Computes priority scores for exceptions and admin attention items.
 */

export interface PriorityInput {
  gmvPotential?: number;        // 0-100
  merchantQuality?: number;     // 0-100
  countryLaunchImportance?: number; // 0-100
  noDriverUrgency?: number;     // 0-100
  settlementFailureSeverity?: number; // 0-100
  anomalyRisk?: number;         // 0-100
  stalledOnboardingAgeDays?: number;
  dormantMerchantValue?: number; // 0-100
  coverageGap?: number;         // 0-100
  premiumMerchant?: boolean;
  repeatedFailures?: number;
}

export interface PriorityResult {
  score: number;
  bucket: "critical" | "high" | "medium" | "low";
  reasons: string[];
}

export function computePriorityScore(input: PriorityInput): PriorityResult {
  const reasons: string[] = [];

  const weights = {
    gmv: 0.15,
    quality: 0.10,
    launch: 0.10,
    noDriver: 0.15,
    settlement: 0.15,
    anomaly: 0.10,
    stalled: 0.05,
    dormant: 0.05,
    coverage: 0.05,
    failures: 0.10,
  };

  let score = 0;
  score += (input.gmvPotential ?? 0) * weights.gmv;
  score += (input.merchantQuality ?? 50) * weights.quality;
  score += (input.countryLaunchImportance ?? 50) * weights.launch;
  score += (input.noDriverUrgency ?? 0) * weights.noDriver;
  score += (input.settlementFailureSeverity ?? 0) * weights.settlement;
  score += (input.anomalyRisk ?? 0) * weights.anomaly;

  const stalledScore = Math.min((input.stalledOnboardingAgeDays ?? 0) * 2, 100);
  score += stalledScore * weights.stalled;

  score += (input.dormantMerchantValue ?? 0) * weights.dormant;
  score += (input.coverageGap ?? 0) * weights.coverage;

  const failureScore = Math.min((input.repeatedFailures ?? 0) * 20, 100);
  score += failureScore * weights.failures;

  if (input.premiumMerchant) {
    score = Math.min(score * 1.3, 100);
    reasons.push("premium_merchant_boost");
  }

  if (input.noDriverUrgency && input.noDriverUrgency > 70) reasons.push("no_driver_critical");
  if (input.settlementFailureSeverity && input.settlementFailureSeverity > 70) reasons.push("settlement_critical");
  if (input.anomalyRisk && input.anomalyRisk > 60) reasons.push("anomaly_risk");
  if (stalledScore > 60) reasons.push("stalled_long");
  if ((input.repeatedFailures ?? 0) > 3) reasons.push("repeated_failures");

  const bucket: PriorityResult["bucket"] =
    score >= 75 ? "critical" :
    score >= 50 ? "high" :
    score >= 25 ? "medium" : "low";

  return { score: Math.round(score), bucket, reasons };
}
