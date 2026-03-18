import { supabase } from "@/integrations/supabase/client";

/**
 * Auto-create a driver incentive based on heatmap score.
 * High heat = bigger reward to attract drivers.
 */
export async function createHeatBasedDriverBoost(params: {
  workspaceId?: string;
  city?: string;
  area?: string;
  heatScore: number;
}) {
  if (params.heatScore < 5) return null;

  const rewardValue =
    params.heatScore >= 20 ? 40 :
    params.heatScore >= 12 ? 25 : 15;

  const programName = `Boost ${params.area ?? params.city ?? "Hot zone"}`;

  const { data, error } = await (supabase as any)
    .from("driver_incentive_programs")
    .insert({
      workspace_id: params.workspaceId ?? null,
      program_name: programName,
      target_scope: params.area ? "zone" : "city",
      city: params.city ?? null,
      area: params.area ?? null,
      reward_type: "wallet_credit",
      reward_value: rewardValue,
      condition_type: "completed_jobs",
      condition_value: 3,
      status: "active",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
