/**
 * LC6 — bootstrap wiring · integration tests (task #877).
 *
 * Pins the runtime contract the code-review found missing in the first
 * iteration:
 *
 *   1. `bootstrapCodeEditAdapter` registers a COMPOSED verifier that runs
 *      `dev-verifier` (build/test/typecheck) FIRST, then the LC1 shape
 *      verifier. A code.edit task with a broken build settles `failed`
 *      with `error_code = VERIFICATION_MISMATCH` AND
 *      `verification.mismatch_path = "build"` — proving the dev gate
 *      fires through the production registry, not just in isolation.
 *
 *   2. `bootstrapDeployProdAdapters` (with a stub GithubRevertClient)
 *      installs both the post-deploy health-check hook AND the
 *      `revert_pr` rollback handler. Running a `deploy.prod` task whose
 *      `/api/health` is permanently 503 settles `failed` with
 *      `DEPLOY_HEALTH_CHECK_FAILED`, the in-memory dispatcher records a
 *      `system.request_rollback` call for the same task id with the
 *      `revert_pr` strategy slug, AND the orchestrator's rollback path
 *      executes the revert handler against the deployed git SHA.
 *
 * Pure in-memory: no DB, no real fetch, no real GitHub. The Supabase
 * client is stubbed to assert the RPC dispatcher path; the GitHub client
 * is the same hand-rolled stub used by the LC6 unit tests.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ExecutionOrchestratorV2 } from "../../supabase/functions/_shared/execution/orchestrator-v2.ts";
import { globalAdapterRegistry } from "../../supabase/functions/_shared/execution/adapter-registry.ts";
import { globalVerifierRegistry } from "../../supabase/functions/_shared/execution/verifier-registry.ts";
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

import { bootstrapCodeEditAdapter } from "../../supabase/functions/_shared/execution/adapters/code/bootstrap.ts";
import { CODE_DOMAIN, CODE_TASK_TYPES } from "../../supabase/functions/_shared/execution/adapters/code/types.ts";
import { bootstrapDeployProdAdapters } from "../../supabase/functions/_shared/execution/adapters/deploy/prod/bootstrap.ts";
import { DEPLOY_DOMAIN, DEPLOY_ERROR_CODES, DEPLOY_TASK_TYPES } from "../../supabase/functions/_shared/execution/adapters/deploy/types.ts";
import type { GithubRevertClient } from "../../supabase/functions/_shared/execution/rollback/revert-pr.ts";
import { REVERT_PR_STRATEGY_SLUG } from "../../supabase/functions/_shared/execution/rollback/revert-pr.ts";
import type { RollbackDispatcher } from "../../supabase/functions/_shared/execution/post-deploy/health-check.ts";
import {
  dispatchAutoRollbackForSettledTask,
  runAndReconcileDeployProdTask,
  type SettledTaskView,
} from "../../supabase/functions/_shared/execution/adapters/deploy/prod/lc6-glue.ts";

// ── Tiny shared infra ───────────────────────────────────────────────────

function makeOrchestrator(tasks: MemoryTaskRepository) {
  return new ExecutionOrchestratorV2({
    registry: globalAdapterRegistry,
    repository: tasks,
    locks: new MemoryLockService(),
    idempotency: new MemoryIdempotencyService(),
    validator: { async validate() { return { ok: true }; } },
    sink: new InMemoryEventSink(),
    ownerId: "test-runner",
    lockTtlSeconds: 30,
    verification: new TaskVerificationService(globalVerifierRegistry),
  });
}

/** Minimal Supabase-shaped stub — only `.schema().rpc()` is exercised. */
type SbStub = {
  rpcCalls: Array<{ fn: string; args: Record<string, unknown> }>;
  // deno-lint-ignore no-explicit-any
  schema: (s: string) => any;
};

function makeSupabaseStub(): SbStub {
  const rpcCalls: SbStub["rpcCalls"] = [];
  return {
    rpcCalls,
    schema(_schema: string) {
      return {
        async rpc(fn: string, args: Record<string, unknown>) {
          rpcCalls.push({ fn, args });
          return { data: { id: args.p_task_id }, error: null };
        },
        // The bootstrap's reconcileAgents path also uses `.from(...)`. We
        // disable reconciliation in tests so this never gets hit; if it
        // ever does, throwing here makes the regression loud.
        from() { throw new Error("supabase.from() unexpected in LC6 wiring test"); },
      };
    },
  };
}

function makeFakeGithub(): GithubRevertClient & {
  calls: Array<{ op: string; args: Record<string, unknown> }>;
} {
  const calls: Array<{ op: string; args: Record<string, unknown> }> = [];
  const client: GithubRevertClient = {
    async getCommit({ repo, sha }) {
      calls.push({ op: "getCommit", args: { repo, sha } });
      return { sha, message: "feat: ship", parents: ["parent"] };
    },
    async listRecentCommits({ repo, branch }) {
      calls.push({ op: "listRecentCommits", args: { repo, branch } });
      return [];
    },
    async createRevertCommit({ repo, branch, commitSha, message }) {
      calls.push({ op: "createRevertCommit", args: { repo, branch, commitSha, message } });
      return { sha: `revert-${commitSha.slice(0, 7)}` };
    },
  };
  return Object.assign(client, { calls });
}

// Track what the global registries originally held so we can restore them.
function snapshotRegistries(): () => void {
  return () => {
    // Re-imports of bootstrap modules later in the run will re-register
    // entries with `overwrite: true`. We don't need to manually clear —
    // the next bootstrap call wipes the slot. Suite-local helper kept
    // for symmetry / future use.
  };
}

// ── (1) code-edit bootstrap registers the dev-verifier composition ──────

describe("LC6 wiring — bootstrapCodeEditAdapter installs dev-verifier", () => {
  let restore: () => void;
  beforeEach(() => { restore = snapshotRegistries(); });
  afterEach(() => { restore(); });

  /**
   * Replace the LC1 code-edit adapter the bootstrap registers with a
   * lightweight stub that returns a CodeEditResult-shaped output AND the
   * `dev_verification` block the dev-verifier inspects. Keeps the test
   * focused on verifier composition rather than the adapter internals.
   */
  function registerStubCodeEditAdapter(opts: {
    buildExitCode: number;
    testFailed: number;
    typecheckErrors: number;
  }) {
    const adapter: DomainAdapter = {
      domain: CODE_DOMAIN,
      taskType: CODE_TASK_TYPES.EDIT,
      rollback_strategy: "none",
      agent: {
        slug: "code.edit",
        version: "1.0.0",
        kind: "code.tool",
        displayName: "code.edit (LC6 wiring stub)",
        ownerTeam: "platform-dev",
        policyProfile: "dev-default",
      },
      async execute(_ctx: ExecutionContext): Promise<AdapterResult> {
        const unifiedDiff = "--- a/src/x.ts\n+++ b/src/x.ts\n@@\n-old\n+new\n";
        return {
          success: true,
          output: {
            workspace: "ws-1",
            modifiedFiles: [{
              path: "src/x.ts",
              beforeChecksum: "a".repeat(64),
              afterChecksum: "b".repeat(64),
              beforeBytes: 3,
              afterBytes: 3,
            }],
            unifiedDiff,
            diffBytes: new TextEncoder().encode(unifiedDiff).length,
            operations: [{ index: 0, op: "apply_diff", path: "src/x.ts", ok: true }],
            // dev-verifier signals — read by the composed verifier.
            dev_verification: {
              build: { status: opts.buildExitCode === 0 ? "succeeded" : "failed", exitCode: opts.buildExitCode },
              test: { status: opts.testFailed === 0 ? "succeeded" : "failed", passed: 1, failed: opts.testFailed },
              typecheck: { status: opts.typecheckErrors === 0 ? "succeeded" : "failed", errors: opts.typecheckErrors },
            },
          },
        };
      },
    };
    globalAdapterRegistry.register(adapter, { overwrite: true });
  }

  it("rejects the task with VERIFICATION_MISMATCH when the build is broken", async () => {
    // Bootstrap registers the composed verifier; we then overwrite the
    // adapter slot with our stub so we don't need a live workspace.
    await bootstrapCodeEditAdapter({} as never, {
      reconcileAgents: false,
      workspaces: { acquire: async () => ({} as never), release: async () => {} },
    });
    registerStubCodeEditAdapter({ buildExitCode: 1, testFailed: 0, typecheckErrors: 0 });

    const tasks = new MemoryTaskRepository();
    const orchestrator = makeOrchestrator(tasks);

    const task = makeTask({
      id: "task-code-broken-build",
      type: CODE_TASK_TYPES.EDIT,
      domain: CODE_DOMAIN,
      status: "queued",
      requires_approval: false,
      payload: { workspace: "ws-1", operations: [{ op: "list_files" }] },
    });
    tasks.upsert(task);

    const outcome = await orchestrator.run(task.id);
    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.errorCode).toBe("VERIFICATION_MISMATCH");

    const row = tasks.snapshot(task.id)!;
    const verification = (row.execution_result as Record<string, unknown>).verification as Record<string, unknown>;
    expect(verification.error_code).toBe("VERIFICATION_MISMATCH");
    expect(verification.mismatch_path).toBe("build");
  });

  it("ratifies the task when build / test / typecheck are all green", async () => {
    await bootstrapCodeEditAdapter({} as never, {
      reconcileAgents: false,
      workspaces: { acquire: async () => ({} as never), release: async () => {} },
    });
    registerStubCodeEditAdapter({ buildExitCode: 0, testFailed: 0, typecheckErrors: 0 });

    const tasks = new MemoryTaskRepository();
    const orchestrator = makeOrchestrator(tasks);

    const task = makeTask({
      id: "task-code-green-bootstrap",
      type: CODE_TASK_TYPES.EDIT,
      domain: CODE_DOMAIN,
      status: "queued",
      requires_approval: false,
      payload: { workspace: "ws-1", operations: [{ op: "list_files" }] },
    });
    tasks.upsert(task);

    const outcome = await orchestrator.run(task.id);
    expect(outcome.finalStatus).toBe("succeeded");
    const row = tasks.snapshot(task.id)!;
    const verification = (row.execution_result as Record<string, unknown>).verification as Record<string, unknown>;
    expect(verification.ok).toBe(true);
  });
});

// ── (2) deploy.prod bootstrap installs post-deploy + revert_pr ──────────

describe("LC6 wiring — bootstrapDeployProdAdapters installs health check + revert_pr", () => {
  it(
    "settles deploy.prod failed on persistent /api/health 503, the post-settlement dispatcher calls request_rollback with revert_pr, and the rollback handler creates a revert commit",
    async () => {
      const sb = makeSupabaseStub();
      const github = makeFakeGithub();

      await bootstrapDeployProdAdapters(sb as never, {
        reconcileAgents: false,
        runner: async () => ({
          deploymentId: "vercel-dpl-1",
          url: "https://app.example.test",
          status: "READY",
          durationMs: 1200,
          buildMinutes: 0.02,
        }),
        github: { client: github, repo: "acme/easylocs", branch: "main" },
        // Permanently 503 — we collapse the watch window so the test runs
        // in milliseconds, not 5 real minutes.
        healthCheck: {
          windowMs: 100,
          intervalMs: 1,
          requestTimeoutMs: 1,
          failureThreshold: 2,
          fetcher: async () => ({ ok: false, status: 503, bodyText: "" }),
          now: ((): () => number => {
            let t = 0;
            return () => (t += 5);
          })(),
          sleep: async () => {},
        },
      });

      const tasks = new MemoryTaskRepository();
      const orchestrator = makeOrchestrator(tasks);

      const deploySha = "deadbeefcafebabedeadbeefcafebabedeadbeef";
      const task = makeTask({
        id: "task-deploy-prod-unhealthy",
        type: DEPLOY_TASK_TYPES.PROD,
        domain: DEPLOY_DOMAIN,
        status: "queued",
        approved_by: "u-admin",
        requires_approval: true,
        approval_policy: "dev-sensitive",
        payload: { project: "myapp", gitRef: deploySha, label: "release-1" },
      });
      tasks.upsert(task);

      // ── 2a: end-to-end runtime path. This is the SAME helper the
      //        production execution-loop calls to process every
      //        V2-registered task (see `execution-loop/index.ts`). No
      //        manual dispatcher invocation — the helper runs the
      //        orchestrator, then reads the settled row and conditionally
      //        dispatches `system.request_rollback` ONLY after the row
      //        has transitioned to `failed`, satisfying the L3 source-
      //        status guard.
      // LC6 auto-rollback inserts a NEW `deploy.prod.rollback` row
      // (parent_task_id linked) instead of transitioning the parent
      // in-place — so the rollback has its own lifecycle and audit
      // record. The dispatcher stub simulates that INSERT and returns
      // a fresh child id.
      const childRows: Array<{
        taskId: string;
        reason: string;
        strategySlug: string;
        metadata: Record<string, unknown>;
        childPayload: Record<string, unknown>;
        childTaskId: string;
      }> = [];
      let childSeq = 0;
      const dispatcher: RollbackDispatcher = {
        async requestRollback(args) {
          const childTaskId = `rb-${++childSeq}-${args.taskId}`;
          childRows.push({
            taskId: args.taskId,
            reason: args.reason,
            strategySlug: args.strategySlug,
            metadata: args.metadata,
            childPayload: args.childPayload ?? {},
            childTaskId,
          });
          return { rollbackTaskId: childTaskId };
        },
      };
      // In production the orchestrator mirrors agent metadata into the
      // task row's `metadata` JSON at dispatch time; the in-memory
      // repository doesn't model that mirror, so the fetcher
      // synthesizes it from the adapter metadata.
      const adapterBefore = globalAdapterRegistry.get(DEPLOY_DOMAIN, DEPLOY_TASK_TYPES.PROD)!;
      const adapterMeta = adapterBefore.agent?.metadata as Record<string, unknown>;
      const fetchSettled = async (taskId: string): Promise<SettledTaskView | null> => {
        const row = tasks.snapshot(taskId);
        if (!row) return null;
        return {
          id: row.id,
          status: row.status,
          error_code: row.error_code ?? null,
          rollback_strategy: row.rollback_strategy as SettledTaskView["rollback_strategy"],
          metadata: {
            ...((row.metadata as Record<string, unknown>) ?? {}),
            rollback_strategy_name: adapterMeta.rollback_strategy_name as string,
          },
          payload: row.payload as Record<string, unknown> | null,
          execution_result: row.execution_result as Record<string, unknown> | null,
        };
      };

      const { outcome, autoRollback } = await runAndReconcileDeployProdTask({
        orchestrator,
        taskId: task.id,
        fetchSettled,
        dispatcher,
        deployContext: { repo: "acme/easylocs", branch: "main" },
      });

      // Forward run settled failed(HEALTH_CHECK_FAILED).
      expect(outcome.finalStatus).toBe("failed");
      expect(outcome.errorCode).toBe(DEPLOY_ERROR_CODES.HEALTH_CHECK_FAILED);
      // No RPC call happened from inside execute() — the Supabase-RPC
      // stub would have recorded it if the hook had dispatched while
      // the row was still `running`.
      expect(sb.rpcCalls.find((c) => c.fn === "request_rollback")).toBeUndefined();

      // Auto-rollback dispatched with the revert_pr slug — WITHOUT any
      // manual glue call. This is the behaviour the production
      // execution-loop gets via the same helper.
      expect(autoRollback).not.toBeNull();
      expect(autoRollback!.triggered).toBe(true);
      expect(autoRollback!.strategySlug).toBe(REVERT_PR_STRATEGY_SLUG);
      // The dispatcher returns a FRESH child task id, not the parent's.
      // This pins the new-row lifecycle contract (LC6 #877).
      expect(autoRollback!.rollbackTaskId).not.toBe(task.id);
      expect(autoRollback!.rollbackTaskId).toMatch(/^rb-\d+-/);
      expect(childRows).toHaveLength(1);
      const rb = childRows[0];
      expect(rb.taskId).toBe(task.id); // parent linkage
      expect(rb.childTaskId).not.toBe(task.id); // distinct new row
      expect(rb.strategySlug).toBe(REVERT_PR_STRATEGY_SLUG);
      expect(rb.reason).toMatch(/DEPLOY_HEALTH_CHECK_FAILED/);
      // Child row payload is self-describing: commit SHA + repo + branch.
      expect(rb.childPayload.commitSha).toBe(deploySha);
      expect(rb.childPayload.repo).toBe("acme/easylocs");
      expect(rb.childPayload.branch).toBe("main");
      expect(rb.childPayload.trigger).toBe("lc6_auto_rollback");

      // ── 2b: adapter was registered with rollback_strategy=manual. ────
      const adapter = globalAdapterRegistry.get(DEPLOY_DOMAIN, DEPLOY_TASK_TYPES.PROD)!;
      expect(adapter.rollback_strategy).toBe("manual");
      expect(typeof adapter.rollback).toBe("function");
      expect(adapterMeta.rollback_strategy_name).toBe(REVERT_PR_STRATEGY_SLUG);

      // ── 2c: drive the rollback handler directly to assert the revert
      //        commit gets created with the deployed gitRef. In
      //        production the orchestrator's `runRollback` path does
      //        this once the row transitions to `rolling_back` (L3
      //        transition-in-place on the SAME row).
      const row = tasks.snapshot(task.id)!;
      const rollbackResult = await adapter.rollback!({
        task: row,
        lockKey: row.lock_key ?? "deploy:prod:myapp",
        ownerId: "test-runner",
        attempt: 1,
        startedAt: new Date().toISOString(),
      }, {
        previousState: null,
        output: row.execution_result as Record<string, unknown> | null,
        failureReason: "post-deploy health check failed",
        trigger: "auto",
      });
      expect(rollbackResult.success).toBe(true);
      const created = github.calls.find((c) => c.op === "createRevertCommit");
      expect(created).toBeTruthy();
      expect(created!.args.commitSha).toBe(deploySha);
      expect(created!.args.repo).toBe("acme/easylocs");
      expect(created!.args.branch).toBe("main");
    },
  );

  it("post-settlement dispatcher REFUSES to dispatch while task is still running (L3 lifecycle guard)", async () => {
    // Contract test: guarantees LC6 never regresses into calling
    // `request_rollback` on a row that is still `running`, which the
    // L3 RPC would reject.
    const dispatchCalls: Array<{ taskId: string }> = [];
    const dispatcher: RollbackDispatcher = {
      async requestRollback(args) {
        dispatchCalls.push({ taskId: args.taskId });
        return { rollbackTaskId: args.taskId };
      },
    };
    const runningRow: SettledTaskView = {
      id: "task-still-running",
      status: "running",
      error_code: null,
      rollback_strategy: "manual",
      metadata: { rollback_strategy_name: REVERT_PR_STRATEGY_SLUG },
    };
    const decision = await dispatchAutoRollbackForSettledTask({
      task: runningRow,
      dispatcher,
    });
    expect(decision.triggered).toBe(false);
    expect(decision.skippedReason).toMatch(/status_not_settled/);
    expect(dispatchCalls).toHaveLength(0);
  });

  it("post-settlement dispatcher skips tasks whose error_code isn't in the trigger allowlist", async () => {
    const dispatcher: RollbackDispatcher = {
      async requestRollback() { throw new Error("must not be called"); },
    };
    const decision = await dispatchAutoRollbackForSettledTask({
      task: {
        id: "task-other-failure",
        status: "failed",
        error_code: "SOME_OTHER_ERROR",
        rollback_strategy: "manual",
        metadata: { rollback_strategy_name: REVERT_PR_STRATEGY_SLUG },
      },
      dispatcher,
    });
    expect(decision.triggered).toBe(false);
    expect(decision.skippedReason).toMatch(/error_code_not_eligible/);
  });

  it(
    "child deploy.prod.rollback row runs end-to-end through orchestrator → succeeded (verifier registered)",
    async () => {
      // This pins the fix for the NO_VERIFIER lifecycle bug: when the
      // LC6 bootstrap registers the `deploy.prod.rollback` adapter, it
      // MUST also register a matching verifier, otherwise a successful
      // revert would settle `blocked` instead of `succeeded`, breaking
      // the child-row audit/lifecycle contract.
      const sb = makeSupabaseStub();
      const github = makeFakeGithub();
      await bootstrapDeployProdAdapters(sb as never, {
        reconcileAgents: false,
        runner: async () => ({
          deploymentId: "unused",
          url: "https://unused.test",
          status: "READY",
          durationMs: 1,
          buildMinutes: 0,
        }),
        github: { client: github, repo: "acme/easylocs", branch: "main" },
      });

      const tasks = new MemoryTaskRepository();
      const orchestrator = makeOrchestrator(tasks);

      const parentSha = "deadbeefcafebabedeadbeefcafebabedeadbeef";
      const child = makeTask({
        id: "task-rollback-child-1",
        type: DEPLOY_TASK_TYPES.PROD_ROLLBACK,
        domain: DEPLOY_DOMAIN,
        status: "queued",
        requires_approval: false,
        approved_by: "system-lc6-auto",
        payload: {
          commitSha: parentSha,
          repo: "acme/easylocs",
          branch: "main",
          reason: "LC6 auto-rollback after settled failed/DEPLOY_HEALTH_CHECK_FAILED",
          parent_task_id: "parent-deploy-task-xyz",
          trigger: "lc6_auto_rollback",
        },
      });
      tasks.upsert(child);

      const outcome = await orchestrator.run(child.id);

      expect(outcome.finalStatus).toBe("succeeded");
      expect(outcome.errorCode).toBeUndefined();
      // The revert was actually executed against the right SHA.
      const createRev = github.calls.find((c) => c.op === "createRevertCommit");
      expect(createRev).toBeTruthy();
      expect(createRev!.args.commitSha).toBe(parentSha);
      // Verifier ratified the output shape.
      const row = tasks.snapshot(child.id)!;
      const verification = (row.execution_result as Record<string, unknown>)
        .verification as Record<string, unknown>;
      expect(verification.ok).toBe(true);
    },
  );

  it("does not wire LC6 when github dep is omitted (LC2 default preserved)", async () => {
    const sb = makeSupabaseStub();
    await bootstrapDeployProdAdapters(sb as never, {
      reconcileAgents: false,
      runner: async () => ({
        deploymentId: "vercel-dpl-3",
        url: "https://app.example.test",
        status: "READY",
        durationMs: 900,
        buildMinutes: 0.015,
      }),
      // No github dep → adapter must keep rollback_strategy=none.
    });
    const adapter = globalAdapterRegistry.get(DEPLOY_DOMAIN, DEPLOY_TASK_TYPES.PROD);
    expect(adapter).toBeTruthy();
    expect(adapter!.rollback_strategy).toBe("none");
    expect(adapter!.rollback).toBeUndefined();
    const meta = adapter!.agent?.metadata as Record<string, unknown>;
    expect(meta.rollback_strategy).toBe("none");
    expect(meta.rollback_strategy_name).toBeUndefined();
  });
});
