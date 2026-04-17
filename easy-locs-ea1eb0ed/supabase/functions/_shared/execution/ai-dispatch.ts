/**
 * AI dispatch helper — Sovereign Agent Control · LB1 follow-up #835.
 *
 * Single sanctioned entrypoint for every edge-function AI callsite.
 * Wraps `dispatchExecutionTask({ domain: 'ai', ... })` with the standard
 * pending-review handling and typed result extraction so callers (translate,
 * classify, storefront, assistant, shopping-chat, …) never re-implement the
 * held-for-approval state and never call `aiRoute` / OpenAI / Anthropic
 * directly.
 *
 * Contract:
 *   1. ONE dispatch round-trip (`system.dispatch_execution_task` RPC).
 *   2. The orchestrator-loop (cron) drives the AI adapter; this helper polls
 *      `system.execution_tasks` until the task reaches a terminal status
 *      (succeeded / failed / blocked / rejected) or is held in
 *      `pending_review`. No additional dispatch RPCs are issued.
 *   3. Polling is bounded: by default ≤30 s with a 250 ms cadence — well
 *      under any sensible client-facing timeout. Callers that need a
 *      different envelope pass `pollTimeoutMs`.
 *
 * Returns a discriminated union so callers MUST handle pending_review and
 * failed paths explicitly — no silent fallbacks.
 */

// @ts-expect-error — Deno remote import, resolved at edge runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  dispatchExecutionTask,
  type DispatchApprovalPolicy,
} from "./dispatch.ts";
import {
  AI_DOMAIN,
  AI_TASK_TYPES,
  type AiCompletionPayload,
  type AiEmbeddingPayload,
  type AiRagPayload,
  type AiToolUsePayload,
} from "./adapters/ai/types.ts";

// ── Types ─────────────────────────────────────────────────────────────────

export type AiDispatchStatus =
  | "succeeded"
  | "failed"
  | "blocked"
  | "rejected"
  | "pending_review"
  | "timeout";

export interface AiDispatchOutcome<T = Record<string, unknown>> {
  status: AiDispatchStatus;
  taskId: string;
  /** Adapter output payload when status === "succeeded" or pending_review. */
  output: T | null;
  /** Filled when status is failed/blocked/rejected/timeout. */
  errorCode: string | null;
  errorMessage: string | null;
  /** Filled when status === "pending_review" or "blocked". */
  blockedReason: string | null;
  /** True when the adapter raised the sensitive-output flag (still surfaced
   *  in `output.flaggedSensitive` but lifted here for ergonomics). */
  flaggedSensitive: boolean;
}

export interface AiDispatchOptions {
  /** Mandatory caller tag, surfaces in ai_interactions.feature. */
  feature: string;
  /** Idempotency key — re-issuing dedupes via `system.find_idempotent_result`. */
  idempotencyKey?: string;
  correlationId?: string;
  /** Override default approval policy ("policy-default"). */
  approvalPolicy?: DispatchApprovalPolicy;
  metadata?: Record<string, unknown>;
  /** Maximum total wait before returning `status="timeout"` (default 30000). */
  pollTimeoutMs?: number;
  /** Polling cadence (default 250). */
  pollIntervalMs?: number;
  /** Caller-visible requester id (defaults to "edge:<feature>"). */
  requestedBy?: string;
}

// ── Service-role client (lazy singleton) ─────────────────────────────────

let _client: ReturnType<typeof createClient> | null = null;
function getServiceClient(): ReturnType<typeof createClient> {
  if (_client) return _client;
  // @ts-expect-error — Deno global, only present at edge runtime.
  const url = Deno.env.get("SUPABASE_URL");
  // @ts-expect-error — Deno global, only present at edge runtime.
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error(
      "[ai-dispatch] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set",
    );
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

// ── Polling loop ──────────────────────────────────────────────────────────

const TERMINAL: ReadonlyArray<string> = [
  "succeeded",
  "failed",
  "blocked",
  "rejected",
  "rolled_back",
  "rollback_failed",
  "cancelled",
];

const HOLD: ReadonlyArray<string> = ["pending_review"];

interface TaskRow {
  status: string;
  execution_result: Record<string, unknown> | null;
  error_code: string | null;
  blocked_reason: string | null;
}

/**
 * Track 3 hardening (#843): poll-read errors used to be swallowed with a
 * `console.warn`. Schema/permission errors meant the dispatch helper would
 * silently spin until the timeout — masking real problems. We now classify:
 *
 *   - **fatal**  PostgREST / Postgres errors that cannot recover by retrying:
 *     missing relation, missing column, missing function, RLS denial, JWT
 *     issue. The poll loop re-throws so the caller sees a clear failure.
 *   - **transient**  network / 5xx / unknown — log structured + continue.
 *
 * The classifier itself lives in `./poll-read-classifier.ts` so it stays
 * importable from unit tests without dragging in the Deno-only Supabase
 * client this module loads from `https://esm.sh/...`.
 */
import {
  classifyPollReadError,
  handlePollReadError,
} from "./poll-read-classifier.ts";
export { classifyPollReadError, handlePollReadError };

async function pollForResult(
  taskId: string,
  pollIntervalMs: number,
  pollTimeoutMs: number,
): Promise<TaskRow | "timeout"> {
  const client = getServiceClient();
  const deadline = Date.now() + pollTimeoutMs;

  while (Date.now() < deadline) {
    const { data, error } = await client
      .schema("system")
      .from("execution_tasks")
      .select("status,execution_result,error_code,blocked_reason")
      .eq("id", taskId)
      .maybeSingle();

    if (error) {
      // Delegate to the shared classifier+logger. Throws on fatal codes,
      // emits a structured `ai_dispatch.poll_read_error` log otherwise
      // (with task_id + agent_slug context for the audit pipeline).
      handlePollReadError({
        taskId,
        agentSlug: null,
        code: (error as { code?: string | null }).code ?? null,
        message: error.message,
      });
    } else if (data) {
      const row = data as TaskRow;
      if (TERMINAL.includes(row.status) || HOLD.includes(row.status)) {
        return row;
      }
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  return "timeout";
}

function rowToOutcome<T>(taskId: string, row: TaskRow): AiDispatchOutcome<T> {
  // The orchestrator persists the adapter's result object directly into
  // `execution_result` (see orchestrator-v2.ts L709/L740). Adapters that
  // wrap the payload as `{ output: ... }` are also supported for forward
  // compatibility.
  const raw = row.execution_result;
  const output = (
    raw && typeof raw === "object" && "output" in raw
      ? (raw as { output: unknown }).output
      : raw
  ) as T | null;
  const flaggedSensitive = Boolean(
    raw && typeof raw === "object" &&
      (raw as Record<string, unknown>).flaggedSensitive,
  );

  switch (row.status) {
    case "succeeded":
      return {
        status: "succeeded",
        taskId,
        output,
        errorCode: null,
        errorMessage: null,
        blockedReason: null,
        flaggedSensitive,
      };
    case "pending_review":
      return {
        status: "pending_review",
        taskId,
        output, // sensitive output is preserved for the approval drawer
        errorCode: null,
        errorMessage: null,
        blockedReason: row.blocked_reason,
        flaggedSensitive: true,
      };
    case "blocked":
      return {
        status: "blocked",
        taskId,
        output,
        errorCode: row.error_code,
        errorMessage: row.blocked_reason,
        blockedReason: row.blocked_reason,
        flaggedSensitive,
      };
    case "rejected":
      return {
        status: "rejected",
        taskId,
        output,
        errorCode: row.error_code ?? "REJECTED",
        errorMessage: row.blocked_reason ?? "rejected by approver",
        blockedReason: row.blocked_reason,
        flaggedSensitive,
      };
    case "failed":
    default:
      return {
        status: "failed",
        taskId,
        output,
        errorCode: row.error_code ?? "FAILED",
        errorMessage:
          (row.execution_result?.errorMessage as string | undefined) ??
          row.blocked_reason ??
          row.status,
        blockedReason: row.blocked_reason,
        flaggedSensitive,
      };
  }
}

// ── Generic dispatch + await ──────────────────────────────────────────────

async function dispatchAndAwait<T>(
  taskType: string,
  payload: Record<string, unknown>,
  opts: AiDispatchOptions,
): Promise<AiDispatchOutcome<T>> {
  const handle = await dispatchExecutionTask({
    domain: AI_DOMAIN,
    taskType,
    payload,
    idempotencyKey: opts.idempotencyKey,
    approvalPolicy: opts.approvalPolicy ?? "policy-default",
    correlationId: opts.correlationId,
    metadata: {
      feature: opts.feature,
      requested_by: opts.requestedBy ?? `edge:${opts.feature}`,
      ...(opts.metadata ?? {}),
    },
  });

  // The dispatch RPC may immediately materialise a terminal status (e.g.
  // blocked at validation, or already-cached idempotent result). Surface it
  // without polling.
  if (handle.status === "blocked") {
    return {
      status: "blocked",
      taskId: handle.taskId,
      output: null,
      errorCode: "BLOCKED_AT_DISPATCH",
      errorMessage: handle.blockedReason ?? "blocked at dispatch",
      blockedReason: handle.blockedReason,
      flaggedSensitive: false,
    };
  }

  const pollIntervalMs = opts.pollIntervalMs ?? 250;
  const pollTimeoutMs = opts.pollTimeoutMs ?? 30_000;

  const result = await pollForResult(handle.taskId, pollIntervalMs, pollTimeoutMs);
  if (result === "timeout") {
    return {
      status: "timeout",
      taskId: handle.taskId,
      output: null,
      errorCode: "AI_DISPATCH_TIMEOUT",
      errorMessage: `task did not reach terminal status in ${pollTimeoutMs}ms`,
      blockedReason: null,
      flaggedSensitive: false,
    };
  }
  return rowToOutcome<T>(handle.taskId, result);
}

// ── Public entrypoints (one per AI task type) ─────────────────────────────

/** Mirrors AiCompletionResult from adapters/ai/types.ts. */
export interface AiCompletionOutput {
  text: string;
  json?: unknown;
  interaction: {
    feature: string;
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    costUsd: number;
    latencyMs: number;
    fallbackUsed: boolean;
    status: "ok" | "error" | "blocked";
    blockReason?: string;
    metadata?: Record<string, unknown>;
  };
  flaggedSensitive?: boolean;
  flaggedReason?: string;
}

export function dispatchAiCompletion(
  payload: AiCompletionPayload,
  opts: AiDispatchOptions,
): Promise<AiDispatchOutcome<AiCompletionOutput>> {
  return dispatchAndAwait<AiCompletionOutput>(
    AI_TASK_TYPES.COMPLETION,
    payload as unknown as Record<string, unknown>,
    opts,
  );
}

export interface AiEmbeddingOutput {
  vectors: number[][];
  dim: number;
  cost_usd?: number;
  latency_ms?: number;
}

export function dispatchAiEmbedding(
  payload: AiEmbeddingPayload,
  opts: AiDispatchOptions,
): Promise<AiDispatchOutcome<AiEmbeddingOutput>> {
  return dispatchAndAwait<AiEmbeddingOutput>(
    AI_TASK_TYPES.EMBEDDING,
    payload as unknown as Record<string, unknown>,
    opts,
  );
}

export interface AiRagOutput {
  answer: string;
  citations: Array<{ id: string; score: number; snippet?: string }>;
  flaggedSensitive?: boolean;
  flaggedReason?: string;
  cost_usd?: number;
  latency_ms?: number;
}

export function dispatchAiRag(
  payload: AiRagPayload,
  opts: AiDispatchOptions,
): Promise<AiDispatchOutcome<AiRagOutput>> {
  return dispatchAndAwait<AiRagOutput>(
    AI_TASK_TYPES.RAG,
    payload as unknown as Record<string, unknown>,
    opts,
  );
}

export interface AiToolUseOutput {
  proposedDomain: string;
  proposedTaskType: string;
  proposedPayload: Record<string, unknown>;
  rationale: string | null;
  flaggedSensitive: true;
  flaggedReason: string;
}

export function dispatchAiToolUse(
  payload: AiToolUsePayload,
  opts: AiDispatchOptions,
): Promise<AiDispatchOutcome<AiToolUseOutput>> {
  return dispatchAndAwait<AiToolUseOutput>(
    AI_TASK_TYPES.TOOL_USE,
    payload as unknown as Record<string, unknown>,
    opts,
  );
}

// Re-exports so callsites only import from this module.
export { AI_DOMAIN, AI_TASK_TYPES };
