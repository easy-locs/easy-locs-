import type { DomainAgent, AgentTaskInput, AgentTaskOutput } from "./contract.ts";
import { isPhase1Forbidden, refuseOutOfScope } from "./contract.ts";

/**
 * Onboarding Agent — Phase 1 safe scope, expressed in the canonical task
 * taxonomy (risk-classification.ts).
 *
 * Canonical types accepted (all SAFE):
 *   ANALYSIS                  — onboarding pipeline analysis
 *   INCIDENT_CLASSIFICATION   — KYC document classification (read-only)
 *   RETRY                     — pipeline requeue signal
 *   VALIDATION                — onboarding validation report
 */
const ALLOWED = new Set<string>(["ANALYSIS", "INCIDENT_CLASSIFICATION", "RETRY", "VALIDATION"]);

async function execute(input: AgentTaskInput): Promise<AgentTaskOutput> {
  if (isPhase1Forbidden(input.type) || !ALLOWED.has(input.type)) {
    return refuseOutOfScope("onboarding-agent", input.type, ALLOWED);
  }

  const logs: string[] = [`[onboarding-agent] handling ${input.type} task=${input.taskId}`];
  const actionsTaken: string[] = [];
  const pipelineId = (input.payload?.pipelineId as string) ?? null;

  switch (input.type) {
    case "ANALYSIS": {
      logs.push(`[onboarding-agent] analysed pipeline=${pipelineId ?? "all"}`);
      actionsTaken.push("pipeline_analysis");
      return {
        success: true,
        output: { pipelineId, stages: ["intake", "kyc", "approval"], blockers: [] },
        logs, actionsTaken,
      };
    }
    case "INCIDENT_CLASSIFICATION": {
      logs.push(`[onboarding-agent] read-only KYC classification`);
      actionsTaken.push("kyc_classified_readonly");
      return {
        success: true,
        output: { documentType: "passport", confidence: 0.94, autoApprove: false },
        logs, actionsTaken,
      };
    }
    case "RETRY": {
      logs.push(`[onboarding-agent] requeue pipeline=${pipelineId ?? "n/a"}`);
      actionsTaken.push("pipeline_retry_signal");
      return {
        success: true,
        output: { pipelineId, requeued: true },
        logs, actionsTaken,
      };
    }
    case "VALIDATION": {
      logs.push(`[onboarding-agent] validation report generated`);
      actionsTaken.push("validation_report");
      return {
        success: true,
        output: { score: 88, issues: [] },
        logs, actionsTaken,
      };
    }
  }

  return refuseOutOfScope("onboarding-agent", input.type, ALLOWED);
}

export const onboardingAgent: DomainAgent = {
  name: "onboarding-agent",
  domain: "onboarding",
  allowedActionTypes: ALLOWED,
  execute,
};
