/**
 * Sovereign Agent Control — canonical dispatch helper (task #809, L6).
 *
 * Every mutation in the Easy-Locs codebase MUST be expressed as an
 * execution task and routed through `system.dispatch_execution_task`.
 * This helper is the only sanctioned entry point on the client. The
 * companion ESLint rule `easylocs/require-dispatch-execution-task`
 * blocks any `.from(...).insert|update|delete|upsert(...)` call that
 * does not come from the dispatch path or the explicit allow-list at
 * `.eslintrc.dispatch-allowlist.json`.
 *
 * The same RPC is exposed in edge functions; for Deno-side callers see
 * `supabase/functions/_shared/execution/dispatch.ts` (re-exports the
 * same shape).
 */

import { db } from "@/services/db";

/**
 * Risk levels mirror `system.execution_task_risk` in the database.
 * The platform policy engine maps these to approval requirements.
 */
export type DispatchRisk = "safe" | "medium" | "critical";

/**
 * Approval policies mirror the choices accepted by
 * `system.dispatch_execution_task` (`p_approval_policy`).
 */
export type DispatchApprovalPolicy =
  | "none"
  | "single-admin"
  | "dual-admin"
  | "policy-default";

export interface DispatchExecutionTaskInput {
  /** Domain slug as registered in `system.agents` (e.g. "marketplace"). */
  domain: string;
  /** Canonical task type (e.g. "MARKETPLACE.LISTING.PUBLISH"). */
  taskType: string;
  /** JSON-serializable payload. The adapter validates the shape. */
  payload?: Record<string, unknown>;
  /** Idempotency key — re-issuing with the same key returns the cached result. */
  idempotencyKey?: string;
  /** Optional explicit risk override; otherwise the agent's default applies. */
  riskLevel?: DispatchRisk;
  /** Optional approval policy override. */
  approvalPolicy?: DispatchApprovalPolicy;
  /** Correlation id used to thread audit logs across boundaries. */
  correlationId?: string;
  /** Free-form metadata stored on the task row. */
  metadata?: Record<string, unknown>;
}

export interface DispatchedTaskHandle {
  taskId: string;
  status: "queued" | "approved" | "blocked";
  agentId: string | null;
  agentVersionId: string | null;
  blockedReason: string | null;
}

/**
 * Dispatch a task through the platform agent registry. Returns a typed
 * handle the caller can use to poll status, await an approval, or surface
 * an `AGENT_NOT_REGISTERED` / `AGENT_DISABLED` failure to the user.
 *
 * This is the only sanctioned mutation entry point. Direct
 * `.from(...).insert|update|delete|upsert(...)` calls are blocked by
 * `easylocs/require-dispatch-execution-task` outside the allow-list.
 */
export async function dispatchExecutionTask(
  input: DispatchExecutionTaskInput,
): Promise<DispatchedTaskHandle> {
  const {
    domain,
    taskType,
    payload = {},
    idempotencyKey,
    riskLevel,
    approvalPolicy = "policy-default",
    correlationId,
    metadata = {},
  } = input;

  const { data, error } = await db.schema("system").rpc("dispatch_execution_task", {
    p_type: taskType,
    p_domain: domain,
    p_risk_level: riskLevel ?? null,
    p_payload: payload,
    p_idempotency_key: idempotencyKey ?? null,
    p_correlation_id: correlationId ?? null,
    p_approval_policy: approvalPolicy,
    p_metadata: metadata,
  });

  if (error) {
    throw new DispatchError(error.message, { domain, taskType, cause: error });
  }
  if (!data || typeof data !== "object") {
    throw new DispatchError("dispatch_execution_task returned no data", {
      domain,
      taskType,
    });
  }
  const row = data as Record<string, unknown>;
  return {
    taskId: String(row.task_id ?? row.id ?? ""),
    status: (row.status as DispatchedTaskHandle["status"]) ?? "queued",
    agentId: (row.agent_id as string | null) ?? null,
    agentVersionId: (row.agent_version_id as string | null) ?? null,
    blockedReason: (row.blocked_reason as string | null) ?? null,
  };
}

export class DispatchError extends Error {
  readonly domain: string;
  readonly taskType: string;
  readonly cause?: unknown;
  constructor(
    message: string,
    opts: { domain: string; taskType: string; cause?: unknown },
  ) {
    super(message);
    this.name = "DispatchError";
    this.domain = opts.domain;
    this.taskType = opts.taskType;
    this.cause = opts.cause;
  }
}
