/**
 * Dispatch Failure Automation
 * Automated retry flow when no driver accepts.
 */
import { createWorkflowFromTemplate } from "@/lib/automation/automation-engine";
import { getCountryAutomationConfig } from "@/lib/automation/country-automation-rules";
import { WORKFLOW_TEMPLATES } from "@/lib/automation/automation-engine";

export async function createDispatchRetryWorkflow(params: {
  dispatchJobId: string;
  countryCode?: string;
  city?: string;
}) {
  const config = getCountryAutomationConfig(params.countryCode);

  const aggressivenessMultiplier = config.dispatchRetryAggressiveness === "high" ? 0.5
    : config.dispatchRetryAggressiveness === "low" ? 2.0 : 1.0;

  const steps = WORKFLOW_TEMPLATES.dispatch_retry.map((s) => ({
    ...s,
    delayMinutes: Math.round(s.delayMinutes * aggressivenessMultiplier),
  }));

  return createWorkflowFromTemplate("dispatch_retry", "dispatch_job", params.dispatchJobId, "no_driver_found", {
    countryCode: params.countryCode,
    city: params.city,
    priority: 80,
    steps: steps as any,
    metadata: {
      selfDeliveryFallback: config.selfDeliveryFallback,
      aggressiveness: config.dispatchRetryAggressiveness,
    },
  });
}
