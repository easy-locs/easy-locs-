/**
 * update-risk-profile — Persist fraud risk score for a user.
 */
import { supabase } from "@/integrations/supabase/client";
import { detectFraudSignals } from "@/lib/ai/fraud-detection";
import { alertHighRiskUser } from "@/lib/admin/alert-policies";

export async function updateRiskProfile(params: {
  userId: string;
  cancelRate: number;
  avgTripTime: number;
}) {
  const result = detectFraudSignals(params);

  await supabase.from("user_risk_profiles" as any).upsert({
    user_id: params.userId,
    risk_score: result.riskScore,
    fraud_flags: result.flags,
    last_updated: new Date().toISOString(),
  } as any);

  // Auto-alert on high risk
  try {
    await alertHighRiskUser({ userId: params.userId, riskScore: result.riskScore });
  } catch (e) {
    console.error("[update-risk-profile] alert failed", e);
  }

  return result;
}
