/**
 * Domain Agent Contract — Phase 1 (Server-Side Execution Loop, task #711)
 *
 * Each domain agent declares a hard-coded `allowedActionTypes` set. When the
 * server-side execution loop routes a task to an agent, the agent MUST refuse
 * any task type not in its declared list. Refusal returns a structured result
 * with `success=false` and `refused=true`, and the loop marks the task BLOCKED
 * with `blocked_reason` populated.
 *
 * Phase-1 forbidden across ALL agents: wallet mutations, auth changes, schema
 * migrations, deployments, code patches applied to disk, secret rotation,
 * user deletion, RLS changes, financial transactions.
 */

export interface AgentTaskInput {
  taskId: string;
  type: string;
  domain: string;
  riskLevel: "SAFE" | "MEDIUM" | "CRITICAL";
  payload: Record<string, unknown>;
  approvedBy: string | null;
  attemptCount: number;
  requestedBy: string;
}

export interface AgentTaskOutput {
  success: boolean;
  refused?: boolean;
  refusalReason?: string;
  output?: Record<string, unknown>;
  logs: string[];
  actionsTaken: string[];
  errorMessage?: string;
}

export interface DomainAgent {
  name: string;
  domain: string;
  allowedActionTypes: ReadonlySet<string>;
  execute: (input: AgentTaskInput) => Promise<AgentTaskOutput>;
}

/** Universally forbidden action-type prefixes — phase 1. */
export const PHASE_1_FORBIDDEN_PREFIXES: readonly string[] = [
  "WALLET_",
  "AUTH_",
  "SCHEMA_MIGRATION",
  "DEPLOYMENT",
  "CODE_PATCH",
  "RLS_CHANGE",
  "SECRET_ROTATION",
  "USER_DELETION",
  "FINANCIAL_",
];

export function isPhase1Forbidden(actionType: string): boolean {
  const t = actionType.toUpperCase();
  return PHASE_1_FORBIDDEN_PREFIXES.some((p) => t.startsWith(p));
}

export function refuseOutOfScope(
  agentName: string,
  actionType: string,
  allowed: ReadonlySet<string>,
): AgentTaskOutput {
  return {
    success: false,
    refused: true,
    refusalReason: `Agent ${agentName} refused action_type "${actionType}" — not in allowed scope [${[...allowed].join(", ")}]`,
    logs: [
      `[${agentName}] REFUSED out-of-scope action: ${actionType}`,
      `[${agentName}] Allowed scope: ${[...allowed].join(", ")}`,
    ],
    actionsTaken: [],
  };
}
