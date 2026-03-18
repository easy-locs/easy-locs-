import { supabase } from "@/integrations/supabase/client";

export async function upsertChurnRiskProfile(params: {
  workspaceId?: string;
  entityType: "merchant" | "driver" | "user";
  entityId: string;
  churnScore: number;
  drivers?: Array<{ key: string; value: number | string }>;
  lastActivityAt?: string;
  lastOrderAt?: string;
  predictionWindowDays?: number;
}) {
  const riskBand =
    params.churnScore >= 85 ? "critical" :
    params.churnScore >= 65 ? "high" :
    params.churnScore >= 35 ? "medium" : "low";

  const { data: existing } = await supabase
    .from("churn_risk_profiles")
    .select("*")
    .eq("entity_type", params.entityType)
    .eq("entity_id", params.entityId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("churn_risk_profiles")
      .update({
        churn_score: params.churnScore,
        risk_band: riskBand,
        drivers: (params.drivers ?? []) as any,
        last_activity_at: params.lastActivityAt ?? null,
        last_order_at: params.lastOrderAt ?? null,
        prediction_window_days: params.predictionWindowDays ?? 30,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("churn_risk_profiles")
    .insert({
      workspace_id: params.workspaceId ?? null,
      entity_type: params.entityType,
      entity_id: params.entityId,
      churn_score: params.churnScore,
      risk_band: riskBand,
      drivers: (params.drivers ?? []) as any,
      last_activity_at: params.lastActivityAt ?? null,
      last_order_at: params.lastOrderAt ?? null,
      prediction_window_days: params.predictionWindowDays ?? 30,
      status: "tracked",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export function estimateChurnScore(params: {
  inactiveDays: number;
  orderDropPct?: number;
  responseDropPct?: number;
  supportIssues?: number;
}) {
  const score =
    params.inactiveDays * 1.6 +
    (params.orderDropPct ?? 0) * 0.35 +
    (params.responseDropPct ?? 0) * 0.25 +
    (params.supportIssues ?? 0) * 7;
  return Math.min(100, Number(score.toFixed(2)));
}
