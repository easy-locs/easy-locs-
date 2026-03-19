/**
 * Merchant Onboarding Automation
 * Pushes claimed merchants toward activation automatically.
 */
import { supabase } from "@/integrations/supabase/client";
import { createWorkflowFromTemplate } from "@/lib/automation/automation-engine";
import { getCountryAutomationConfig, adjustStepDelays } from "@/lib/automation/country-automation-rules";
import { WORKFLOW_TEMPLATES } from "@/lib/automation/automation-engine";

export async function createOnboardingWorkflow(params: {
  merchantProfileId: string;
  countryCode?: string;
  city?: string;
  priority?: number;
}) {
  const config = getCountryAutomationConfig(params.countryCode);
  const steps = adjustStepDelays(WORKFLOW_TEMPLATES.merchant_onboarding as any, params.countryCode);

  return createWorkflowFromTemplate("merchant_onboarding", "merchant_onboarding_profiles", params.merchantProfileId, "claim_completed", {
    countryCode: params.countryCode,
    city: params.city,
    priority: params.priority ?? 60,
    steps: steps as any,
    metadata: { languages: config.messageLanguages },
  });
}

export interface OnboardingCompletionReport {
  profileComplete: boolean;
  menuExists: boolean;
  menuQuality: number;
  storefrontLinked: boolean;
  paymentConfigured: boolean;
  activationReady: boolean;
  blockers: string[];
}

export async function checkOnboardingCompletion(merchantProfileId: string): Promise<OnboardingCompletionReport> {
  const blockers: string[] = [];

  const { data: profile } = await (supabase as any)
    .from("merchant_onboarding_profiles")
    .select("business_name, business_phone, business_email, shop_id, status")
    .eq("id", merchantProfileId)
    .maybeSingle();

  const profileComplete = !!(profile?.business_name && profile?.business_phone);
  if (!profileComplete) blockers.push("incomplete_profile");

  const { count: menuCount } = await (supabase as any)
    .from("catalog_items")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", profile?.shop_id ?? "none");
  const menuExists = (menuCount ?? 0) > 0;
  if (!menuExists) blockers.push("no_menu_items");

  const menuQuality = menuExists ? Math.min((menuCount ?? 0) * 10, 100) : 0;
  if (menuQuality < 30) blockers.push("low_menu_quality");

  const storefrontLinked = !!profile?.shop_id;
  if (!storefrontLinked) blockers.push("no_storefront");

  // Payment check placeholder
  const paymentConfigured = true;

  const activationReady = profileComplete && menuExists && menuQuality >= 30 && storefrontLinked;

  return { profileComplete, menuExists, menuQuality, storefrontLinked, paymentConfigured, activationReady, blockers };
}
