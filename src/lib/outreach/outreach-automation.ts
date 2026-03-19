/**
 * Merchant Outreach Automation
 * Drives imported merchants through automated claim funnel.
 */
import { createWorkflowFromTemplate } from "@/lib/automation/automation-engine";
import { getCountryAutomationConfig, adjustStepDelays } from "@/lib/automation/country-automation-rules";
import { WORKFLOW_TEMPLATES } from "@/lib/automation/automation-engine";

export async function createOutreachWorkflow(params: {
  merchantProfileId: string;
  countryCode?: string;
  city?: string;
  priority?: number;
}) {
  const config = getCountryAutomationConfig(params.countryCode);
  const steps = adjustStepDelays(
    WORKFLOW_TEMPLATES.merchant_outreach.map((s) => ({
      ...s,
      channel: config.outreachChannelPriority[0] ?? "whatsapp",
    })),
    params.countryCode
  );

  return createWorkflowFromTemplate("merchant_outreach", "merchant_onboarding_profiles", params.merchantProfileId, "auto_import", {
    countryCode: params.countryCode,
    city: params.city,
    priority: params.priority ?? 50,
    steps: steps as any,
    metadata: { languages: config.messageLanguages },
  });
}
