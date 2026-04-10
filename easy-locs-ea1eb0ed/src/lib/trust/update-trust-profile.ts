/**
 * Trust profile upsert — persists computed trust scores.
 */
import { supabase } from "@/integrations/supabase/client";
import { computeTrustScore } from "@/lib/trust/compute-trust-score";

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
