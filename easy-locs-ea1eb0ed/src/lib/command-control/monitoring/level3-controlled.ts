import { db } from "@/services/db";
import { logAuditEvent } from "../audit-log";
import type { MonitoringFinding } from "../types";

export class Level3GateError extends Error {
  constructor(
    message: string,
    public readonly failedChecks: string[],
    public readonly findingId?: string
  ) {
    super(message);
    this.name = "Level3GateError";
  }
}

interface GuardrailCheck {
  name: string;
  passed: boolean;
  message: string;
}

async function runGuardrailChecks(params: {
  action_type: string;
  agent_name: string;
  branch_name?: string;
  pr_number?: number;
}): Promise<GuardrailCheck[]> {
  const checks: GuardrailCheck[] = [];

  const { count: recentFailures } = await db("agent_actions")
    .select("*", { count: "exact", head: true })
    .eq("agent_name", params.agent_name)
    .eq("status", "failed")
    .gte("started_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

  checks.push({
    name: "recent_failure_threshold",
    passed: (recentFailures || 0) < 5,
    message: recentFailures && recentFailures >= 5
      ? `Agent ${params.agent_name} has ${recentFailures} failures in the last hour`
      : "Recent failure rate is acceptable",
  });

  const { count: pendingPRs } = await db("approval_requests")
    .select("*", { count: "exact", head: true })
    .eq("agent_name", params.agent_name)
    .eq("status", "pending");

  checks.push({
    name: "pending_pr_limit",
    passed: (pendingPRs || 0) < 3,
    message: pendingPRs && pendingPRs >= 3
      ? `Agent ${params.agent_name} already has ${pendingPRs} pending PRs`
      : "Pending PR count is within limits",
  });

  const { count: criticalFindings } = await db("monitoring_findings")
    .select("*", { count: "exact", head: true })
    .eq("severity", "critical")
    .eq("status", "open");

  checks.push({
    name: "no_critical_findings",
    passed: (criticalFindings || 0) === 0,
    message: criticalFindings && criticalFindings > 0
      ? `${criticalFindings} critical findings are currently open`
      : "No critical findings blocking execution",
  });

  const today = new Date().toISOString().split("T")[0];
  const { data: todayCost } = await db("cost_tracking")
    .select("cost_usd")
    .eq("agent_name", params.agent_name)
    .eq("date", today);

  const dailyCost = todayCost?.reduce((sum, c) => sum + Number(c.cost_usd), 0) || 0;
  const DAILY_COST_LIMIT = 100;

  checks.push({
    name: "daily_cost_limit",
    passed: dailyCost < DAILY_COST_LIMIT,
    message: dailyCost >= DAILY_COST_LIMIT
      ? `Agent ${params.agent_name} has exceeded daily cost limit ($${dailyCost.toFixed(2)}/$${DAILY_COST_LIMIT})`
      : `Daily cost within limits ($${dailyCost.toFixed(2)}/$${DAILY_COST_LIMIT})`,
  });

  const allowedActions = [
    "create_branch", "code_change", "create_pr",
    "migration_proposal", "dependency_update",
  ];
  checks.push({
    name: "allowed_action_type",
    passed: allowedActions.includes(params.action_type),
    message: allowedActions.includes(params.action_type)
      ? `Action type '${params.action_type}' is allowed`
      : `Action type '${params.action_type}' is not in the allowed list`,
  });

  return checks;
}

export async function requestControlledExecution(params: {
  action_type: string;
  agent_name: string;
  description: string;
  branch_name?: string;
  pr_number?: number;
  metadata?: Record<string, unknown>;
}): Promise<{
  allowed: boolean;
  guardrails: GuardrailCheck[];
  finding?: MonitoringFinding;
  requires_human_trigger: boolean;
}> {
  const guardrails = await runGuardrailChecks(params);
  const allPassed = guardrails.every((g) => g.passed);
  const failedChecks = guardrails.filter((g) => !g.passed);

  const { data: finding } = await db("monitoring_findings")
    .insert({
      level: 3,
      category: "controlled_execution",
      title: `${params.action_type} by ${params.agent_name}`,
      description: allPassed
        ? `All guardrails passed for ${params.action_type}. Awaiting human trigger.`
        : `Guardrail failures: ${failedChecks.map((f) => f.name).join(", ")}`,
      severity: allPassed ? "info" : "high",
      source_engine: "execution-gate",
      finding_data: {
        action_type: params.action_type,
        agent_name: params.agent_name,
        guardrails,
        all_passed: allPassed,
        metadata: params.metadata,
      },
      auto_created: true,
      status: "open",
    })
    .select()
    .single();

  await logAuditEvent({
    event_type: "level3_execution_request",
    actor_type: "agent",
    actor_name: params.agent_name,
    action: `Requested controlled execution: ${params.action_type}`,
    target_type: params.branch_name ? "branch" : "action",
    target_id: params.branch_name || params.action_type,
    details: {
      all_guardrails_passed: allPassed,
      failed_checks: failedChecks.map((f) => f.name),
      description: params.description,
    },
  });

  return {
    allowed: allPassed,
    guardrails,
    finding: finding as MonitoringFinding | undefined,
    requires_human_trigger: allPassed,
  };
}

export async function triggerControlledExecution(findingId: string, triggeredBy: string): Promise<{
  success: boolean;
  agentActionId?: string;
  error?: string;
}> {
  const { data: finding, error: findErr } = await db("monitoring_findings")
    .select("*")
    .eq("id", findingId)
    .eq("level", 3)
    .eq("status", "open")
    .single();

  if (findErr || !finding) {
    return { success: false, error: "Finding not found or already processed" };
  }

  const findingData = finding.finding_data as Record<string, unknown>;
  if (!findingData?.all_passed) {
    return { success: false, error: "Guardrails did not pass — cannot trigger execution" };
  }

  await db("monitoring_findings")
    .update({
      status: "acknowledged",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", findingId);

  const { data: agentAction } = await db("agent_actions")
    .insert({
      agent_name: (findingData.agent_name as string) || "unknown",
      action_type: (findingData.action_type as string) || "controlled_execution",
      description: `Human-triggered controlled execution: ${finding.title}`,
      status: "running",
      branch_name: (findingData.metadata as Record<string, unknown>)?.branch_name as string || null,
      metadata: {
        finding_id: findingId,
        triggered_by: triggeredBy,
        guardrails: findingData.guardrails,
        original_description: (findingData as Record<string, unknown>).description,
      },
    })
    .select()
    .single();

  await logAuditEvent({
    event_type: "level3_execution_triggered",
    actor_type: "human",
    actor_name: triggeredBy,
    action: `Triggered controlled execution for finding ${findingId}`,
    target_type: "monitoring_finding",
    target_id: findingId,
    details: {
      action_type: findingData.action_type,
      agent_name: findingData.agent_name,
      agent_action_id: agentAction?.id,
    },
  });

  return { success: true, agentActionId: agentAction?.id };
}

export async function enforceLevel3Gate(params: {
  action_type: string;
  agent_name: string;
  description: string;
  branch_name?: string;
  pr_number?: number;
  metadata?: Record<string, unknown>;
}): Promise<never | { findingId: string }> {
  const result = await requestControlledExecution(params);

  if (!result.allowed) {
    const failedChecks = result.guardrails.filter((g) => !g.passed).map((g) => g.name);
    throw new Level3GateError(
      `Level 3 gate BLOCKED: ${params.action_type} by ${params.agent_name}. Failed checks: ${failedChecks.join(", ")}`,
      failedChecks,
      result.finding?.id
    );
  }

  await logAuditEvent({
    event_type: "level3_gate_passed_awaiting_human",
    actor_type: "agent",
    actor_name: params.agent_name,
    action: `Level 3 gate passed for ${params.action_type} — awaiting human trigger`,
    target_type: "monitoring_finding",
    target_id: result.finding?.id || "unknown",
    details: {
      action_type: params.action_type,
      guardrails_passed: result.guardrails.map((g) => g.name),
    },
  });

  return { findingId: result.finding?.id || "" };
}
