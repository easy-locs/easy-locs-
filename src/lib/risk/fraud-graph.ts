import { supabase } from "@/integrations/supabase/client";

export async function upsertFraudEntity(params: {
  entityType: string;
  entityId: string;
  riskScore?: number;
  metadata?: Record<string, any>;
}) {
  const riskBand =
    (params.riskScore ?? 0) >= 85 ? "critical" :
    (params.riskScore ?? 0) >= 65 ? "high" :
    (params.riskScore ?? 0) >= 35 ? "medium" : "low";

  const { data: existing } = await supabase
    .from("fraud_entities" as any)
    .select("*")
    .eq("entity_type", params.entityType)
    .eq("entity_id", params.entityId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("fraud_entities" as any)
      .update({
        risk_score: params.riskScore ?? (existing as any).risk_score,
        risk_band: riskBand,
        metadata: params.metadata ?? (existing as any).metadata,
      } as any)
      .eq("id", (existing as any).id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("fraud_entities" as any)
    .insert({
      entity_type: params.entityType,
      entity_id: params.entityId,
      risk_score: params.riskScore ?? 0,
      risk_band: riskBand,
      metadata: params.metadata ?? {},
    } as any)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function linkFraudEntities(params: {
  fromEntityId: string;
  toEntityId: string;
  edgeType: string;
  weight?: number;
}) {
  return supabase.from("fraud_edges" as any).insert({
    from_entity_id: params.fromEntityId,
    to_entity_id: params.toEntityId,
    edge_type: params.edgeType,
    weight: params.weight ?? 1,
  } as any);
}

export async function computeFraudScore(entityId: string) {
  const { data: edges } = await supabase
    .from("fraud_edges" as any)
    .select("*")
    .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`);

  let score = 0;
  (edges as any[] ?? []).forEach((e: any) => {
    if (e.edge_type === "same_device") score += 20;
    if (e.edge_type === "same_ip") score += 10;
    if (e.edge_type === "shared_wallet") score += 30;
    if (e.edge_type === "suspicious_pattern") score += 50;
  });

  return Math.min(100, score);
}
