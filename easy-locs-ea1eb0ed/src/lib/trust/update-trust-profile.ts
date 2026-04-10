import { supabase } from "@/integrations/supabase/client";
import { computeTrustScore } from "@/lib/trust/compute-trust-score";
import { computeUserTrustScore, getDefaultSignals, type TrustSignals } from "@/lib/trust/user-trust-engine";
import { getTrustLevel } from "@/lib/trust/trust-levels";

export async function updateTrustProfile(params: {
  userId: string;
  disputesCount?: number;
  cancellationsCount?: number;
  completedOrdersCount?: number;
  completedRidesCount?: number;
  successfulPaymentsCount?: number;
  moderationFlags?: number;
}) {
  const score = computeTrustScore(params);

  const { error } = await supabase
    .from("user_trust_graph" as any)
    .upsert({
      user_id: params.userId,
      trust_score: score.trustScore,
      safety_score: score.safetyScore,
      reliability_score: score.reliabilityScore,
      trust_level: getTrustLevel(score.trustScore),
      security_flag: "normal",
      disputes_count: params.disputesCount ?? 0,
      cancellations_count: params.cancellationsCount ?? 0,
      completed_orders_count: params.completedOrdersCount ?? 0,
      completed_rides_count: params.completedRidesCount ?? 0,
      successful_payments_count: params.successfulPaymentsCount ?? 0,
      updated_at: new Date().toISOString(),
    } as any);

  if (error) throw error;
  return score;
}

export async function updateUserTrustFromSignals(userId: string, signals: TrustSignals) {
  const profile = computeUserTrustScore(signals);

  const { error } = await supabase
    .from("user_trust_graph" as any)
    .upsert({
      user_id: userId,
      trust_score: profile.score,
      trust_level: profile.level,
      security_flag: profile.securityFlag,
      identity_score: profile.breakdown.identityScore,
      activity_score: profile.breakdown.activityScore,
      financial_score: profile.breakdown.financialScore,
      behavior_score: profile.breakdown.behaviorScore,
      security_score: profile.breakdown.securityScore,
      updated_at: new Date().toISOString(),
    } as any);

  if (error) throw error;
  return profile;
}
