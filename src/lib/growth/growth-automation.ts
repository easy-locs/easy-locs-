import { createWorkflowFromTemplate } from "@/lib/automation/automation-engine";
import { calculateMerchantActivationScore } from "@/lib/growth/activation-score";
import { supabase } from "@/integrations/supabase/client";

export async function queueImportedMerchantGrowthFlow(merchantProfileId: string) {
  const score = await calculateMerchantActivationScore(merchantProfileId);

  await (supabase as any)
    .from("merchant_onboarding_profiles")
    .update({
      activation_score: score.score,
      activation_band: score.band,
      activation_reasons: score.reasons,
    } as any)
    .eq("id", merchantProfileId);

  await createWorkflowFromTemplate(
    "merchant_outreach",
    "merchant_onboarding_profiles",
    merchantProfileId,
    "growth_import",
    {
      priority:
        score.band === "priority" ? 95
        : score.band === "hot" ? 80
        : score.band === "warm" ? 60
        : 40,
      metadata: { activationScore: score },
    }
  );

  return score;
}

export async function refreshAllImportedMerchantScores(limit = 100) {
  const { data } = await (supabase as any)
    .from("merchant_onboarding_profiles")
    .select("id")
    .eq("onboarding_status", "imported_not_claimed")
    .limit(limit);

  const rows = data ?? [];
  const results = [];

  for (const row of rows) {
    results.push(await queueImportedMerchantGrowthFlow(row.id));
  }

  return results;
}
