import { supabase } from "@/integrations/supabase/client";
import type { ActivationScoreResult } from "@/lib/growth/types";
import { getMerchantDemandSummary } from "@/lib/growth/demand-capture";

export async function calculateMerchantActivationScore(
  merchantProfileId: string
): Promise<ActivationScoreResult> {
  const reasons: string[] = [];
  let score = 0;

  const [{ data: merchant }, demand] = await Promise.all([
    (supabase as any)
      .from("merchant_onboarding_profiles")
      .select("id, merchant_name, phone, email, cuisine_type, city, area, onboarding_status")
      .eq("id", merchantProfileId)
      .maybeSingle(),
    getMerchantDemandSummary(merchantProfileId),
  ]);

  if (!merchant) {
    return { score: 0, band: "cold", reasons: ["merchant_missing"] };
  }

  if (merchant.phone) { score += 10; reasons.push("has_phone"); }
  if (merchant.email) { score += 8; reasons.push("has_email"); }
  if (merchant.cuisine_type) { score += 6; reasons.push("vertical_metadata"); }
  if (merchant.area) { score += 4; reasons.push("has_area"); }

  if (demand.totalEvents >= 10) { score += 15; reasons.push("high_traffic"); }
  else if (demand.totalEvents >= 3) { score += 8; reasons.push("some_traffic"); }

  if (demand.interestEvents >= 5) { score += 25; reasons.push("strong_interest"); }
  else if (demand.interestEvents >= 1) { score += 10; reasons.push("interest_detected"); }

  if (merchant.onboarding_status === "claimed") { score += 20; reasons.push("already_claimed"); }

  let band: ActivationScoreResult["band"] = "cold";
  if (score >= 70) band = "priority";
  else if (score >= 50) band = "hot";
  else if (score >= 25) band = "warm";

  return { score, band, reasons };
}
