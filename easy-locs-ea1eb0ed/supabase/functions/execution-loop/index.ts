/**
 * execution-loop — Server-Side Autonomous Execution Loop (task #711)
 *
 * Polls system.execution_tasks for `queued` tasks (Phase-2 v2 status model,
 * task #750) where:
 *     risk_level = 'SAFE'  OR  approved_by IS NOT NULL
 * and `next_retry_at` is null or in the past (so backoff windows are honoured).
 *
 * Routes each task to the appropriate domain agent (registry by `domain`).
 * Enforces:
 *   - validation-engine gate (#710 RPC `system.validate_execution_task` with
 *     a defence-in-depth inline fallback)
 *   - atomic claim (single UPDATE...WHERE status='PENDING' RETURNING) so
 *     concurrent loop ticks cannot double-execute the same task
 *   - per-task timeout (payload.timeout_ms or default)
 *   - retry with exponential backoff via `next_retry_at` (NOT `updated_at`,
 *     which is overwritten by a BEFORE UPDATE touch trigger)
 *   - dead-letter on attempt exhaustion → status BLOCKED + blocked_reason
 *   - agent scope enforcement → out-of-scope tasks BLOCKED with refusal reason
 *
 * Every step is logged to public.engine_run_logs.
 *
 * Runs entirely server-side. No browser dependency. Triggered by
 * autonomous-cron-dispatcher OR by an admin via system-router /execution-loop.
 *
 * Phase-1 forbidden mutations (wallet, auth, schema, deployment, code patch,
 * secret, RLS, financial) are refused at the agent layer (see contract.ts).
 */
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import { getAgentForDomain } from "../_shared/execution-agents/registry.ts";
import type { AgentTaskInput, AgentTaskOutput } from "../_shared/execution-agents/contract.ts";
import {
  ExecutionOrchestratorV2,
  type ValidationGate,
} from "../_shared/execution/orchestrator-v2.ts";
import { globalAdapterRegistry } from "../_shared/execution/adapter-registry.ts";
import { globalVerifierRegistry } from "../_shared/execution/verifier-registry.ts";
import { TaskVerificationService } from "../_shared/execution/verification-service.ts";
import { bootstrapMarketplaceAdapters } from "../_shared/execution/adapters/marketplace/bootstrap.ts";
import { PostgresLockService } from "../_shared/execution/lock-service.ts";
import { PostgresIdempotencyService } from "../_shared/execution/idempotency-service.ts";
import { SupabaseTaskRepository } from "../_shared/execution/persistence.ts";
import type { ExecutionEventSink, CanonicalExecutionEvent } from "../_shared/execution/canonical-events.ts";
import {
  createHeartbeatEmitter,
  createServiceRoleHeartbeatRpc,
  deriveWorkerId,
  DEFAULT_HEARTBEAT_CADENCE_MS,
  type HeartbeatEmitter,
} from "../_shared/execution/heartbeat-emitter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_TIMEOUT_MS = 30_000;
const BACKOFF_BASE_MS = 2_000;
const BACKOFF_MAX_MS = 5 * 60 * 1000;

const TASK_COLUMNS =
  "id,type,domain,risk_level,status,payload,approved_by,attempt_count,max_attempts,parent_task_id,requested_by,blocked_reason,next_retry_at,created_at,updated_at";

interface ExecutionTaskRow {
  id: string;
  type: string;
  domain: string;
  risk_level: "SAFE" | "MEDIUM" | "CRITICAL";
  status:
    | "draft"
    | "pending_review"
    | "approved"
    | "rejected"
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "blocked"
    | "rolled_back"
    | "cancelled";
  payload: Record<string, unknown> | null;
  approved_by: string | null;
  attempt_count: number | null;
  max_attempts: number | null;
  parent_task_id: string | null;
  requested_by: string | null;
  blocked_reason: string | null;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

let _sb: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (_sb) return _sb;
  _sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  return _sb;
}

// All execution_tasks lives in the `system` schema (see migrations
// 20260418300000_execution_tasks.sql + 20260418300100_execution_tasks_hardening.sql).
function tasks() {
  return getSupabase().schema("system").from("execution_tasks");
}

async function logRun(params: {
  engineName: string;
  category: string;
  status: "ok" | "error" | "running";
  effectSummary?: string;
  errorMessage?: string;
  durationMs?: number;
  rowsAffected?: number;
  metadata?: Record<string, unknown>;
}) {
  try {
    // engine_run_logs lives in `public` (see migration
    // 20260325104429_..._engine_run_logs.sql — `CREATE TABLE public.engine_run_logs`).
    // The default supabase-js schema is `public`, so no `.schema(...)` call.
    await getSupabase().from("engine_run_logs").insert({
      engine_name: params.engineName,
      category: params.category,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: params.durationMs ?? 0,
      status: params.status,
      effect_summary: params.effectSummary ?? null,
      db_rows_affected: params.rowsAffected ?? 0,
      error_message: params.errorMessage ?? null,
      metadata_json: params.metadata ?? {},
      trigger_source: "execution-loop",
    });
  } catch (e) {
    console.error("[execution-loop] engine_run_logs insert failed:", e);
  }
}

function backoffMs(attempt: number): number {
  const ms = BACKOFF_BASE_MS * Math.pow(2, Math.max(0, attempt - 1));
  return Math.min(ms, BACKOFF_MAX_MS);
}

async function withTimeout<T>(p: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms (${label})`)), timeoutMs);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/**
 * validateTask — Pre-execution validation gate.
 *
 * Invokes the validation engine built in task #710. Two integration paths are
 * supported (in priority order); the loop never executes a task that fails
 * validation:
 *   1. Postgres RPC `validate_execution_task(p_task_id uuid)` returning
 *      `{ ok: bool, reason?: text }` — used when #710 has installed it.
 *   2. Inline structural fallback (defence-in-depth) covering the same rules
 *      enforced by the in-code validation engine: payload integrity, known
 *      domain, agent-scope membership, and CRITICAL-needs-approval gating.
 */
async function validateTask(
  task: ExecutionTaskRow,
): Promise<{ ok: boolean; reason?: string }> {
  // Path 1 — call the validation-engine RPC if installed (#710 deliverable).
  try {
    const { data, error } = await getSupabase()
      .schema("system")
      .rpc("validate_execution_task", { p_task_id: task.id });
    if (!error && data && typeof data === "object") {
      const r = data as { ok?: boolean; reason?: string };
      if (typeof r.ok === "boolean") return { ok: r.ok, reason: r.reason };
    }
    // If the RPC is missing (PGRST202 / 42883) we fall through.
  } catch {
    // Fall through to inline validation.
  }

  // Path 2 — inline structural fallback (defence-in-depth, fail-closed-leaning).
  // Mirrors the same hard gates as the RPC: required fields, Phase-1 strict
  // CRITICAL forbidden, MEDIUM per-type approval, and agent-scope membership.
  if (!task.id || !task.type || !task.domain) {
    return { ok: false, reason: "MISSING_FIELDS: id/type/domain are required" };
  }
  if (task.payload !== null && typeof task.payload !== "object") {
    return { ok: false, reason: "INVALID_PAYLOAD: payload must be a JSON object" };
  }
  // Phase-1 strict allowlist: CRITICAL never executes via the loop.
  if (task.risk_level === "CRITICAL") {
    return {
      ok: false,
      reason: "PHASE1_CRITICAL_FORBIDDEN: CRITICAL task types cannot execute in phase 1",
    };
  }
  // MEDIUM per-type approval policy (mirrors MEDIUM_TASK_APPROVAL_POLICY).
  const approver = (task.approved_by ?? "").trim();
  const typeUpper = task.type.toUpperCase();
  const mediumApprovalGated = typeUpper === "NOTIFICATION_DISPATCH"
    || typeUpper === "NON_SENSITIVE_BULK_UPDATE";
  if (task.risk_level === "MEDIUM" && mediumApprovalGated) {
    if (!approver || approver === "system") {
      return {
        ok: false,
        reason: `MEDIUM_REQUIRES_APPROVAL: task type "${task.type}" requires a non-system approver`,
      };
    }
  }
  const agent = getAgentForDomain(task.domain);
  if (!agent) {
    return { ok: false, reason: `UNKNOWN_DOMAIN: no agent registered for "${task.domain}"` };
  }
  if (!agent.allowedActionTypes.has(task.type)) {
    return { ok: false, reason: `OUT_OF_SCOPE: action "${task.type}" not in ${agent.name} scope` };
  }
  return { ok: true };
}

/**
 * atomicClaim — single-statement claim of a PENDING task.
 *
 * Uses Postgres' `UPDATE ... WHERE status='PENDING' RETURNING *` semantics via
 * PostgREST. If another loop tick claimed the row first, the update returns no
 * rows and we skip it. This prevents duplicate execution under concurrent ticks.
 */
async function atomicClaim(taskId: string, nextAttempt: number): Promise<ExecutionTaskRow | null> {
  const { data, error } = await tasks()
    .update({
      status: "running",
      attempt_count: nextAttempt,
      next_retry_at: null,
    })
    .eq("id", taskId)
    .eq("status", "queued")
    .select(TASK_COLUMNS)
    .maybeSingle();
  if (error) {
    console.warn("[execution-loop] atomicClaim error:", error.message);
    return null;
  }
  return (data as ExecutionTaskRow | null) ?? null;
}

// ── ExecutionOrchestratorV2 delegation ──────────────────────────────────────
// If a Phase-2 adapter is registered for this task's (domain, task_type),
// the loop hands the task off to ExecutionOrchestratorV2 and skips the
// Phase-1 agent path. Tasks without a registered adapter continue through
// the legacy agent flow below.
let _orchestrator: ExecutionOrchestratorV2 | null = null;
let _bootstrapPromise: Promise<void> | null = null;

// ── L2 (task #810): worker-process heartbeat ────────────────────────────────
// The execution-loop worker registers itself as `system.execution_loop` and
// emits a heartbeat at the configured cadence. ExecutionOrchestratorV2 also
// pings emitNow() on every task accept/complete so in_flight is accurate
// without waiting for the next tick. Best-effort: never blocks task
// execution and never throws.
let _heartbeat: HeartbeatEmitter | null = null;
let _inFlight = 0;
function getHeartbeat(): HeartbeatEmitter {
  if (_heartbeat) return _heartbeat;
  _heartbeat = createHeartbeatEmitter({
    agentSlug: "system.execution_loop",
    workerId: deriveWorkerId(),
    cadenceMs: DEFAULT_HEARTBEAT_CADENCE_MS,
    getInFlight:  () => _inFlight,
    getQueueDepth: () => 0,  // not tracked — pickEligibleTasks is on-demand
    region: Deno.env.get("FLY_REGION") ?? Deno.env.get("REGION") ?? null,
    rpc: createServiceRoleHeartbeatRpc(),
    onResult: (r) => {
      if (!r.ok) {
        // Visible in logs but does NOT affect task execution.
        console.warn("[execution-loop] heartbeat rpc failed:", r.errorMessage);
      }
    },
  });
  _heartbeat.start();
  return _heartbeat;
}

async function ensureAdaptersBootstrapped(sb: SupabaseClient): Promise<void> {
  if (!_bootstrapPromise) {
    // Cache the promise so concurrent callers await the same reconcile;
    // a thrown reconcile (production hard-fail) is re-cached so the next
    // call retries — better than poisoning the loop forever.
    _bootstrapPromise = bootstrapMarketplaceAdapters(sb).catch((e) => {
      _bootstrapPromise = null;
      throw e;
    });
  }
  return _bootstrapPromise;
}
async function getOrchestratorV2(): Promise<ExecutionOrchestratorV2> {
  if (_orchestrator) return _orchestrator;
  const sb = getSupabase();
  await ensureAdaptersBootstrapped(sb);
  const sink: ExecutionEventSink = {
    // Awaited so canonical-event ordering and durability survive across
    // pipeline steps; orchestrator surfaces any throw via outcome.sinkErrors.
    async emit(event: CanonicalExecutionEvent) {
      await logRun({
        engineName: `orchestrator-v2:${event.domain}`,
        category: event.name,
        status: event.name === "task.failed" || event.name === "task.blocked" ? "error" : "ok",
        effectSummary: `${event.name} ${event.taskId}`,
        metadata: {
          task_id: event.taskId,
          domain: event.domain,
          task_type: event.taskType,
          correlation_id: event.correlationId ?? null,
          payload: event.payload,
        },
      });
    },
  };
  const validator: ValidationGate = {
    async validate(t) {
      // Reuse the same RPC + fallback the Phase-1 path uses.
      const v = await validateTask({
        id: t.id,
        type: t.type,
        domain: t.domain,
        risk_level: t.risk_level,
        status: "queued" as ExecutionTaskRow["status"],
        payload: t.payload,
        approved_by: t.approved_by,
        attempt_count: t.attempt_count,
        max_attempts: 3,
        parent_task_id: null,
        requested_by: t.requested_by,
        blocked_reason: null,
        next_retry_at: null,
        created_at: "",
        updated_at: "",
      });
      return v.ok ? { ok: true } : { ok: false, reason: v.reason };
    },
  };
  _orchestrator = new ExecutionOrchestratorV2({
    registry: globalAdapterRegistry,
    repository: new SupabaseTaskRepository(sb),
    locks: new PostgresLockService(sb),
    idempotency: new PostgresIdempotencyService(sb),
    validator,
    sink,
    // Phase-2 task #753: non-skippable Verification Layer. Missing verifier
    // → NO_VERIFIER → blocked.
    verification: new TaskVerificationService(globalVerifierRegistry),
    ownerId: `execution-loop-${crypto.randomUUID()}`,
    // L2 — heartbeat is started lazily by getHeartbeat() and shared across
    // every orchestrator run on this worker.
    heartbeat: getHeartbeat(),
  });
  return _orchestrator;
}

async function processTask(
  task: ExecutionTaskRow,
): Promise<{ outcome: "SUCCESS" | "FAILED" | "BLOCKED" | "SKIPPED"; agentResult?: AgentTaskOutput; error?: string }> {
  // Phase-2 delegation: if (domain, task_type) is registered in the V2
  // adapter registry, route the task there. Otherwise fall through to the
  // Phase-1 agent path below.
  ensureAdaptersBootstrapped(getSupabase());
  if (globalAdapterRegistry.has(task.domain, task.type)) {
    _inFlight++;
    try {
      const out = await (await getOrchestratorV2()).run(task.id);
      if (out.finalStatus === "succeeded") return { outcome: "SUCCESS" };
      if (out.finalStatus === "failed") {
        return { outcome: "FAILED", error: out.errorMessage };
      }
      return { outcome: "BLOCKED", error: out.errorMessage };
    } finally {
      _inFlight = Math.max(0, _inFlight - 1);
    }
  }

  const start = Date.now();
  const maxAttempts = Math.max(1, task.max_attempts ?? 3);
  const currentAttempt = (task.attempt_count ?? 0) + 1;

  // Validation engine gate (RPC from #710, with inline fallback).
  const validation = await validateTask(task);
  if (!validation.ok) {
    const reason = `Validation engine rejected task: ${validation.reason ?? "unspecified"}`;
    await tasks()
      .update({ status: "blocked", blocked_reason: reason })
      .eq("id", task.id)
      .eq("status", "queued");
    await logRun({
      engineName: "execution-loop",
      category: "task-validation-rejected",
      status: "error",
      effectSummary: reason,
      metadata: { task_id: task.id, type: task.type, domain: task.domain, risk_level: task.risk_level },
    });
    return { outcome: "BLOCKED", error: reason };
  }

  // Atomic claim — guarantees a single loop tick processes the task.
  const claimed = await atomicClaim(task.id, currentAttempt);
  if (!claimed) {
    return { outcome: "SKIPPED", error: "Task already claimed by a concurrent loop tick" };
  }

  // Re-resolve agent (validation already checked, but keep handler local).
  const agent = getAgentForDomain(claimed.domain)!;

  await logRun({
    engineName: `execution-loop:${agent.name}`,
    category: "task-running",
    status: "running",
    effectSummary: `attempt ${currentAttempt}/${maxAttempts} — ${task.type}`,
    metadata: { task_id: task.id, type: task.type, domain: task.domain, attempt: currentAttempt },
  });

  const input: AgentTaskInput = {
    taskId: task.id,
    type: task.type,
    domain: task.domain,
    riskLevel: task.risk_level,
    payload: task.payload ?? {},
    approvedBy: task.approved_by,
    attemptCount: currentAttempt,
    requestedBy: task.requested_by ?? "system",
  };

  const timeoutMs = Number((task.payload as Record<string, unknown>)?.timeout_ms ?? DEFAULT_TIMEOUT_MS);

  let result: AgentTaskOutput;
  try {
    result = await withTimeout(agent.execute(input), timeoutMs, `${agent.name}.execute`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return await handleFailure(task, currentAttempt, maxAttempts, msg, Date.now() - start, agent.name);
  }

  const durationMs = Date.now() - start;

  // Refusal → dead-letter (BLOCKED) immediately
  if (result.refused) {
    const reason = result.refusalReason ?? "Agent refused task";
    await tasks()
      .update({
        status: "blocked",
        blocked_reason: reason,
        result: result.output ?? null,
      })
      .eq("id", task.id);
    await logRun({
      engineName: `execution-loop:${agent.name}`,
      category: "task-refused",
      status: "error",
      effectSummary: reason,
      durationMs,
      metadata: {
        task_id: task.id, type: task.type, domain: task.domain,
        logs: result.logs, actions_taken: result.actionsTaken,
      },
    });
    return { outcome: "BLOCKED", agentResult: result, error: reason };
  }

  if (!result.success) {
    return await handleFailure(
      task, currentAttempt, maxAttempts,
      result.errorMessage ?? "Agent reported failure",
      durationMs, agent.name, result,
    );
  }

  // SUCCESS
  await tasks()
    .update({
      status: "succeeded",
      result: {
        output: result.output ?? null,
        logs: result.logs,
        actions_taken: result.actionsTaken,
        duration_ms: durationMs,
        agent: agent.name,
      },
      error: null,
    })
    .eq("id", task.id);

  await logRun({
    engineName: `execution-loop:${agent.name}`,
    category: "task-success",
    status: "ok",
    effectSummary: `task ${task.id} type=${task.type} success`,
    durationMs,
    metadata: {
      task_id: task.id, type: task.type, domain: task.domain,
      attempt: currentAttempt, actions_taken: result.actionsTaken,
    },
  });

  return { outcome: "SUCCESS", agentResult: result };
}

async function handleFailure(
  task: ExecutionTaskRow,
  attempt: number,
  maxAttempts: number,
  errorMsg: string,
  durationMs: number,
  agentName: string,
  agentResult?: AgentTaskOutput,
): Promise<{ outcome: "FAILED" | "BLOCKED"; agentResult?: AgentTaskOutput; error: string }> {
  if (attempt >= maxAttempts) {
    // Dead-letter
    const reason = `Dead-letter after ${attempt}/${maxAttempts} attempts — last error: ${errorMsg}`;
    await tasks()
      .update({
        status: "blocked",
        blocked_reason: reason,
        error: errorMsg,
        next_retry_at: null,
      })
      .eq("id", task.id);
    await logRun({
      engineName: `execution-loop:${agentName}`,
      category: "task-dead-letter",
      status: "error",
      effectSummary: reason,
      errorMessage: errorMsg,
      durationMs,
      metadata: {
        task_id: task.id, type: task.type, domain: task.domain,
        attempt, max_attempts: maxAttempts,
        logs: agentResult?.logs, actions_taken: agentResult?.actionsTaken,
      },
    });
    return { outcome: "BLOCKED", agentResult, error: reason };
  }

  // Schedule retry — write the future pickup time into next_retry_at so the
  // BEFORE UPDATE touch trigger (which always sets updated_at = now()) does
  // not nullify our backoff window. The Phase-2 v2 state-machine trigger
  // (task #750) only allows running → {succeeded, failed, blocked}, so we
  // hop via failed before re-queuing (failed → queued is an allowed
  // transition in the v2 matrix).
  const backoff = backoffMs(attempt);
  const retryAt = new Date(Date.now() + backoff).toISOString();
  await tasks()
    .update({ status: "failed", error: errorMsg })
    .eq("id", task.id)
    .eq("status", "running");
  await tasks()
    .update({
      status: "queued",
      next_retry_at: retryAt,
    })
    .eq("id", task.id)
    .eq("status", "failed");

  await logRun({
    engineName: `execution-loop:${agentName}`,
    category: "task-retry-scheduled",
    status: "error",
    effectSummary: `retry ${attempt + 1}/${maxAttempts} scheduled in ${backoff}ms`,
    errorMessage: errorMsg,
    durationMs,
    metadata: {
      task_id: task.id, type: task.type, domain: task.domain,
      attempt, max_attempts: maxAttempts, backoff_ms: backoff, next_retry_at: retryAt,
    },
  });

  return { outcome: "FAILED", agentResult, error: errorMsg };
}

async function pickEligibleTasks(batchSize: number): Promise<ExecutionTaskRow[]> {
  // Eligibility (single unambiguous expression — no chained .or() so the
  // semantics are explicit at the SQL layer, not implied by client chaining):
  //   status = 'queued'  (Phase-2 v2 — task #750)
  //   AND (
  //         (risk_level = 'SAFE'         AND (next_retry_at IS NULL OR next_retry_at <= now()))
  //      OR (approved_by IS NOT NULL     AND (next_retry_at IS NULL OR next_retry_at <= now()))
  //   )
  const nowIso = new Date().toISOString();
  const eligibilityExpr =
    `and(risk_level.eq.SAFE,or(next_retry_at.is.null,next_retry_at.lte.${nowIso})),` +
    `and(approved_by.not.is.null,or(next_retry_at.is.null,next_retry_at.lte.${nowIso}))`;

  const { data, error } = await tasks()
    .select(TASK_COLUMNS)
    .eq("status", "queued")
    .or(eligibilityExpr)
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (error) {
    console.warn("[execution-loop] pick query failed:", error.message);
    return [];
  }
  return (data ?? []) as ExecutionTaskRow[];
}

Deno.serve(async (req) => {
  const __qs = rejectQuerySecrets(req);
  if (__qs.rejected) return __qs.response!;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Origin gate: requireRouterOrigin already accepts BOTH the router internal
  // header (set by system-router on admin-gated proxies) AND a direct
  // service-role bearer (used by the autonomous cron dispatcher). We rely on
  // it as the single auth check so router-proxied admin calls are not
  // rejected for failing a redundant service-role check.
  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;

  const startedAt = Date.now();
  let body: Record<string, unknown> = {};
  try { body = (await req.json()) ?? {}; } catch { /* no body ok */ }

  const batchSize = Number(body.batch_size ?? DEFAULT_BATCH_SIZE);

  let pending: ExecutionTaskRow[] = [];
  let pickError: string | null = null;
  try {
    pending = await pickEligibleTasks(batchSize);
  } catch (e: unknown) {
    pickError = e instanceof Error ? e.message : String(e);
  }

  const summary = {
    picked: pending.length,
    success: 0,
    failed: 0,
    blocked: 0,
    refused: 0,
    skipped: 0,
  };
  const results: Array<{ id: string; type: string; outcome: string; error?: string }> = [];

  for (const task of pending) {
    try {
      const r = await processTask(task);
      if (r.outcome === "SUCCESS") summary.success++;
      else if (r.outcome === "FAILED") summary.failed++;
      else if (r.outcome === "SKIPPED") summary.skipped++;
      else if (r.outcome === "BLOCKED") {
        summary.blocked++;
        if (r.agentResult?.refused) summary.refused++;
      }
      results.push({ id: task.id, type: task.type, outcome: r.outcome, error: r.error });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.failed++;
      results.push({ id: task.id, type: task.type, outcome: "FAILED", error: msg });
    }
  }

  await logRun({
    engineName: "execution-loop",
    category: "loop-tick",
    status: pickError ? "error" : "ok",
    effectSummary: pickError
      ? `loop tick failed: ${pickError}`
      : `loop tick: ${summary.picked} picked, ${summary.success} ok, ${summary.failed} retry, ${summary.blocked} blocked, ${summary.skipped} skipped`,
    errorMessage: pickError ?? undefined,
    durationMs: Date.now() - startedAt,
    rowsAffected: summary.picked,
    metadata: { summary, results },
  });

  return new Response(
    JSON.stringify({
      ok: !pickError,
      pick_error: pickError,
      summary,
      results,
      total_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
