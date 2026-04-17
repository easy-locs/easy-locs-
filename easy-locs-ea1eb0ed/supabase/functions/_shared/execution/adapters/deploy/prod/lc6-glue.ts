/**
 * LC6 (#877) glue between the deploy.prod adapter, the post-deploy
 * health check, the revert_pr rollback strategy, and the
 * `system.request_rollback` RPC.
 *
 * Three injectable factories live here so the bootstrap can stay short
 * and the integration tests can swap any one of them out:
 *
 *   1. `createSupabaseRollbackDispatcher` — calls `system.request_rollback`
 *      via the supplied SupabaseClient. Fail-loud: any RPC error throws so
 *      the post-deploy hook records `post_deploy_hook_threw` instead of
 *      silently masking the failure.
 *
 *   2. `createRevertPrRollbackHandler` — adapts `executeRevertPr` to the
 *      orchestrator's RollbackHandler signature. Reads the merged-PR
 *      commit SHA from `task.payload.gitRef` (preferred) or the recorded
 *      forward output (`execution_result.output.gitRef`).
 *
 *   3. `createPostDeployHook` — composes `runPostDeployHealthCheck` +
 *      `maybeAutoRollbackAfterDeploy` into the
 *      `DeployProdPostDeployHook` shape consumed by the adapter.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";

import {
  runPostDeployHealthCheck,
  type HealthCheckOptions,
  type HealthCheckResult,
  type RollbackDispatcher,
} from "../../../post-deploy/health-check.ts";
import {
  executeRevertPr,
  REVERT_PR_STRATEGY_SLUG,
  type GithubRevertClient,
  type RevertPrInvocation,
} from "../../../rollback/revert-pr.ts";
import type {
  RollbackHandler,
  RollbackResult,
} from "../../../types.ts";
import type {
  DeployProdPostDeployArgs,
  DeployProdPostDeployHook,
  DeployProdPostDeployResult,
} from "./deploy-prod-adapter.ts";

// ── 1. Supabase child-row dispatcher ───────────────────────────────────
//
// LC6 lifecycle model (#877): the auto-rollback is recorded as a NEW
// `system.execution_tasks` row linked to the failed deploy via
// `parent_task_id`, instead of transitioning the original row
// in-place. The new row carries its own lifecycle and audit
// (status dispatch/running/succeeded/failed, attempt_count,
// error_code, execution_result) and is picked up by the
// `deploy.prod.rollback` adapter on the next execution-loop tick.
//
// The L3 in-place `system.request_rollback` RPC remains available for
// manual / human-initiated rollbacks; LC6 auto-rollback does not use
// it (L3's status guard refuses `rolling_back` from most states
// anyway).

import { DEPLOY_DOMAIN, DEPLOY_TASK_TYPES } from "../types.ts";

export interface SupabaseDispatcherOpts {
  /** Override the task type for the new child row (default DEPLOY_PROD_ROLLBACK). */
  childTaskType?: string;
  /** Override the domain for the new child row (default "deploy"). */
  childDomain?: string;
  /** Override the initial status of the child row (default "queued"). */
  initialStatus?: string;
  /** Risk level stamped on the child row (default "MEDIUM"). */
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  /** Approver stamp for the child row (default "system-lc6-auto"). */
  approvedBy?: string;
}

export function createSupabaseRollbackDispatcher(
  sb: SupabaseClient,
  opts: SupabaseDispatcherOpts = {},
): RollbackDispatcher {
  const taskType = opts.childTaskType ?? DEPLOY_TASK_TYPES.PROD_ROLLBACK;
  const domain = opts.childDomain ?? DEPLOY_DOMAIN;
  const initialStatus = opts.initialStatus ?? "queued";
  const riskLevel = opts.riskLevel ?? "MEDIUM";
  const approvedBy = opts.approvedBy ?? "system-lc6-auto";
  return {
    async requestRollback(args) {
      const childPayload = {
        ...(args.childPayload ?? {}),
        parent_task_id: args.taskId,
        reason: args.reason,
      };
      const childMetadata = {
        ...(args.metadata ?? {}),
        rollback_strategy_name: args.strategySlug,
        triggered_by: "lc6_auto_rollback",
        parent_task_id: args.taskId,
      };
      const { data, error } = await sb
        .schema("system")
        .from("execution_tasks")
        .insert({
          domain,
          type: taskType,
          status: initialStatus,
          risk_level: riskLevel,
          approved_by: approvedBy,
          parent_task_id: args.taskId,
          rollback_strategy: "none", // the rollback task itself is not rolled back
          payload: childPayload,
          metadata: childMetadata,
          rollback_reason: args.reason,
        })
        .select("id")
        .single();
      if (error) {
        throw new Error(
          `[lc6] failed to insert child rollback row for task ${args.taskId} ` +
            `(strategy=${args.strategySlug}): ${error.message}`,
        );
      }
      const row = (data as { id?: string } | null) ?? null;
      return { rollbackTaskId: row?.id ?? null };
    },
  };
}

// ── 2. revert_pr → RollbackHandler adapter ─────────────────────────────

export interface RevertPrHandlerDeps {
  client: GithubRevertClient;
  /** GitHub repo, e.g. "acme/easylocs". */
  repo: string;
  /** Branch the production deploy ran from (typically "main"). */
  branch: string;
}

function readGitRef(
  payload: Record<string, unknown> | null | undefined,
): string | null {
  if (!payload || typeof payload !== "object") return null;
  const direct = (payload as { gitRef?: unknown }).gitRef;
  if (typeof direct === "string" && direct.length >= 7) return direct;
  const nested = (payload as { output?: unknown }).output;
  if (nested && typeof nested === "object") {
    const inner = (nested as { gitRef?: unknown }).gitRef;
    if (typeof inner === "string" && inner.length >= 7) return inner;
  }
  return null;
}

export function createRevertPrRollbackHandler(
  deps: RevertPrHandlerDeps,
): RollbackHandler {
  return async (ctx, invocation): Promise<RollbackResult> => {
    const fromPayload = readGitRef(ctx.task.payload);
    const fromOutput =
      readGitRef(ctx.task.execution_result) ??
      readGitRef(invocation.output as Record<string, unknown> | null);
    const commitSha = fromPayload ?? fromOutput;
    if (!commitSha) {
      return {
        success: false,
        errorCode: "REVERT_PR_INVALID_INVOCATION",
        errorMessage:
          "revert_pr handler: cannot resolve commit SHA from task.payload.gitRef " +
          "nor execution_result.output.gitRef",
        logs: [],
      };
    }

    const inv: RevertPrInvocation = {
      repo: deps.repo,
      branch: deps.branch,
      commitSha,
      reason: invocation.failureReason || ctx.task.rollback_reason ||
        `auto-rollback (trigger=${invocation.trigger})`,
      correlationId: ctx.task.id,
    };
    const outcome = await executeRevertPr(deps.client, inv);
    return {
      success: outcome.success,
      errorCode: outcome.errorCode,
      errorMessage: outcome.message,
      output: {
        strategy: REVERT_PR_STRATEGY_SLUG,
        revert_commit_sha: outcome.revertCommitSha,
        already_reverted: outcome.alreadyReverted,
        ...(outcome.details ?? {}),
      },
      logs: [outcome.message],
    };
  };
}

// ── 3. Post-deploy hook factory ────────────────────────────────────────
//
// LC6 lifecycle constraint
// ────────────────────────
// `system.request_rollback` (L3 RPC) only accepts tasks in status
// `failed | succeeded`. The post-deploy hook runs INSIDE the adapter
// `execute()` while the row is still `running`, so the hook MUST NOT
// dispatch the rollback itself — doing so would deadlock against the
// L3 source-status guard.
//
// Instead, the hook runs the health check, returns `{ healthy, ... }`
// to the adapter (so the adapter settles the task `failed` with
// `DEPLOY_HEALTH_CHECK_FAILED`), and the caller (execution-loop or any
// post-settlement reconciler) calls `dispatchAutoRollbackForSettledTask`
// AFTER the orchestrator has transitioned the row.
//
// LC6 lifecycle (see §1 above): the post-settlement reconciler
// INSERTS a new child `system.execution_tasks` row (parent_task_id →
// failed deploy.prod) of type `deploy.prod.rollback`. That child is
// the unit that runs `revert_pr`, carries its own lifecycle/audit,
// and is ratified by `createDeployProdRollbackVerifier`. The L3
// transition-in-place RPC remains available for MANUAL rollbacks
// but is NOT used by LC6 auto-rollback.

export interface PostDeployHookDeps {
  /** Health-check overrides; `url` is filled from the deploy result. */
  health?: Omit<HealthCheckOptions, "url">;
}

export function createPostDeployHook(
  deps: PostDeployHookDeps = {},
): DeployProdPostDeployHook {
  return async (args): Promise<DeployProdPostDeployResult> => {
    if (!args.url || typeof args.url !== "string" || args.url.length === 0) {
      // No URL → cannot probe. Fail-loud configuration error.
      return {
        healthy: false,
        reason: "deploy_url_missing",
        rollbackDispatched: false,
        details: { taskId: args.taskId, deploymentId: args.deploymentId },
      };
    }
    const result = await runPostDeployHealthCheck({
      ...(deps.health ?? {}),
      url: args.url,
    });
    return {
      healthy: result.healthy,
      reason: result.healthy ? undefined : result.exitReason,
      // The hook NEVER dispatches the rollback itself — see lifecycle
      // note above. The post-settlement reconciler does that.
      rollbackDispatched: false,
      details: {
        consecutive_failures: result.consecutiveFailures,
        samples: result.samples.length,
        exit_reason: result.exitReason,
        duration_ms: result.durationMs,
      },
    };
  };
}

// ── 4. Post-settlement auto-rollback dispatcher ────────────────────────
//
// Invoked AFTER `orchestrator.run()` returns and the task row is in
// status `failed`. Inspects the settled row, decides whether
// auto-rollback applies (failed with HEALTH_CHECK_FAILED, allowlisted
// strategy in metadata), and calls `system.request_rollback` via the
// supplied dispatcher. Returns a structured outcome the caller can log.

export interface SettledTaskView {
  id: string;
  status: string;
  error_code: string | null;
  rollback_strategy: "auto" | "manual" | "none";
  /** Mirrors `task.metadata` written by the bootstrap into the agent. */
  metadata?: Record<string, unknown> | null;
  /** Task payload (input). Used to extract the deployed gitRef. */
  payload?: Record<string, unknown> | null;
  /** Adapter-recorded output (used to surface deploymentId in logs). */
  execution_result?: Record<string, unknown> | null;
}

export interface AutoRollbackDecision {
  triggered: boolean;
  skippedReason: string | null;
  rollbackTaskId: string | null;
  strategySlug: string | null;
}

export interface DeployContext {
  /** GitHub repo to revert in, e.g. "acme/easylocs". */
  repo: string;
  /** Branch the production deploy ran from (typically "main"). */
  branch: string;
}

export interface DispatchAutoRollbackOpts {
  task: SettledTaskView;
  dispatcher: RollbackDispatcher;
  /** Default: ["revert_pr"]. */
  allowedStrategies?: string[];
  /** Default: ["DEPLOY_HEALTH_CHECK_FAILED"]. */
  triggerErrorCodes?: string[];
  /** Override the audit reason; defaults to a generated string. */
  reason?: string;
  /**
   * Repo + branch to include in the child rollback row's payload so the
   * `deploy.prod.rollback` adapter can invoke `executeRevertPr` without
   * further env lookups. Optional: when absent, the adapter falls back
   * to env, but populating this at dispatch time makes the row fully
   * self-describing for audit.
   */
  deployContext?: DeployContext;
  /**
   * Override the strategy name lookup. Defaults to the adapter
   * convention: `agent.metadata.rollback_strategy_name` is mirrored into
   * `task.metadata.rollback_strategy_name` by the orchestrator at
   * dispatch time. Tests can pass an explicit slug instead.
   */
  strategySlug?: string;
}

function readStrategySlug(
  metadata: Record<string, unknown> | null | undefined,
  override?: string,
): string | null {
  if (override) return override;
  if (!metadata) return null;
  const v = (metadata as { rollback_strategy_name?: unknown }).rollback_strategy_name;
  return typeof v === "string" && v.length > 0 ? v : null;
}

export async function dispatchAutoRollbackForSettledTask(
  opts: DispatchAutoRollbackOpts,
): Promise<AutoRollbackDecision> {
  const allowed = new Set(opts.allowedStrategies ?? [REVERT_PR_STRATEGY_SLUG]);
  const triggerCodes = new Set(opts.triggerErrorCodes ?? ["DEPLOY_HEALTH_CHECK_FAILED"]);
  const t = opts.task;

  if (t.status !== "failed" && t.status !== "succeeded") {
    return {
      triggered: false,
      skippedReason: `status_not_settled:${t.status}`,
      rollbackTaskId: null,
      strategySlug: null,
    };
  }
  if (!t.error_code || !triggerCodes.has(t.error_code)) {
    return {
      triggered: false,
      skippedReason: `error_code_not_eligible:${t.error_code ?? "null"}`,
      rollbackTaskId: null,
      strategySlug: null,
    };
  }
  if (t.rollback_strategy === "none") {
    return {
      triggered: false,
      skippedReason: "rollback_strategy=none",
      rollbackTaskId: null,
      strategySlug: null,
    };
  }
  const slug = readStrategySlug(t.metadata, opts.strategySlug);
  if (!slug || !allowed.has(slug)) {
    return {
      triggered: false,
      skippedReason: `strategy_not_allowed:${slug ?? "null"}`,
      rollbackTaskId: null,
      strategySlug: slug,
    };
  }

  const reason = opts.reason ??
    `LC6 auto-rollback after settled ${t.status}/${t.error_code} (strategy=${slug})`;
  const deployedSha = readGitRef(t.payload) ?? readGitRef(t.execution_result);
  const childPayload: Record<string, unknown> = {
    commitSha: deployedSha,
    reason,
    trigger: "lc6_auto_rollback",
  };
  if (opts.deployContext) {
    childPayload.repo = opts.deployContext.repo;
    childPayload.branch = opts.deployContext.branch;
  }
  const dispatch = await opts.dispatcher.requestRollback({
    taskId: t.id,
    reason,
    strategySlug: slug,
    metadata: t.metadata ?? {},
    childPayload,
  });
  return {
    triggered: true,
    skippedReason: null,
    rollbackTaskId: dispatch.rollbackTaskId,
    strategySlug: slug,
  };
}

// ── 5. Runtime helper: run + auto-rollback reconcile ───────────────────
//
// Wraps `orchestrator.run(taskId)` with the post-settlement dispatch so
// the execution-loop (and integration tests) have a single entry-point
// for the full LC6 flow:
//
//   1) orchestrator.run(taskId)     ← drives adapter, settles row
//   2) fetchSettled(taskId)         ← reads the now-settled row
//   3) dispatchAutoRollbackForSettledTask(...)  ← conditionally fires
//
// The reconcile step is internally gated (status ∈ {failed, succeeded},
// error_code in trigger allowlist, strategy in allowlist), so it is
// always safe to call regardless of domain/task-type.

export interface RunOutcomeLike {
  finalStatus: string;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface RunAndReconcileOpts {
  orchestrator: { run: (taskId: string) => Promise<RunOutcomeLike> };
  taskId: string;
  /** Reads the settled row (same shape as SettledTaskView). */
  fetchSettled: (taskId: string) => Promise<SettledTaskView | null>;
  dispatcher: RollbackDispatcher;
  allowedStrategies?: string[];
  triggerErrorCodes?: string[];
  /** Propagated to `dispatchAutoRollbackForSettledTask`. */
  deployContext?: DeployContext;
}

export interface RunAndReconcileResult {
  outcome: RunOutcomeLike;
  autoRollback: AutoRollbackDecision | null;
}

export async function runAndReconcileDeployProdTask(
  opts: RunAndReconcileOpts,
): Promise<RunAndReconcileResult> {
  const outcome = await opts.orchestrator.run(opts.taskId);
  let autoRollback: AutoRollbackDecision | null = null;
  if (outcome.finalStatus === "failed" || outcome.finalStatus === "succeeded") {
    const settled = await opts.fetchSettled(opts.taskId);
    if (settled) {
      autoRollback = await dispatchAutoRollbackForSettledTask({
        task: settled,
        dispatcher: opts.dispatcher,
        allowedStrategies: opts.allowedStrategies,
        triggerErrorCodes: opts.triggerErrorCodes,
        deployContext: opts.deployContext,
      });
    }
  }
  return { outcome, autoRollback };
}

/**
 * Supabase-backed `fetchSettled` helper. Reads the settled row from
 * `system.execution_tasks` and shapes it into SettledTaskView. The
 * orchestrator mirrors `agent.metadata.rollback_strategy_name` into the
 * task `metadata` JSON at dispatch time (see orchestrator-v2), so
 * `metadata.rollback_strategy_name` is the authoritative source for
 * the allowlist gate.
 */
export function createSupabaseSettledFetcher(
  sb: SupabaseClient,
): (taskId: string) => Promise<SettledTaskView | null> {
  return async (taskId) => {
    const { data, error } = await sb
      .schema("system")
      .from("execution_tasks")
      .select("id,status,error_code,rollback_strategy,metadata,payload,execution_result")
      .eq("id", taskId)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as Record<string, unknown>;
    return {
      id: String(row.id),
      status: String(row.status),
      error_code: (row.error_code as string | null) ?? null,
      rollback_strategy: (row.rollback_strategy as SettledTaskView["rollback_strategy"]) ?? "none",
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      payload: (row.payload as Record<string, unknown> | null) ?? null,
      execution_result: (row.execution_result as Record<string, unknown> | null) ?? null,
    };
  };
}

// Re-export for convenience so callers don't need the deeper import.
export type { HealthCheckResult, RollbackDispatcher };
