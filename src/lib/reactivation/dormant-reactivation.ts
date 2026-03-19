/**
 * Dormant Merchant Reactivation
 * Detects and reactivates inactive merchants.
 */
import { supabase } from "@/integrations/supabase/client";
import { createWorkflowFromTemplate } from "@/lib/automation/automation-engine";
import { getCountryAutomationConfig } from "@/lib/automation/country-automation-rules";

export interface DormantMerchant {
  id: string;
  businessName: string;
  status: string;
  lastActivity: string | null;
  countryCode: string | null;
  city: string | null;
}

/**
 * Find merchants that qualify as dormant.
 */
export async function detectDormantMerchants(countryCode?: string): Promise<DormantMerchant[]> {
  const config = getCountryAutomationConfig(countryCode);
  const cutoff = new Date(Date.now() - config.inactivityThresholdDays * 86400_000).toISOString();

  let query = (supabase as any)
    .from("merchant_onboarding_profiles")
    .select("id, business_name, status, updated_at, country_code, city")
    .lt("updated_at", cutoff)
    .in("status", ["imported_not_claimed", "claimed", "live", "active"])
    .limit(100);

  if (countryCode) query = query.eq("country_code", countryCode);

  const { data } = await query;
  return (data ?? []).map((m: any) => ({
    id: m.id,
    businessName: m.business_name,
    status: m.status,
    lastActivity: m.updated_at,
    countryCode: m.country_code,
    city: m.city,
  }));
}

/**
 * Create reactivation workflow for a dormant merchant.
 */
export async function createReactivationWorkflow(merchant: DormantMerchant) {
  return createWorkflowFromTemplate("dormant_reactivation", "merchant_onboarding_profiles", merchant.id, "dormant_detected", {
    countryCode: merchant.countryCode ?? undefined,
    city: merchant.city ?? undefined,
    priority: 40,
    metadata: { businessName: merchant.businessName, dormantStatus: merchant.status },
  });
}
