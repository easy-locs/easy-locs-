/**
 * Settlement Failure Automation
 * Automated retry + escalation for failed settlements.
 */
import { createWorkflowFromTemplate } from "@/lib/automation/automation-engine";
import { getCountryAutomationConfig } from "@/lib/automation/country-automation-rules";

export async function createSettlementRetryWorkflow(params: {
  orderId: string;
  countryCode?: string;
  errorReason?: string;
}) {
  const config = getCountryAutomationConfig(params.countryCode);
  const [d1, d2, d3] = config.settlementRetryDelayMinutes;

  const steps = [
    { stepIndex: 0, action: "retry_settlement", delayMinutes: d1 ?? 5 },
    { stepIndex: 1, action: "retry_settlement", delayMinutes: d2 ?? 30, condition: "still_failed" },
    { stepIndex: 2, action: "alert_admin", delayMinutes: d3 ?? 60, condition: "still_failed" },
  ];

  return createWorkflowFromTemplate("settlement_retry", "order", params.orderId, "settlement_failed", {
    countryCode: params.countryCode,
    priority: 90,
    steps,
    metadata: { errorReason: params.errorReason },
  });
}
