import { supabase } from "@/integrations/supabase/client";

export async function createSurgeRule(params: {
  workspaceId?: string;
  ruleName: string;
  city?: string;
  area?: string;
  contextType?: "delivery" | "ride" | "all";
  triggerType: "demand_supply_ratio" | "weather" | "peak_time" | "backlog" | "event";
  triggerValue?: number;
  multiplier: number;
  minFee?: number;
  maxFee?: number;
  startsAt?: string;
  endsAt?: string;
  metadata?: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from("surge_pricing_rules")
    .insert({
      workspace_id: params.workspaceId ?? null,
      rule_name: params.ruleName,
      city: params.city ?? null,
      area: params.area ?? null,
      context_type: params.contextType ?? "delivery",
      trigger_type: params.triggerType,
      trigger_value: params.triggerValue ?? null,
      multiplier: params.multiplier,
      min_fee: params.minFee ?? null,
      max_fee: params.maxFee ?? null,
      status: "draft",
      starts_at: params.startsAt ?? null,
      ends_at: params.endsAt ?? null,
      metadata: params.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function activateSurgeRule(ruleId: string) {
  const { data, error } = await supabase
    .from("surge_pricing_rules")
    .update({ status: "active" })
    .eq("id", ruleId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function applySurgePricing(params: {
  ruleId?: string;
  city?: string;
  area?: string;
  contextType?: string;
  referenceType?: string;
  referenceId?: string;
  baseFee: number;
  multiplier: number;
  demandScore?: number;
  supplyScore?: number;
  minFee?: number;
  maxFee?: number;
}) {
  let finalFee = params.baseFee * params.multiplier;
  let status = "applied";

  if (typeof params.minFee === "number" && finalFee < params.minFee) {
    finalFee = params.minFee;
    status = "capped";
  }
  if (typeof params.maxFee === "number" && finalFee > params.maxFee) {
    finalFee = params.maxFee;
    status = "capped";
  }

  const { data, error } = await supabase
    .from("surge_pricing_events")
    .insert({
      rule_id: params.ruleId ?? null,
      city: params.city ?? null,
      area: params.area ?? null,
      context_type: params.contextType ?? null,
      reference_type: params.referenceType ?? null,
      reference_id: params.referenceId ?? null,
      base_fee: params.baseFee,
      applied_multiplier: params.multiplier,
      final_fee: Number(finalFee.toFixed(2)),
      demand_score: params.demandScore ?? null,
      supply_score: params.supplyScore ?? null,
      status,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
