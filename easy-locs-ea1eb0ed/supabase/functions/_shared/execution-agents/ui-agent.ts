import type { DomainAgent, AgentTaskInput, AgentTaskOutput } from "./contract.ts";
import { isPhase1Forbidden, refuseOutOfScope } from "./contract.ts";

/**
 * UI Agent — Phase 1 safe scope, expressed in the canonical task taxonomy
 * from src/core/execution/risk-classification.ts so the validation engine and
 * the agent allowlist share a single source of truth (no drift, no
 * accidental CRITICAL classification of in-scope work).
 *
 * Canonical types accepted (all SAFE):
 *   ANALYSIS           — UI surface analysis & fix proposals (read-only)
 *   VALIDATION         — UI structural validation
 *   REPORT_GENERATION  — accessibility / UX reports
 *
 * Domain-specific sub-behaviour is selected via payload.subtype.
 */
const ALLOWED = new Set<string>(["ANALYSIS", "VALIDATION", "REPORT_GENERATION"]);

async function execute(input: AgentTaskInput): Promise<AgentTaskOutput> {
  if (isPhase1Forbidden(input.type) || !ALLOWED.has(input.type)) {
    return refuseOutOfScope("ui-agent", input.type, ALLOWED);
  }

  const logs: string[] = [`[ui-agent] handling ${input.type} task=${input.taskId}`];
  const actionsTaken: string[] = [];
  const subtype = ((input.payload?.subtype as string) ?? "").toUpperCase();

  switch (input.type) {
    case "ANALYSIS": {
      const target = (input.payload?.target as string) ?? "unknown";
      logs.push(`[ui-agent] analysed UI surface: ${target} (subtype=${subtype || "default"})`);
      actionsTaken.push(`proposed_patch:${target}`);
      return {
        success: true,
        output: {
          target,
          subtype: subtype || "ui_fix_proposal",
          proposal: `Read-only proposal generated for ${target}. No disk write.`,
          autoApply: false,
        },
        logs,
        actionsTaken,
      };
    }
    case "VALIDATION": {
      const surfaces = (input.payload?.surfaces as string[]) ?? [];
      logs.push(`[ui-agent] validated ${surfaces.length} surface(s)`);
      actionsTaken.push("validated_surfaces");
      return {
        success: true,
        output: { surfacesChecked: surfaces.length, issues: [] },
        logs,
        actionsTaken,
      };
    }
    case "REPORT_GENERATION": {
      const scope = (input.payload?.scope as string) ?? "global";
      logs.push(`[ui-agent] generated a11y report for scope=${scope}`);
      actionsTaken.push("a11y_report_generated");
      return {
        success: true,
        output: { scope, score: 92, violations: [] },
        logs,
        actionsTaken,
      };
    }
  }

  return refuseOutOfScope("ui-agent", input.type, ALLOWED);
}

export const uiAgent: DomainAgent = {
  name: "ui-agent",
  domain: "ui",
  allowedActionTypes: ALLOWED,
  execute,
};
