/**
 * LC6 — dev-verifier + revert_pr rollback · integration tests (task #877).
 *
 * Three scenarios pin the LC6 contract end-to-end:
 *
 *   (a) A code.edit task whose adapter reports a build with exitCode != 0
 *       is rejected by `dev-verifier`; the orchestrator transitions the
 *       row to `failed` with `error_code = VERIFICATION_MISMATCH`.
 *   (b) A code.edit task with passing build/test/typecheck is ratified
 *       and settles `succeeded`.
 *   (c) A simulated `deploy.prod` with a permanently unhealthy /api/health
 *       triggers `revert_pr` via the auto-rollback hook; the rollback
 *       dispatcher is called with the registered strategy slug AND the
 *       in-process GitHub client receives a createRevertCommit call with
 *       the deployed commit SHA.
 *
 * Pure in-memory: no DB, no real fetch, no real GitHub. Stubs are wired
 * to exercise the same code paths the production bootstraps will use.
 */

import { describe, expect, it } from "vitest";

import { ExecutionOrchestratorV2 } from "../../supabase/functions/_shared/execution/orchestrator-v2.ts";
import { AdapterRegistry } from "../../supabase/functions/_shared/execution/adapter-registry.ts";
import { VerifierRegistry } from "../../supabase/functions/_shared/execution/verifier-registry.ts";
import { TaskVerificationService } from "../../supabase/functions/_shared/execution/verification-service.ts";
import { MemoryLockService } from "../../supabase/functions/_shared/execution/lock-service.ts";
import { MemoryIdempotencyService } from "../../supabase/functions/_shared/execution/idempotency-service.ts";
import { InMemoryEventSink } from "../../supabase/functions/_shared/execution/canonical-events.ts";
import {
  MemoryTaskRepository,
  makeTask,
} from "../../supabase/functions/_shared/execution/__test-helpers__.ts";
import type {
  AdapterResult,
  DomainAdapter,
  ExecutionContext,
} from "../../supabase/functions/_shared/execution/types.ts";

import {
  createDevVerifier,
  evaluateDevSignals,
  DEV_VERIFIER_DOMAIN,
} from "../../supabase/functions/_shared/execution/verifiers/dev-verifier.ts";
import {
  executeRevertPr,
  REVERT_PR_STRATEGY_SLUG,
  REVERT_PR_ERROR_CODES,
  type GithubRevertClient,
} from "../../supabase/functions/_shared/execution/rollback/revert-pr.ts";
import {
  maybeAutoRollbackAfterDeploy,
  runPostDeployHealthCheck,
  type RollbackDispatcher,
} from "../../supabase/functions/_shared/execution/post-deploy/health-check.ts";

const CODE_EDIT_TASK_TYPE = "CODE_EDIT";

// ── Test stack helpers ───────────────────────────────────────────────────
function makeStack() {
  const tasks = new MemoryTaskRepository();
  const adapters = new AdapterRegistry();
  const verifiers = new VerifierRegistry();
  const sink = new InMemoryEventSink();
  const orchestrator = new ExecutionOrchestratorV2({
    registry: adapters,
    repository: tasks,
    locks: new MemoryLockService(),
    idempotency: new MemoryIdempotencyService(),
    validator: { async validate() { return { ok: true }; } },
    sink,
    ownerId: "test-runner",
    lockTtlSeconds: 30,
    verification: new TaskVerificationService(verifiers),
  });
  return { tasks, adapters, verifiers, sink, orchestrator };
}

/** Minimal in-test code.edit adapter — drives the dev-verifier path. */
function createCodeEditStubAdapter(opts: {
  buildExitCode: number;
  testFailed: number;
  typecheckErrors: number;
}): DomainAdapter {
  return {
    domain: DEV_VERIFIER_DOMAIN,
    taskType: CODE_EDIT_TASK_TYPE,
    rollback_strategy: "none",
    agent: {
      slug: "code.edit.stub",
      version: "0.0.1",
      kind: "code.tool",
      displayName: "Code-edit stub (LC6 test)",
      ownerTeam: "platform-dev",
      policyProfile: "dev-default",
    },
    async execute(ctx: ExecutionContext): Promise<AdapterResult> {
      return {
        success: true,
        output: {
          status: "succeeded",
          task_id: ctx.task.id,
          dev_verification: {
            build: {
              status: opts.buildExitCode === 0 ? "succeeded" : "failed",
              exitCode: opts.buildExitCode,
            },
            test: {
              status: opts.testFailed === 0 ? "succeeded" : "failed",
              passed: 10,
              failed: opts.testFailed,
            },
            typecheck: {
              status: opts.typecheckErrors === 0 ? "succeeded" : "failed",
              errors: opts.typecheckErrors,
            },
          },
        },
      };
    },
  };
}

// ── (a) Build failure → dev-verifier rejects → task `failed` ─────────────
describe("LC6 — dev-verifier rejects code.edit when build fails", () => {
  it("transitions the execution_task to failed with VERIFICATION_MISMATCH", async () => {
    const stack = makeStack();
    stack.verifiers.register(createDevVerifier({ taskType: CODE_EDIT_TASK_TYPE }));
    stack.adapters.register(createCodeEditStubAdapter({
      buildExitCode: 1,
      testFailed: 0,
      typecheckErrors: 0,
    }));

    const task = makeTask({
      id: "task-code-build-fail",
      type: CODE_EDIT_TASK_TYPE,
      domain: DEV_VERIFIER_DOMAIN,
      status: "queued",
      requires_approval: false,
      payload: { unified_diff: "--- a/x\n+++ b/x\n" },
      entity_type: null,
      entity_id: null,
    });
    stack.tasks.upsert(task);

    const outcome = await stack.orchestrator.run(task.id);
    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.errorCode).toBe("VERIFICATION_MISMATCH");

    const row = stack.tasks.snapshot(task.id)!;
    expect(row.status).toBe("failed");
    const result = row.execution_result as Record<string, unknown>;
    const verification = result.verification as Record<string, unknown>;
    expect(verification.error_code).toBe("VERIFICATION_MISMATCH");
    expect(verification.mismatch_path).toBe("build");
  });

  it("ratifies a code.edit when build / test / typecheck are all green", async () => {
    const stack = makeStack();
    stack.verifiers.register(createDevVerifier({ taskType: CODE_EDIT_TASK_TYPE }));
    stack.adapters.register(createCodeEditStubAdapter({
      buildExitCode: 0,
      testFailed: 0,
      typecheckErrors: 0,
    }));

    const task = makeTask({
      id: "task-code-green",
      type: CODE_EDIT_TASK_TYPE,
      domain: DEV_VERIFIER_DOMAIN,
      status: "queued",
      requires_approval: false,
      payload: {},
      entity_type: null,
      entity_id: null,
    });
    stack.tasks.upsert(task);

    const outcome = await stack.orchestrator.run(task.id);
    expect(outcome.finalStatus).toBe("succeeded");
    const row = stack.tasks.snapshot(task.id)!;
    const verification = (row.execution_result as Record<string, unknown>).verification as Record<string, unknown>;
    expect(verification.ok).toBe(true);
  });

  it("rejects on test failures and on typecheck errors equally", () => {
    const testFail = evaluateDevSignals({
      build: { status: "succeeded", exitCode: 0 },
      test: { status: "failed", failed: 2 },
      typecheck: { status: "succeeded", errors: 0 },
    });
    expect(testFail.ok).toBe(false);
    if (!testFail.ok) expect(testFail.mismatchPath).toBe("test");

    const tcFail = evaluateDevSignals({
      build: { status: "succeeded", exitCode: 0 },
      test: { status: "succeeded", failed: 0 },
      typecheck: { status: "failed", errors: 7 },
    });
    expect(tcFail.ok).toBe(false);
    if (!tcFail.ok) expect(tcFail.mismatchPath).toBe("typecheck");

    const allGreen = evaluateDevSignals({
      build: { status: "succeeded", exitCode: 0 },
      test: { status: "succeeded", failed: 0 },
      typecheck: { status: "succeeded", errors: 0 },
    });
    expect(allGreen.ok).toBe(true);
  });
});

// ── (b) revert_pr strategy unit ──────────────────────────────────────────
function makeFakeGithub(): GithubRevertClient & {
  calls: { op: string; args: unknown }[];
} {
  const calls: { op: string; args: unknown }[] = [];
  const client: GithubRevertClient = {
    async getCommit({ repo, sha }) {
      calls.push({ op: "getCommit", args: { repo, sha } });
      if (sha === "missing-sha") return null;
      return { sha, message: "feat: do thing", parents: ["parent-sha"] };
    },
    async listRecentCommits({ repo, branch }) {
      calls.push({ op: "listRecentCommits", args: { repo, branch } });
      return [];
    },
    async createRevertCommit({ repo, branch, commitSha, message }) {
      calls.push({ op: "createRevertCommit", args: { repo, branch, commitSha, message } });
      return { sha: `revert-of-${commitSha.slice(0, 7)}` };
    },
  };
  return Object.assign(client, { calls });
}

describe("LC6 — revert_pr strategy", () => {
  it("creates a new revert commit when no prior revert exists", async () => {
    const gh = makeFakeGithub();
    const out = await executeRevertPr(gh, {
      repo: "acme/easylocs",
      branch: "main",
      commitSha: "deadbeefcafebabe",
      prNumber: 4242,
      reason: "post-deploy health check failed",
      correlationId: "task-deploy-prod-1",
    });
    expect(out.success).toBe(true);
    expect(out.alreadyReverted).toBe(false);
    expect(out.revertCommitSha).toBe("revert-of-deadbee");
    const created = gh.calls.find((c) => c.op === "createRevertCommit");
    expect(created).toBeTruthy();
    const args = created!.args as { message: string; commitSha: string };
    expect(args.commitSha).toBe("deadbeefcafebabe");
    expect(args.message).toContain("Marker: lc6-revert-pr:deadbeefcafebabe");
  });

  it("is idempotent — short-circuits when a marker is found in recent history", async () => {
    const gh = makeFakeGithub();
    gh.listRecentCommits = async () => [
      { sha: "prior-revert-sha", message: "Revert #4242 via lc6-revert-pr\n\nMarker: lc6-revert-pr:deadbeefcafebabe" },
    ];
    const out = await executeRevertPr(gh, {
      repo: "acme/easylocs",
      branch: "main",
      commitSha: "deadbeefcafebabe",
      reason: "rerun",
    });
    expect(out.success).toBe(true);
    expect(out.alreadyReverted).toBe(true);
    expect(out.revertCommitSha).toBe("prior-revert-sha");
    expect(gh.calls.find((c) => c.op === "createRevertCommit")).toBeUndefined();
  });

  it("fails loudly when the commit is not found", async () => {
    const gh = makeFakeGithub();
    const out = await executeRevertPr(gh, {
      repo: "acme/easylocs",
      branch: "main",
      commitSha: "missing-sha",
      reason: "n/a",
    });
    expect(out.success).toBe(false);
    expect(out.errorCode).toBe(REVERT_PR_ERROR_CODES.COMMIT_NOT_FOUND);
  });

  it("rejects an invocation missing required fields", async () => {
    const gh = makeFakeGithub();
    const out = await executeRevertPr(gh, {
      repo: "no-slash",
      branch: "main",
      commitSha: "abcdefg",
      reason: "x",
    });
    expect(out.success).toBe(false);
    expect(out.errorCode).toBe(REVERT_PR_ERROR_CODES.INVALID_INVOCATION);
  });
});

// ── (c) Health check → auto-rollback dispatch ─────────────────────────────
describe("LC6 — post-deploy health check + auto-rollback", () => {
  it("returns healthy as soon as a 200 sample arrives", async () => {
    let calls = 0;
    const r = await runPostDeployHealthCheck({
      url: "https://app.example.com",
      windowMs: 60_000,
      intervalMs: 100,
      failureThreshold: 3,
      sleep: () => Promise.resolve(),
      now: (() => {
        let t = 0;
        return () => (t += 1);
      })(),
      fetcher: async () => {
        calls++;
        return { ok: true, status: 200, bodyText: '{"status":"ok"}' };
      },
    });
    expect(r.healthy).toBe(true);
    expect(r.exitReason).toBe("ok");
    expect(calls).toBe(1);
  });

  it("declares unhealthy after `failureThreshold` consecutive failures", async () => {
    const r = await runPostDeployHealthCheck({
      url: "https://app.example.com",
      windowMs: 5 * 60_000,
      intervalMs: 1_000,
      failureThreshold: 3,
      sleep: () => Promise.resolve(),
      now: (() => { let t = 0; return () => (t += 1); })(),
      fetcher: async () => ({ ok: false, status: 503, bodyText: "" }),
    });
    expect(r.healthy).toBe(false);
    expect(r.exitReason).toBe("threshold_exceeded");
    expect(r.consecutiveFailures).toBe(3);
    expect(r.samples.length).toBe(3);
    expect(r.samples[0].reason).toContain("http_status=503");
  });

  it("triggers revert_pr via the dispatcher when deploy.prod opted in", async () => {
    const dispatched: Array<{ taskId: string; strategySlug: string; reason: string }> = [];
    const dispatcher: RollbackDispatcher = {
      async requestRollback({ taskId, reason, strategySlug }) {
        dispatched.push({ taskId, strategySlug, reason });
        return { rollbackTaskId: `rollback-of-${taskId}` };
      },
    };

    const outcome = await maybeAutoRollbackAfterDeploy({
      ctx: {
        taskId: "task-deploy-prod-1",
        rollbackStrategy: "auto",
        rollbackStrategyName: REVERT_PR_STRATEGY_SLUG,
        metadata: {
          repo: "acme/easylocs",
          branch: "main",
          commitSha: "deadbeefcafebabe",
        },
      },
      health: {
        url: "https://app.example.com",
        windowMs: 5 * 60_000,
        intervalMs: 1_000,
        failureThreshold: 2,
        sleep: () => Promise.resolve(),
        now: (() => { let t = 0; return () => (t += 1); })(),
        fetcher: async () => ({ ok: false, status: 502, bodyText: "" }),
      },
      dispatcher,
    });

    expect(outcome.triggered).toBe(true);
    expect(outcome.rollbackTaskId).toBe("rollback-of-task-deploy-prod-1");
    expect(outcome.health.healthy).toBe(false);
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].strategySlug).toBe("revert_pr");
    expect(dispatched[0].taskId).toBe("task-deploy-prod-1");
    expect(dispatched[0].reason).toMatch(/post-deploy health check/);
  });

  it("does NOT trigger rollback when the strategy is not allowlisted", async () => {
    const dispatched: unknown[] = [];
    const outcome = await maybeAutoRollbackAfterDeploy({
      ctx: {
        taskId: "task-deploy-prod-2",
        rollbackStrategy: "auto",
        rollbackStrategyName: "danger.force_push",
        metadata: {},
      },
      health: {
        url: "https://app.example.com",
        windowMs: 1_000,
        intervalMs: 100,
        failureThreshold: 1,
        sleep: () => Promise.resolve(),
        now: (() => { let t = 0; return () => (t += 1); })(),
        fetcher: async () => ({ ok: false, status: 500, bodyText: "" }),
      },
      dispatcher: {
        async requestRollback(args) {
          dispatched.push(args);
          return { rollbackTaskId: "should-not-happen" };
        },
      },
    });
    expect(outcome.triggered).toBe(false);
    expect(outcome.skippedReason).toBe("strategy_not_allowed:danger.force_push");
    expect(dispatched).toHaveLength(0);
  });

  it("does NOT trigger rollback when health is OK", async () => {
    const dispatched: unknown[] = [];
    const outcome = await maybeAutoRollbackAfterDeploy({
      ctx: {
        taskId: "task-deploy-prod-3",
        rollbackStrategy: "auto",
        rollbackStrategyName: "revert_pr",
        metadata: {},
      },
      health: {
        url: "https://app.example.com",
        windowMs: 5 * 60_000,
        intervalMs: 100,
        failureThreshold: 3,
        sleep: () => Promise.resolve(),
        now: (() => { let t = 0; return () => (t += 1); })(),
        fetcher: async () => ({ ok: true, status: 200, bodyText: '{"status":"ok"}' }),
      },
      dispatcher: {
        async requestRollback() { return { rollbackTaskId: null }; },
      },
    });
    expect(outcome.triggered).toBe(false);
    expect(outcome.skippedReason).toBe("healthy");
    expect(dispatched).toHaveLength(0);
  });
});

// ── (d) End-to-end: revert_pr drives a real rollback through the GitHub stub
describe("LC6 — revert_pr end-to-end via the dispatcher", () => {
  it("dispatcher → revert_pr → GitHub createRevertCommit invoked once", async () => {
    const gh = makeFakeGithub();
    const dispatcher: RollbackDispatcher = {
      async requestRollback({ taskId, reason, strategySlug, metadata }) {
        // The real dispatcher calls system.request_rollback → orchestrator
        // runs the rollback. Here we collapse that into an inline call to
        // the strategy implementation so the test stays in-process.
        expect(strategySlug).toBe("revert_pr");
        const md = metadata as Record<string, unknown>;
        const out = await executeRevertPr(gh, {
          repo: md.repo as string,
          branch: md.branch as string,
          commitSha: md.commitSha as string,
          reason,
          correlationId: taskId,
        });
        expect(out.success).toBe(true);
        return { rollbackTaskId: `rollback-${taskId}` };
      },
    };

    const outcome = await maybeAutoRollbackAfterDeploy({
      ctx: {
        taskId: "task-deploy-prod-e2e",
        rollbackStrategy: "auto",
        rollbackStrategyName: "revert_pr",
        metadata: {
          repo: "acme/easylocs",
          branch: "main",
          commitSha: "deadbeefcafebabe",
        },
      },
      health: {
        url: "https://app.example.com",
        windowMs: 5_000,
        intervalMs: 500,
        failureThreshold: 2,
        sleep: () => Promise.resolve(),
        now: (() => { let t = 0; return () => (t += 1); })(),
        fetcher: async () => ({ ok: false, status: 502, bodyText: "" }),
      },
      dispatcher,
    });

    expect(outcome.triggered).toBe(true);
    const created = gh.calls.find((c) => c.op === "createRevertCommit");
    expect(created).toBeTruthy();
    const args = created!.args as { commitSha: string };
    expect(args.commitSha).toBe("deadbeefcafebabe");
  });
});
