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
import { bootstrapAiAdapters } from "../_shared/execution/adapters/ai/bootstrap.ts";
// L7 P1 (#926) — payments + wallet governed adapters, behind feature flags
import { bootstrapPaymentsAdapters } from "../_shared/execution/adapters/payments/bootstrap.ts";
import { bootstrapWalletAdapters } from "../_shared/execution/adapters/wallet/bootstrap.ts";
// P4 (#945) — content + contacts adapter framework. Both are gated on
// per-domain feature flags (`AGENT_CONTENT_ENABLED`, `AGENT_CONTACTS_ENABLED`)
// so the §7 dispatch-allowlist drain can land phase-by-phase. No silent
// fallback: when a flag is off the adapters are NOT registered and any
// task dispatched to that domain fails loudly with NO_ADAPTER.
import { bootstrapContentAdapters } from "../_shared/execution/adapters/content/bootstrap.ts";
import { bootstrapContactsAdapters } from "../_shared/execution/adapters/contacts/bootstrap.ts";
// LC2 (#872) — dev-pipeline code.tool adapters
import { bootstrapBuildAdapters } from "../_shared/execution/adapters/build/bootstrap.ts";
import { bootstrapTestAdapters } from "../_shared/execution/adapters/test/bootstrap.ts";
import { bootstrapDeployPreviewAdapters } from "../_shared/execution/adapters/deploy/preview/bootstrap.ts";
import { bootstrapDeployProdAdapters } from "../_shared/execution/adapters/deploy/prod/bootstrap.ts";
// LC6 (#877) — post-settlement auto-rollback dispatcher for deploy.prod.
import {
  createSupabaseRollbackDispatcher,
  createSupabaseSettledFetcher,
  runAndReconcileDeployProdTask,
} from "../_shared/execution/adapters/deploy/prod/lc6-glue.ts";
import { createGithubRevertClientFromEnv } from "../_shared/execution/rollback/github-client.ts";
// LC1 (#871) — code.edit primitive used by Level-C build agents.
import { bootstrapCodeEditAdapter } from "../_shared/execution/adapters/code/bootstrap.ts";
import { PostgresLockService } from "../_shared/execution/lock-service.ts";
import { PostgresIdempotencyService } from "../_shared/execution/idempotency-service.ts";
import {
  SupabaseTaskRepository,
  createSupabaseDefaultSnapshotter,
} from "../_shared/execution/persistence.ts";
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
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_TIMEOUT_MS = 30_000;
const BACKOFF_BASE_MS = 2_000;
const BACKOFF_MAX_MS = 5 * 60 * 1000;

const TASK_COLUMNS =
  "id,type,domain,risk_level,status,payload,approved_by,attempt_count,max_attempts,parent_task_id,requested_by,blocked_reason,next_retry_at,runner,created_at,updated_at";

interface ExecutionTaskRow {
  id: string;
  type: string;
  domain: string;
  risk_level: "SAFE" | "MEDIUM" | "CRITICAL";
  runner: "internal" | "github" | null;
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
    | "rolling_back"
    | "rolled_back"
    | "rollback_failed"
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
  // V2-registered governed adapters bypass the Phase-1 strict allowlist.
  // Payments + wallet (#926) are CRITICAL by classification but execute via
  // ExecutionOrchestratorV2 with verifier + rollback + feature-flag gating, so
  // the unconditional CRITICAL hard-reject (a Phase-1-only safety net) must
  // step aside when the orchestrator owns the path. Without this branch the
  // newly registered FINANCIAL_* / WALLET_* adapters are unreachable.
  if (globalAdapterRegistry.has(task.domain, task.type)) {
    return { ok: true };
  }
  // Phase-1 strict allowlist: CRITICAL never executes via the legacy loop.
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
  // GitHub-runner tasks (#816): routed via the runner column, not domain agent registry.
  // Phase-1 validation is purely structural; the dispatch function itself enforces secrets.
  if ((task as ExecutionTaskRow).runner === "github") {
    return { ok: true };
  }
  // V2-registered adapters (marketplace, etc.) bypass the Phase-1 agent scope check.
  if (globalAdapterRegistry.has(task.domain, task.type)) {
    return { ok: true };
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

// P4 (#945) — feature-flag readers. Env-var-backed for now; an admin UI
// can flip these without a redeploy by setting them at the function
// runtime layer. Default is OFF so a fresh deploy stays in the
// pre-cutover state until the operator opts in. There is no third
// "silent" branch: a flag is either ON (adapters register) or OFF
// (tasks fail with NO_ADAPTER).
function readEnvFlag(name: string): boolean {
  try {
    const v = (Deno.env.get(name) ?? "").trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes" || v === "on";
  } catch {
    return false;
  }
}
function isAgentContentEnabled(): boolean {
  return readEnvFlag("AGENT_CONTENT_ENABLED");
}
function isAgentContactsEnabled(): boolean {
  return readEnvFlag("AGENT_CONTACTS_ENABLED");
}

async function ensureAdaptersBootstrapped(sb: SupabaseClient): Promise<void> {
  if (!_bootstrapPromise) {
    // Cache the promise so concurrent callers await the same reconcile;
    // a thrown reconcile (production hard-fail) is re-cached so the next
    // call retries — better than poisoning the loop forever.
    _bootstrapPromise = (async () => {
      // LB1 (#815): AI adapters share the same registry as business adapters.
      // Both reconcile against system.agents; in production a failed reconcile
      // is a hard boot-fail, in dev/preview we log and continue (handled
      // inside each bootstrap function).
      await bootstrapMarketplaceAdapters(sb);
      await bootstrapAiAdapters(sb);
      // L7 P1 (#926) — payments + wallet adapters. Each refuses with
      // ADAPTER_DISABLED when its `agent.{payments,wallet}.enabled`
      // feature flag is off (canary off in production by default).
      await bootstrapPaymentsAdapters(sb);
      await bootstrapWalletAdapters(sb);
      // P4 (#945) — content + contacts. Each is gated on its own
      // feature flag so the L7 §7 mechanical drain can land phase-by-
      // phase. When the flag is off we DO NOT register the adapter:
      // any task dispatched to (content.*, contacts.*) then fails
      // loudly with NO_ADAPTER (see globalAdapterRegistry.has check
      // in validateTask). There is no silent fallback to direct mutation.
      if (isAgentContentEnabled()) {
        await bootstrapContentAdapters(sb);
      } else {
        console.warn(
          "[execution-loop] P4 content adapters disabled (set AGENT_CONTENT_ENABLED=true to enable). " +
          "Tasks dispatched to content.* domains will fail with NO_ADAPTER until enabled.",
        );
      }
      if (isAgentContactsEnabled()) {
        await bootstrapContactsAdapters(sb);
      } else {
        console.warn(
          "[execution-loop] P4 contacts adapters disabled (set AGENT_CONTACTS_ENABLED=true to enable). " +
          "Tasks dispatched to contacts.* domains will fail with NO_ADAPTER until enabled.",
        );
      }
      // LC2 (#872) — dev pipeline. Each bootstrap reconciles its own
      // agent rows in `system.agents`; in production a failed reconcile
      // hard-fails the boot, in dev/preview it logs and continues.
      await bootstrapBuildAdapters(sb);
      await bootstrapTestAdapters(sb);
      await bootstrapDeployPreviewAdapters(sb);
      // LC6 (#877): pass a real GitHub revert client when the runner
      // secrets are present. Without them LC6 stays off and the
      // adapter keeps its LC2 default (`rollback_strategy="none"`).
      const githubRevert = createGithubRevertClientFromEnv(Deno.env);
      if (!githubRevert) {
        console.warn(
          "[execution-loop] LC6 disabled: GITHUB_RUNNER_PAT/GITHUB_RUNNER_REPO missing; " +
            "deploy.prod auto-rollback will not fire until secrets are provisioned.",
        );
      }
      await bootstrapDeployProdAdapters(sb, githubRevert ? { github: githubRevert } : {});
      // LC1 (#871): code.edit primitive for Level-C build agents.
      await bootstrapCodeEditAdapter(sb);
      // L7 P4 (#928): content + contacts adapter families. Gated by
      // `agent.content.enabled` / `agent.contacts.enabled`. Each
      // bootstrap reads its flag from `system.feature_flags` and
      // returns early when the flag is off.
      await bootstrapContentAdapters(sb);
      await bootstrapContactsAdapters(sb);
    })().catch((e) => {
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
    // L3 (#811) — kind-agnostic pre-execute entity snapshot. Resolves
    // task.entity_type='<schema>.<table>' + task.entity_id to a `SELECT *`
    // against the canonical domain-schema table, so adapters without an
    // explicit `snapshotProvider` still get true pre-mutation row state
    // captured into `previous_state`.
    defaultSnapshotter: createSupabaseDefaultSnapshotter(sb),
    // LB1 follow-up #834 — generic pre-execute quota gate. Reuses the
    // shared `system.peek_agent_quota` RPC (no AI-specific behaviour) so
    // any agent-bound task is gated uniformly. Adapters never call peek
    // themselves; the orchestrator is the single source of truth.
    agentQuotaGate: {
      async peek({ agentId }: { agentId: string }) {
        const { data, error } = await sb
          .schema("system")
          .rpc("peek_agent_quota", { p_agent_id: agentId });
        if (error) {
          // Fail closed: refuse rather than silently bypass quota.
          return {
            ok: false as const,
            reason: `quota_rpc_error:${error.message}`,
            window: "rpc",
          };
        }
        const row = (Array.isArray(data) ? data[0] : data) as
          | {
              ok?: boolean;
              blocked_reason?: string;
              blocked_window?: string;
              current_count?: number;
              limit_count?: number;
            }
          | null;
        if (!row || row.ok !== true) {
          return {
            ok: false as const,
            reason: row?.blocked_reason ?? "unknown",
            window: row?.blocked_window ?? "unknown",
            currentCount: row?.current_count,
            limitCount: row?.limit_count,
          };
        }
        return { ok: true as const };
      },
    },
  });
  return _orchestrator;
}

// ── GitHub Actions runner dispatch (Phase 1, #816) ─────────────────────────
// Tasks with runner='github' bypass the V2 orchestrator and the Phase-1
// agent path. The execution-loop dispatches them to GitHub Actions via
// workflow_dispatch and leaves the task in `running`. The callback Edge
// Function (execution-runner-callback) is the sole authority that transitions
// the task to `succeeded` or `failed` once the workflow finishes.

/**
 * Compute HMAC-SHA256(key, message) as lowercase hex.
 * Used to derive the runner callback credential from the shared RUNNER_HMAC_KEY
 * secret so the raw credential is never sent over workflow_dispatch inputs
 * (which are visible in the GitHub Actions UI to repo members).
 *
 * The callback Edge Function recomputes the same HMAC from the same key + task_id
 * to verify without storing a per-task random token.
 */
async function _ghHmac(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function _ghDispatch(
  pat: string,
  repo: string,
  ref: string,
  inputs: Record<string, string>,
): Promise<boolean> {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/execution-runner.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref, inputs }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn(`[execution-loop:github-runner] workflow_dispatch failed: ${res.status} ${text}`);
  }
  return res.status === 204;
}

async function dispatchGitHubRunnerTask(
  task: ExecutionTaskRow,
): Promise<{ outcome: "SUCCESS" | "FAILED" | "BLOCKED" | "SKIPPED"; error?: string }> {
  const start = Date.now();
  const currentAttempt = (task.attempt_count ?? 0) + 1;
  const maxAttempts = Math.max(1, task.max_attempts ?? 3);

  // Validation gate (same as Phase-1 path)
  const validation = await validateTask(task);
  if (!validation.ok) {
    const reason = `Validation rejected github-runner task: ${validation.reason ?? "unspecified"}`;
    await tasks()
      .update({ status: "blocked", blocked_reason: reason })
      .eq("id", task.id)
      .eq("status", "queued");
    await logRun({
      engineName: "execution-loop:github-runner",
      category: "task-validation-rejected",
      status: "error",
      effectSummary: reason,
      metadata: { task_id: task.id, type: task.type, domain: task.domain },
    });
    return { outcome: "BLOCKED", error: reason };
  }

  // Atomic claim (queued → running) — prevents double-dispatch on concurrent ticks.
  const claimed = await atomicClaim(task.id, currentAttempt);
  if (!claimed) {
    return { outcome: "SKIPPED", error: "Task already claimed by a concurrent loop tick" };
  }

  const pat = Deno.env.get("GITHUB_RUNNER_PAT") ?? "";
  const repo = Deno.env.get("GITHUB_RUNNER_REPO") ?? "";
  const ref = Deno.env.get("GITHUB_RUNNER_REF") ?? "main";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const hmacKey = Deno.env.get("RUNNER_HMAC_KEY") ?? "";

  if (!pat || !repo || !hmacKey) {
    const reason = "GITHUB_RUNNER_MISSING_SECRETS: GITHUB_RUNNER_PAT, GITHUB_RUNNER_REPO, or RUNNER_HMAC_KEY not configured";
    if (currentAttempt >= maxAttempts) {
      await tasks()
        .update({ status: "failed", error_code: reason })
        .eq("id", task.id);
    } else {
      const retryAt = new Date(Date.now() + backoffMs(currentAttempt)).toISOString();
      await tasks()
        .update({ status: "queued", next_retry_at: retryAt, error_code: reason })
        .eq("id", task.id);
    }
    return { outcome: "FAILED", error: reason };
  }

  // Derive the expected callback credential via HMAC-SHA256(RUNNER_HMAC_KEY, task_id).
  // This is stored as runner_token_hash and the callback recomputes it from the same
  // shared secret — the raw credential is never sent in workflow_dispatch inputs
  // (which are visible in the GitHub Actions UI to repo members with Actions:read).
  const expectedHmac = await _ghHmac(hmacKey, task.id);

  await tasks()
    .update({ runner_token_hash: expectedHmac })
    .eq("id", task.id);

  const payload = (task.payload ?? {}) as Record<string, unknown>;
  const dispatched = await _ghDispatch(pat, repo, ref, {
    task_id: task.id,
    task_type: task.type,
    supabase_url: supabaseUrl,
    label: typeof payload.label === "string" ? payload.label : "",
    // NOTE: callback_token is intentionally omitted from inputs.
    // The GitHub Actions runner reads RUNNER_HMAC_KEY from its own repo secrets
    // and computes HMAC-SHA256(key, task_id) locally to produce the header value.
  });

  if (!dispatched) {
    const reason = "GITHUB_RUNNER_DISPATCH_FAILED: workflow_dispatch to GitHub returned non-204";
    if (currentAttempt >= maxAttempts) {
      await tasks()
        .update({ status: "failed", error_code: reason, runner_token_hash: null })
        .eq("id", task.id);
      return { outcome: "FAILED", error: reason };
    }
    const retryAt = new Date(Date.now() + backoffMs(currentAttempt)).toISOString();
    await tasks()
      .update({ status: "queued", next_retry_at: retryAt, error_code: reason, runner_token_hash: null })
      .eq("id", task.id);
    return { outcome: "FAILED", error: reason };
  }

  // Dispatch confirmed. Task is now `running`; the callback drives terminal transition.
  await logRun({
    engineName: "execution-loop:github-runner",
    category: "github-runner-dispatched",
    status: "ok",
    effectSummary: `dispatched task ${task.id} (${task.type}) to ${repo}/execution-runner.yml ref=${ref}`,
    durationMs: Date.now() - start,
    metadata: { task_id: task.id, type: task.type, domain: task.domain, repo, ref, attempt: currentAttempt },
  });

  // Return SUCCESS to the loop tick (= dispatch confirmed). Task status stays
  // `running` until execution-runner-callback transitions it to succeeded/failed.
  return { outcome: "SUCCESS" };
}

async function processTask(
  task: ExecutionTaskRow,
): Promise<{ outcome: "SUCCESS" | "FAILED" | "BLOCKED" | "SKIPPED"; agentResult?: AgentTaskOutput; error?: string }> {
  // GitHub Actions runner (#816): tasks with runner='github' are dispatched
  // to GitHub Actions and kept `running` until the callback resolves them.
  // This check MUST come before the V2 registry delegation so runner-column
  // routing takes precedence over any (domain, type) registry match.
  if (task.runner === "github") {
    return await dispatchGitHubRunnerTask(task);
  }

  // Phase-2 delegation: if (domain, task_type) is registered in the V2
  // adapter registry, route the task there. Otherwise fall through to the
  // Phase-1 agent path below.
  ensureAdaptersBootstrapped(getSupabase());
  if (globalAdapterRegistry.has(task.domain, task.type)) {
    _inFlight++;
    try {
      const orchestrator = await getOrchestratorV2();
      // LC6 (#877): only wrap `run()` with post-settlement auto-rollback
      // reconcile for actual `deploy.prod` rows. Every other V2 task
      // (code.edit, build, test, deploy.prod.rollback itself, etc.)
      // goes through the plain orchestrator path — this keeps LC6's
      // extra DB read + log volume gated to the single domain/type
      // where it can ever matter.
      const isLc6Target = task.domain === "deploy" && task.type === "deploy.prod";
      if (!isLc6Target) {
        const outPlain = await orchestrator.run(task.id);
        if (outPlain.finalStatus === "succeeded") return { outcome: "SUCCESS" };
        if (outPlain.finalStatus === "failed") {
          return { outcome: "FAILED", error: outPlain.errorMessage };
        }
        return { outcome: "BLOCKED", error: outPlain.errorMessage };
      }
      const sb = getSupabase();
      // LC6 (#877) deployContext: repo/branch are copied onto the new
      // child rollback execution_tasks row's payload so the
      // `deploy.prod.rollback` adapter can execute `revert_pr` without
      // re-reading env at run time. When `GITHUB_RUNNER_REPO` is
      // absent we explicitly skip auto-rollback dispatch instead of
      // queuing a child row destined to fail invocation validation.
      const lc6Repo = Deno.env.get("GITHUB_RUNNER_REPO") ?? undefined;
      const lc6Branch = Deno.env.get("GITHUB_RUNNER_REF") ?? "main";
      if (!lc6Repo) {
        const outPlain = await orchestrator.run(task.id);
        await logRun({
          engineName: "execution-loop:lc6",
          category: "auto-rollback-skipped",
          status: "ok",
          effectSummary:
            "auto-rollback skipped: GITHUB_RUNNER_REPO not configured",
          metadata: { task_id: task.id, skipped_reason: "missing_github_runner_repo" },
        });
        if (outPlain.finalStatus === "succeeded") return { outcome: "SUCCESS" };
        if (outPlain.finalStatus === "failed") {
          return { outcome: "FAILED", error: outPlain.errorMessage };
        }
        return { outcome: "BLOCKED", error: outPlain.errorMessage };
      }
      const { outcome: out, autoRollback } = await runAndReconcileDeployProdTask({
        orchestrator,
        taskId: task.id,
        fetchSettled: createSupabaseSettledFetcher(sb),
        dispatcher: createSupabaseRollbackDispatcher(sb),
        deployContext: { repo: lc6Repo, branch: lc6Branch },
      });
      if (autoRollback?.triggered) {
        await logRun({
          engineName: "execution-loop:lc6",
          category: "auto-rollback-dispatched",
          status: "ok",
          effectSummary:
            `auto-rollback dispatched (strategy=${autoRollback.strategySlug})`,
          metadata: {
            task_id: task.id,
            rollback_task_id: autoRollback.rollbackTaskId,
            strategy: autoRollback.strategySlug,
            trigger_error_code: out.errorCode ?? null,
          },
        });
      } else if (autoRollback) {
        await logRun({
          engineName: "execution-loop:lc6",
          category: "auto-rollback-skipped",
          status: "ok",
          effectSummary: `auto-rollback skipped: ${autoRollback.skippedReason}`,
          metadata: { task_id: task.id, skipped_reason: autoRollback.skippedReason },
        });
      }
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
        execution_result: result.output ?? null,
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
      execution_result: {
        output: result.output ?? null,
        logs: result.logs,
        actions_taken: result.actionsTaken,
        duration_ms: durationMs,
        agent: agent.name,
      },
      error_code: null,
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
        error_code: errorMsg,
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
    .update({ status: "failed", error_code: errorMsg })
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

/**
 * Sovereign Agent Control · L3 (#811) — pick rows that have been
 * transitioned into `rolling_back` (typically by `system.request_rollback`
 * RPC, the admin /admin/agents cockpit, or operator action). These rows
 * bypass the normal queued/approval gate — approval to ROLL BACK is
 * granted by the act of moving the row into `rolling_back`.
 *
 * Returned rows are routed to `getOrchestratorV2().runRollback(taskId)`
 * which owns the rolling_back → {rolled_back | rollback_failed} terminal
 * transition and emits the canonical rollback events.
 */
async function pickRollbackTasks(batchSize: number): Promise<ExecutionTaskRow[]> {
  const { data, error } = await tasks()
    .select(TASK_COLUMNS)
    .eq("status", "rolling_back")
    .order("rollback_started_at", { ascending: true, nullsFirst: true })
    .limit(batchSize);

  if (error) {
    // Schema may pre-date the L3 migration during gradual rollout — degrade
    // gracefully rather than blocking the main queue tick.
    if (/column .* does not exist/i.test(error.message)) {
      const { data: legacy } = await tasks()
        .select(TASK_COLUMNS)
        .eq("status", "rolling_back")
        .order("created_at", { ascending: true })
        .limit(batchSize);
      return (legacy ?? []) as ExecutionTaskRow[];
    }
    console.warn("[execution-loop] rollback pick query failed:", error.message);
    return [];
  }
  return (data ?? []) as ExecutionTaskRow[];
}

async function processRollback(
  task: ExecutionTaskRow,
): Promise<{ outcome: "SUCCESS" | "FAILED" | "BLOCKED"; error?: string }> {
  ensureAdaptersBootstrapped(getSupabase());
  if (!globalAdapterRegistry.has(task.domain, task.type)) {
    // No V2 adapter for this (domain, type). Fail-loud: drive the row to
    // `rollback_failed` so it shows up red in the operator inbox instead
    // of silently lingering in `rolling_back` (which the heartbeat /
    // dashboards can mis-read as "in progress").
    const reason =
      `No V2 adapter registered for (${task.domain}, ${task.type}); ` +
      `rollback requires a registered handler`;
    try {
      const sb = getSupabase();
      await sb.schema("system").from("execution_tasks").update({
        status: "rollback_failed",
        error_code: "NO_ADAPTER",
        rollback_result: { error: reason, success: false, trigger: "execution_loop" },
      }).eq("id", task.id).eq("status", "rolling_back");
    } catch (e) {
      console.warn(
        "[execution-loop] failed to mark rollback_failed for unregistered adapter:",
        e instanceof Error ? e.message : String(e),
      );
    }
    return { outcome: "FAILED", error: reason };
  }
  _inFlight++;
  try {
    const out = await (await getOrchestratorV2()).runRollback(task.id);
    if (out.finalStatus === "succeeded") return { outcome: "SUCCESS" };
    if (out.finalStatus === "failed") return { outcome: "FAILED", error: out.errorMessage };
    return { outcome: "BLOCKED", error: out.errorMessage };
  } finally {
    _inFlight = Math.max(0, _inFlight - 1);
  }
}

// L2 — Eager heartbeat start at worker bootstrap.
// The worker is "alive" the moment the edge runtime imports this module,
// not only when it first runs an adapter task. Starting the emitter here
// (instead of lazily inside getHeartbeat()) ensures the registry shows
// `system.execution_loop` as `healthy` immediately after process boot,
// which matches operator expectations for always-on liveness.
try { getHeartbeat(); }
catch (e) { console.warn("[execution-loop] eager heartbeat start failed:", e); }

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

  // ── Sovereign Agent Control · L3 (#811): drain pending rollbacks ────
  // Run AFTER the queued batch so rollback work uses any spare lock/quota
  // budget but never starves new tasks. Failures are leave-as-is —
  // `rollback_failed` rows persist for human resolution.
  let rollbackPending: ExecutionTaskRow[] = [];
  try {
    rollbackPending = await pickRollbackTasks(batchSize);
  } catch (e) {
    console.warn("[execution-loop] rollback pick threw:", e);
  }
  const rollbackResults: Array<{ id: string; type: string; outcome: string; error?: string }> = [];
  for (const task of rollbackPending) {
    try {
      const r = await processRollback(task);
      if (r.outcome === "SUCCESS") summary.success++;
      else if (r.outcome === "FAILED") summary.failed++;
      else summary.blocked++;
      rollbackResults.push({ id: task.id, type: task.type, outcome: `ROLLBACK_${r.outcome}`, error: r.error });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.failed++;
      rollbackResults.push({ id: task.id, type: task.type, outcome: "ROLLBACK_FAILED", error: msg });
    }
  }
  summary.picked += rollbackPending.length;
  results.push(...rollbackResults);

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
