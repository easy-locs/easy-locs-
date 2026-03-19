/**
 * Data Enrichment Pipeline
 * Improves merchant data quality over time.
 */
import { supabase } from "@/integrations/supabase/client";

export interface EnrichmentResult {
  merchantId: string;
  fieldsEnriched: string[];
  newScore: number;
}

export async function enrichMerchantData(merchantId: string): Promise<EnrichmentResult> {
  const { data: profile } = await (supabase as any)
    .from("merchant_onboarding_profiles")
    .select("*")
    .eq("id", merchantId)
    .maybeSingle();

  if (!profile) return { merchantId, fieldsEnriched: [], newScore: 0 };

  const updates: Record<string, unknown> = {};
  const enriched: string[] = [];

  // Infer category from business name
  if (!profile.business_type || profile.business_type === "restaurant") {
    const name = (profile.business_name ?? "").toLowerCase();
    if (name.includes("pizza")) { updates.business_type = "pizza"; enriched.push("business_type"); }
    else if (name.includes("burger")) { updates.business_type = "burger"; enriched.push("business_type"); }
    else if (name.includes("shawarma") || name.includes("مشاوي")) { updates.business_type = "arabic"; enriched.push("business_type"); }
    else if (name.includes("sushi")) { updates.business_type = "sushi"; enriched.push("business_type"); }
    else if (name.includes("café") || name.includes("coffee")) { updates.business_type = "cafe"; enriched.push("business_type"); }
  }

  // Score calculation
  let score = 30;
  if (profile.business_name) score += 15;
  if (profile.business_phone) score += 15;
  if (profile.city) score += 10;
  if (profile.latitude && profile.longitude) score += 15;
  if (profile.business_type && profile.business_type !== "restaurant") score += 15;

  updates.data_quality_score = score;

  if (Object.keys(updates).length > 0) {
    await (supabase as any)
      .from("merchant_onboarding_profiles")
      .update(updates as any)
      .eq("id", merchantId);
  }

  return { merchantId, fieldsEnriched: enriched, newScore: score };
}
