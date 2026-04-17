/**
 * LC2 — Build / Test / Deploy adapters · integration tests (task #872).
 *
 * Drives ExecutionOrchestratorV2 with the in-memory infra so we can exercise
 * the full pipeline (validate → authorize → lock → execute → verify →
 * persist) for each of the four code.tool adapters without standing up a
 * real Vite / Vitest / Vercel runner. Each adapter accepts an injectable
 * runner stub; the tests assert structured JSON logs, cost accounting,
 * verifier ratification and the dev-sensitive approval gate on deploy.prod.
 */

import { describe, expect, it, beforeEach } from "vitest";
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

import { createBuildAdapter } from "../../supabase/functions/_shared/execution/adapters/build/build-adapter.ts";
import { createBuildVerifier } from "../../supabase/functions/_shared/execution/adapters/build/build-verifier.ts";
import { BUILD_DOMAIN, BUILD_TASK_TYPES, BUILD_EVENTS, BUILD_ERROR_CODES } from "../../supabase/functions/_shared/execution/adapters/build/types.ts";

import { createTestAdapter } from "../../supabase/functions/_shared/execution/adapters/test/test-adapter.ts";
import { createTestVerifier } from "../../supabase/functions/_shared/execution/adapters/test/test-verifier.ts";
import { TEST_DOMAIN, TEST_TASK_TYPES, TEST_EVENTS, TEST_ERROR_CODES } from "../../supabase/functions/_shared/execution/adapters/test/types.ts";
import { createDenoTestRunner } from "../../supabase/functions/_shared/execution/adapters/test/deno-runner.ts";

import { createDeployPreviewAdapter } from "../../supabase/functions/_shared/execution/adapters/deploy/preview/deploy-preview-adapter.ts";
import { createDeployPreviewVerifier } from "../../supabase/functions/_shared/execution/adapters/deploy/preview/deploy-preview-verifier.ts";
import { createDeployProdAdapter } from "../../supabase/functions/_shared/execution/adapters/deploy/prod/deploy-prod-adapter.ts";
import { createDeployProdVerifier } from "../../supabase/functions/_shared/execution/adapters/deploy/prod/deploy-prod-verifier.ts";
import { DEPLOY_DOMAIN, DEPLOY_TASK_TYPES, DEPLOY_EVENTS, DEPLOY_ERROR_CODES } from "../../supabase/functions/_shared/execution/adapters/deploy/types.ts";

function makeStack() {
  const tasks = new MemoryTaskRepository();
  const adapters = new AdapterRegistry();
  const verifiers = new VerifierRegistry();
  const sink = new InMemoryEventSink();
  const locks = new MemoryLockService();
  const idem = new MemoryIdempotencyService();

  const orchestrator = new ExecutionOrchestratorV2({
    registry: adapters,
    repository: tasks,
    locks,
    idempotency: idem,
    validator: { async validate() { return { ok: true }; } },
    sink,
    ownerId: "test-runner",
    lockTtlSeconds: 30,
    verification: new TaskVerificationService(verifiers),
  });

  return { tasks, adapters, verifiers, sink, locks, idem, orchestrator };
}

function findLog(logs: string[] | undefined, event: string): Record<string, unknown> | null {
  if (!logs) return null;
  for (const line of logs) {
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      if (parsed.event === event) return parsed;
    } catch { /* not JSON, skip */ }
  }
  return null;
}

/**
 * The orchestrator wraps an adapter's success output as
 * `{ output, logs, actions_taken, verification }`. This helper extracts
 * the inner `output` payload as a typed record so tests don't need
 * to sprinkle `any` casts.
 */
function executionOutput(row: { execution_result: unknown } | null | undefined): Record<string, unknown> {
  const result = row?.execution_result as Record<string, unknown> | null | undefined;
  const output = result?.output as Record<string, unknown> | undefined;
  return output ?? {};
}

interface CostFields { cost_usd?: number; latency_ms?: number }
function costFields(row: object): CostFields {
  return row as CostFields;
}

describe("LC2 — build.run adapter", () => {
  let stack: ReturnType<typeof makeStack>;

  beforeEach(() => {
    stack = makeStack();
    stack.verifiers.register(createBuildVerifier());
    stack.adapters.register(createBuildAdapter({
      runner: async () => ({
        exitCode: 0,
        bundleBytes: 524_288,
        assets: [
          { path: "dist/index.html", bytes: 1024 },
          { path: "dist/assets/main.js", bytes: 523_264 },
        ],
        durationMs: 4_200,
        buildMinutes: 0.07,
        stdoutTail: "vite v5.0.0 building for production...",
        stderrTail: "",
      }),
    }));
  });

  it("dispatches a build → succeeds with structured logs and cost on the row", async () => {
    const task = makeTask({
      id: "task-build-ok",
      type: BUILD_TASK_TYPES.RUN,
      domain: BUILD_DOMAIN,
      status: "queued",
      requires_approval: false,
      payload: { mode: "production", label: "ci-smoke" },
      entity_type: null,
      entity_id: null,
      idempotency_key: "idem-build-ok",
    });
    stack.tasks.upsert(task);

    const outcome = await stack.orchestrator.run(task.id);

    expect(outcome.finalStatus).toBe("succeeded");
    const row = stack.tasks.snapshot(task.id)!;
    expect(row.status).toBe("succeeded");
    expect(executionOutput(row)).toMatchObject({
      status: "succeeded",
      bundleBytes: 524_288,
      command: "vite build",
      mode: "production",
    });
    // Cost surfaced from output → orchestrator persists on cost_usd column.
    expect(costFields(row).cost_usd).toBeCloseTo(0.07, 4);
    expect(costFields(row).latency_ms).toBe(4_200);
    expect(stack.sink.names()).toContain("task.succeeded");
  });

  it("surfaces a non-zero exit code as BUILD_RUN_FAILED with a structured failed log", async () => {
    stack.adapters.clear();
    stack.adapters.register(createBuildAdapter({
      runner: async () => ({
        exitCode: 1,
        bundleBytes: 0,
        assets: [],
        durationMs: 800,
        buildMinutes: 0.0133,
        stdoutTail: "",
        stderrTail: "error TS2304: Cannot find name 'foo'",
      }),
    }));

    const task = makeTask({
      id: "task-build-fail",
      type: BUILD_TASK_TYPES.RUN,
      domain: BUILD_DOMAIN,
      status: "queued",
      requires_approval: false,
      payload: {},
      entity_type: null,
      entity_id: null,
      idempotency_key: "idem-build-fail",
    });
    stack.tasks.upsert(task);

    const outcome = await stack.orchestrator.run(task.id);
    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.errorCode).toBe(BUILD_ERROR_CODES.BUILD_FAILED);
  });

  it("emits the build.run.completed event line with bundle metrics", async () => {
    const adapter = createBuildAdapter({
      runner: async () => ({
        exitCode: 0,
        bundleBytes: 12_345,
        assets: [{ path: "dist/main.js", bytes: 12_345 }],
        durationMs: 1_000,
        buildMinutes: 0.0167,
        stdoutTail: "",
        stderrTail: "",
      }),
    });
    const result = await adapter.execute({
      task: makeTask({
        id: "t-log",
        type: BUILD_TASK_TYPES.RUN,
        domain: BUILD_DOMAIN,
        status: "running",
        payload: { command: "vite build --mode staging" },
      }),
      lockKey: "build:t-log",
      ownerId: "x",
      attempt: 1,
      startedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
    const completed = findLog(result.logs, BUILD_EVENTS.COMPLETED);
    expect(completed).not.toBeNull();
    expect(completed!.bundle_bytes).toBe(12_345);
    expect(completed!.exit_code).toBe(0);
  });
});

describe("LC2 — test.run adapter", () => {
  let stack: ReturnType<typeof makeStack>;

  beforeEach(() => {
    stack = makeStack();
    stack.verifiers.register(createTestVerifier());
  });

  it("succeeds when vitest reports zero failures and emits coverage", async () => {
    stack.adapters.register(createTestAdapter({
      runner: async () => ({
        exitCode: 0,
        passed: 312,
        failed: 0,
        skipped: 4,
        durationMs: 8_500,
        buildMinutes: 0.1417,
        coverage: { lines: 87.5, statements: 86.2, branches: 74.1, functions: 90.0 },
        stdoutTail: "Test Files 42 passed (42)",
        stderrTail: "",
      }),
    }));
    const task = makeTask({
      id: "task-test-ok",
      type: TEST_TASK_TYPES.RUN,
      domain: TEST_DOMAIN,
      status: "queued",
      requires_approval: false,
      payload: {},
      entity_type: null,
      entity_id: null,
      idempotency_key: "idem-test-ok",
    });
    stack.tasks.upsert(task);

    const outcome = await stack.orchestrator.run(task.id);
    expect(outcome.finalStatus).toBe("succeeded");
    const row = stack.tasks.snapshot(task.id)!;
    expect(executionOutput(row)).toMatchObject({
      status: "succeeded",
      passed: 312,
      failed: 0,
      coverage: expect.objectContaining({ lines: 87.5 }),
    });
  });

  it("fails when any test fails", async () => {
    stack.adapters.register(createTestAdapter({
      runner: async () => ({
        exitCode: 1,
        passed: 200,
        failed: 3,
        skipped: 0,
        durationMs: 9_000,
        buildMinutes: 0.15,
        coverage: { lines: null, statements: null, branches: null, functions: null },
        stdoutTail: "",
        stderrTail: "FAIL src/foo.test.ts",
      }),
    }));
    const task = makeTask({
      id: "task-test-fail",
      type: TEST_TASK_TYPES.RUN,
      domain: TEST_DOMAIN,
      status: "queued",
      requires_approval: false,
      payload: {},
      entity_type: null,
      entity_id: null,
      idempotency_key: "idem-test-fail",
    });
    stack.tasks.upsert(task);

    const outcome = await stack.orchestrator.run(task.id);
    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.errorCode).toBe(TEST_ERROR_CODES.TESTS_FAILED);
  });

  it("Deno-backed runner maps Vitest --reporter=json coverage into the result", async () => {
    // Stub the spawned process by patching Deno.Command so the runner
    // sees a realistic Vitest JSON payload with a coverage summary.
    const fakeJson = JSON.stringify({
      numPassedTests: 50,
      numFailedTests: 0,
      numPendingTests: 2,
      coverageMap: {
        total: {
          lines:      { pct: 91.3 },
          statements: { pct: 90.7 },
          branches:   { pct: 78.4 },
          functions:  { pct: 95.0 },
        },
      },
    });
    const enc = new TextEncoder();
    const realCommand = (globalThis as { Deno?: { Command?: unknown } }).Deno?.Command;
    class FakeCommand {
      constructor(_bin: string, _opts: unknown) {}
      async output(): Promise<{ code: number; stdout: Uint8Array; stderr: Uint8Array }> {
        return { code: 0, stdout: enc.encode(fakeJson + "\n"), stderr: new Uint8Array() };
      }
    }
    (globalThis as { Deno: { Command: unknown } }).Deno = {
      ...((globalThis as { Deno?: object }).Deno ?? {}),
      Command: FakeCommand,
    } as { Command: unknown };

    try {
      const runner = createDenoTestRunner();
      const result = await runner({
        command: "vitest run",
        workspace: ".",
        pattern: null,
        taskId: "t-cov",
      });
      expect(result.exitCode).toBe(0);
      expect(result.passed).toBe(50);
      expect(result.skipped).toBe(2);
      expect(result.coverage.lines).toBeCloseTo(91.3, 2);
      expect(result.coverage.statements).toBeCloseTo(90.7, 2);
      expect(result.coverage.branches).toBeCloseTo(78.4, 2);
      expect(result.coverage.functions).toBeCloseTo(95.0, 2);
    } finally {
      // Restore in case other tests share the global.
      if (realCommand) {
        (globalThis as { Deno: { Command: unknown } }).Deno = {
          ...((globalThis as { Deno?: object }).Deno ?? {}),
          Command: realCommand,
        } as { Command: unknown };
      }
    }
  });

  it("emits the test.run.completed event line", async () => {
    const adapter = createTestAdapter({
      runner: async () => ({
        exitCode: 0,
        passed: 5,
        failed: 0,
        skipped: 1,
        durationMs: 2_000,
        buildMinutes: 0.0333,
        coverage: { lines: null, statements: null, branches: null, functions: null },
        stdoutTail: "",
        stderrTail: "",
      }),
    });
    const result = await adapter.execute({
      task: makeTask({
        id: "t-test-log",
        type: TEST_TASK_TYPES.RUN,
        domain: TEST_DOMAIN,
        status: "running",
        payload: {},
      }),
      lockKey: "test:t-test-log",
      ownerId: "x",
      attempt: 1,
      startedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
    const completed = findLog(result.logs, TEST_EVENTS.COMPLETED);
    expect(completed).not.toBeNull();
    expect(completed!.passed).toBe(5);
  });
});

describe("LC2 — deploy.preview adapter", () => {
  let stack: ReturnType<typeof makeStack>;

  beforeEach(() => {
    stack = makeStack();
    stack.verifiers.register(createDeployPreviewVerifier());
    stack.adapters.register(createDeployPreviewAdapter({
      runner: async () => ({
        deploymentId: "dpl_abc123",
        url: "https://feature-x-myapp.vercel.app",
        status: "READY",
        durationMs: 12_000,
        buildMinutes: 0.2,
      }),
    }));
  });

  it("dispatches a preview deploy and captures URL + status", async () => {
    const task = makeTask({
      id: "task-deploy-preview",
      type: DEPLOY_TASK_TYPES.PREVIEW,
      domain: DEPLOY_DOMAIN,
      status: "queued",
      requires_approval: false,
      payload: { project: "myapp", gitRef: "abc1234", label: "feature/x" },
      entity_type: null,
      entity_id: null,
      idempotency_key: "idem-preview",
    });
    stack.tasks.upsert(task);

    const outcome = await stack.orchestrator.run(task.id);
    expect(outcome.finalStatus).toBe("succeeded");
    const row = stack.tasks.snapshot(task.id)!;
    expect(executionOutput(row)).toMatchObject({
      target: "preview",
      deploymentId: "dpl_abc123",
      url: "https://feature-x-myapp.vercel.app",
      status_lifecycle: "succeeded",
    });
    const startLog = findLog(((outcome.result as Record<string, unknown> | undefined)?.logs as string[] | undefined),
      DEPLOY_EVENTS.PREVIEW_STARTED);
    // logs are on the adapter result, persisted into result via orchestrator
    expect(row.execution_result).toBeTruthy();
    void startLog;
  });

  it("rejects an invalid payload with INVALID_PAYLOAD", async () => {
    const task = makeTask({
      id: "task-deploy-preview-bad",
      type: DEPLOY_TASK_TYPES.PREVIEW,
      domain: DEPLOY_DOMAIN,
      status: "queued",
      requires_approval: false,
      payload: {},
      entity_type: null,
      entity_id: null,
      idempotency_key: "idem-preview-bad",
    });
    stack.tasks.upsert(task);

    const outcome = await stack.orchestrator.run(task.id);
    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.errorCode).toBe(DEPLOY_ERROR_CODES.INVALID_PAYLOAD);
  });
});

describe("LC2 — deploy.prod adapter", () => {
  it("REFUSES to dispatch without an approved_by stamp (defense-in-depth)", async () => {
    // The orchestrator's authorization gate normally blocks an unapproved
    // task before it reaches the adapter. This test exercises the
    // adapter's *defense-in-depth* check directly: even if a misrouted
    // dispatch hands the adapter a row with no `approved_by`, the adapter
    // must refuse to call Vercel and surface PROD_NOT_APPROVED.
    let runnerCalls = 0;
    const adapter = createDeployProdAdapter({
      runner: async () => {
        runnerCalls++;
        return {
          deploymentId: "dpl_should_not_be_called",
          url: "https://example.com",
          status: "READY",
          durationMs: 1_000,
          buildMinutes: 0.0167,
        };
      },
    });

    const task = makeTask({
      id: "task-deploy-prod-noapproval",
      type: DEPLOY_TASK_TYPES.PROD,
      domain: DEPLOY_DOMAIN,
      status: "running",
      requires_approval: true,
      // makeTask defaults approved_by to "admin-1"; explicitly clear it.
      approved_by: "" as unknown as string,
      approval_policy: "single_admin",
      payload: { project: "myapp", gitRef: "deadbeef" },
    });

    const result = await adapter.execute({
      task,
      lockKey: "deploy:prod:myapp",
      ownerId: "test",
      attempt: 1,
      startedAt: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(DEPLOY_ERROR_CODES.PROD_NOT_APPROVED);
    expect(runnerCalls).toBe(0);
    const rejected = findLog(result.logs, DEPLOY_EVENTS.PROD_REJECTED);
    expect(rejected).not.toBeNull();
  });

  it("dispatches when approved_by is present and the runner reports READY", async () => {
    const stack = makeStack();
    stack.verifiers.register(createDeployProdVerifier());
    stack.adapters.register(createDeployProdAdapter({
      runner: async () => ({
        deploymentId: "dpl_prod_xyz",
        url: "https://myapp.com",
        status: "READY",
        durationMs: 60_000,
        buildMinutes: 1.0,
      }),
    }));

    const task = makeTask({
      id: "task-deploy-prod-ok",
      type: DEPLOY_TASK_TYPES.PROD,
      domain: DEPLOY_DOMAIN,
      status: "queued",
      requires_approval: true,
      approved_by: "admin-123",
      approval_policy: "single_admin",
      payload: { project: "myapp", gitRef: "deadbeef", label: "release-2026.04" },
      entity_type: null,
      entity_id: null,
      idempotency_key: "idem-prod-ok",
    });
    stack.tasks.upsert(task);

    const outcome = await stack.orchestrator.run(task.id);
    expect(outcome.finalStatus).toBe("succeeded");
    const row = stack.tasks.snapshot(task.id)!;
    expect(executionOutput(row)).toMatchObject({
      target: "production",
      deploymentId: "dpl_prod_xyz",
      url: "https://myapp.com",
      status_lifecycle: "succeeded",
    });
    expect(costFields(row).cost_usd).toBeCloseTo(1.0, 4);
  });

  it("verifier rejects a success result if approved_by is missing on the row", async () => {
    const verifier = createDeployProdVerifier();
    const task = makeTask({
      id: "task-deploy-prod-vmismatch",
      type: DEPLOY_TASK_TYPES.PROD,
      domain: DEPLOY_DOMAIN,
      // makeTask defaults approved_by to "admin-1"; explicitly clear it.
      approved_by: "" as unknown as string,
    });
    const result = await verifier.verify(task, {
      status_lifecycle: "succeeded",
      deploymentId: "dpl_x",
      url: "https://example.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.mismatchPath).toBe("approved_by");
    }
  });
});

describe("LC2 — agent registration metadata", () => {
  it("each adapter declares the canonical agent slug, kind and policy profile", () => {
    const build = createBuildAdapter({ runner: async () => ({
      exitCode: 0, bundleBytes: 0, assets: [], durationMs: 0, buildMinutes: 0,
      stdoutTail: "", stderrTail: "",
    }) });
    expect(build.agent?.slug).toBe("build.run");
    expect(build.agent?.kind).toBe("code.tool");
    expect(build.agent?.policyProfile).toBe("dev-default");

    const test = createTestAdapter({ runner: async () => ({
      exitCode: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0, buildMinutes: 0,
      coverage: { lines: null, statements: null, branches: null, functions: null },
      stdoutTail: "", stderrTail: "",
    }) });
    expect(test.agent?.slug).toBe("test.run");
    expect(test.agent?.kind).toBe("code.tool");
    expect(test.agent?.policyProfile).toBe("dev-default");

    const preview = createDeployPreviewAdapter({ runner: async () => ({
      deploymentId: "x", url: "u", status: "READY", durationMs: 0, buildMinutes: 0,
    }) });
    expect(preview.agent?.slug).toBe("deploy.preview");
    expect(preview.agent?.kind).toBe("code.tool");
    expect(preview.agent?.policyProfile).toBe("dev-default");

    const prod = createDeployProdAdapter({ runner: async () => ({
      deploymentId: "x", url: "u", status: "READY", durationMs: 0, buildMinutes: 0,
    }) });
    expect(prod.agent?.slug).toBe("deploy.prod");
    expect(prod.agent?.kind).toBe("code.tool");
    // dev-sensitive enforces approval via LC5 policy gate.
    expect(prod.agent?.policyProfile).toBe("dev-sensitive");
    expect(prod.agent?.metadata?.sensitive).toBe(true);
  });
});
