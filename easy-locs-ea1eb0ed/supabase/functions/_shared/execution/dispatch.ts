/**
 * Sovereign Agent Control — canonical dispatch helper for edge functions
 * (task #809, L6 — Deno side).
 *
 * Mirrors `src/lib/execution/dispatch.ts` but uses the Deno-style supabase-js
 * import + service-role credentials available inside Supabase Edge Functions.
 *
 * Every mutation in an edge function MUST be expressed as an execution task
 * and routed through `system.dispatch_execution_task` via this helper. The
 * companion ESLint rule `easylocs/require-dispatch-execution-task` (and
 * `easylocs/no-direct-rpc-mutation`) blocks any direct PostgREST mutation
 * or `<builder>.rpc(...)` call that does not come from this path or the
 * explicit allow-list at `.eslintrc.dispatch-allowlist.json`.
 */

// @ts-expect-error — Deno remote import, resolved at edge runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyDevPolicyToDispatchInput } from "./policies/dev-policy.ts";

export type DispatchRisk = "safe" | "medium" | "critical";

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

// Lazy singleton — avoids creating a client at module-load time so the file
// is safe to import in tests/non-Deno environments.
let _client: ReturnType<typeof createClient> | null = null;
function getServiceClient(): ReturnType<typeof createClient> {
  if (_client) return _client;
  // @ts-expect-error — Deno global, only present at edge runtime.
  const url = Deno.env.get("SUPABASE_URL");
  // @ts-expect-error — Deno global, only present at edge runtime.
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error(
      "[dispatchExecutionTask] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set in the edge function environment.",
    );
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

/**
 * Dispatch a task through the platform agent registry from an edge function.
 * Same contract as `src/lib/execution/dispatch.ts` — the only sanctioned
 * mutation entry point on the Deno side.
 */
export async function dispatchExecutionTask(
  input: DispatchExecutionTaskInput,
): Promise<DispatchedTaskHandle> {
  // ── LC5 (#873) — pre-execute policy hook ────────────────────────────────
  // For `domain: 'code'` tasks the dev-policy may flip the call into a
  // pending_review dispatch by enriching payload + metadata and forcing
  // `requires_approval` on the RPC. The hook is a no-op for every other
  // domain (returns the input unchanged), so this stays safe to call
  // unconditionally and adds zero overhead off the code path.
  const {
    input: applied,
    decision: devDecision,
    rpcOverrides,
  } = applyDevPolicyToDispatchInput({
    domain: input.domain,
    taskType: input.taskType,
    payload: input.payload ?? {},
    metadata: input.metadata ?? {},
    approvalPolicy: input.approvalPolicy ?? "policy-default",
  });

  const {
    domain,
    taskType,
    payload = {},
    idempotencyKey,
    riskLevel,
    approvalPolicy = "policy-default",
    correlationId,
  } = { ...input, ...applied };
  const metadata = applied.metadata ?? input.metadata ?? {};

  const rpcArgs: Record<string, unknown> = {
    p_type: taskType,
    p_domain: domain,
    p_risk_level: riskLevel ?? null,
    p_payload: payload,
    p_idempotency_key: idempotencyKey ?? null,
    p_correlation_id: correlationId ?? null,
    p_approval_policy: approvalPolicy,
    p_metadata: metadata,
  };

  if (devDecision.requiresReview) {
    // Forward the extra params the SQL RPC needs to flip the new task
    // into pending_review at creation time. We do not pass `p_status`
    // unconditionally — only when the policy fires — so the existing
    // dispatch wire shape for non-code domains stays untouched.
    rpcArgs.p_status = rpcOverrides.status;
    rpcArgs.p_requires_approval = rpcOverrides.requiresApproval;
    rpcArgs.p_blocked_reason = rpcOverrides.blockedReason;
  }

  const client = getServiceClient();
  const { data, error } = await client
    .schema("system")
    .rpc("dispatch_execution_task", rpcArgs);

  if (error) {
    throw new DispatchError(error.message, {
      domain,
      taskType,
      cause: error,
    });
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
