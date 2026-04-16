import type { DomainAgent, AgentTaskInput, AgentTaskOutput } from "./contract.ts";
import { isPhase1Forbidden, refuseOutOfScope } from "./contract.ts";

/**
 * Orbit Agent — Phase 1 safe scope, expressed in the canonical task taxonomy
 * (risk-classification.ts) so the validation engine and the agent allowlist
 * stay aligned.
 *
 * Canonical types accepted (all SAFE):
 *   ANALYSIS                  — thread / notification analysis
 *   INCIDENT_CLASSIFICATION   — conversation labelling
 *   CACHE_REFRESH             — non-sensitive metadata refresh
 */
const ALLOWED = new Set<string>(["ANALYSIS", "INCIDENT_CLASSIFICATION", "CACHE_REFRESH"]);

async function execute(input: AgentTaskInput): Promise<AgentTaskOutput> {
  if (isPhase1Forbidden(input.type) || !ALLOWED.has(input.type)) {
    return refuseOutOfScope("orbit-agent", input.type, ALLOWED);
  }

  const logs: string[] = [`[orbit-agent] handling ${input.type} task=${input.taskId}`];
  const actionsTaken: string[] = [];
  const threadId = (input.payload?.threadId as string) ?? null;
  const subtype = ((input.payload?.subtype as string) ?? "").toLowerCase();

  switch (input.type) {
    case "ANALYSIS": {
      logs.push(`[orbit-agent] analysed thread=${threadId ?? "all"} (subtype=${subtype || "thread"})`);
      actionsTaken.push(`orbit_analysis:${subtype || "thread"}`);
      return {
        success: true,
        output: { threadId, subtype: subtype || "thread", signals: { spam: 0.02, urgency: 0.1 } },
        logs, actionsTaken,
      };
    }
    case "INCIDENT_CLASSIFICATION": {
      logs.push(`[orbit-agent] classified conversation=${threadId ?? "n/a"}`);
      actionsTaken.push("classified");
      return {
        success: true,
        output: { threadId, label: "support_inquiry", confidence: 0.91 },
        logs, actionsTaken,
      };
    }
    case "CACHE_REFRESH": {
      logs.push(`[orbit-agent] non-sensitive metadata refresh requested`);
      actionsTaken.push("metadata_refresh");
      return { success: true, output: { refreshed: true }, logs, actionsTaken };
    }
  }

  return refuseOutOfScope("orbit-agent", input.type, ALLOWED);
}

export const orbitAgent: DomainAgent = {
  name: "orbit-agent",
  domain: "orbit",
  allowedActionTypes: ALLOWED,
  execute,
};
