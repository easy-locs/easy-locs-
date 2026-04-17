/**
 * LC1 — Code-edit adapter integration test (task #871).
 *
 * Drives ExecutionOrchestratorV2 with the in-memory infra so we can
 * exercise the full Level-A lifecycle (validate → authorize → lock →
 * idempotency → execute → persist) for a `code.edit` task without
 * standing up Supabase.
 *
 * Asserts:
 *   1. A successful run leaves the execution_tasks row in `succeeded`
 *      with a structured diff + per-file checksum payload.
 *   2. Path-escape attempts (../../etc/passwd) abort the run with
 *      PATH_OUT_OF_SCOPE — proving the FS-scope guard is enforced.
 *   3. Diff-budget overruns abort the run with DIFF_BUDGET_EXCEEDED
 *      and never write the offending file.
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
  createCodeEditAdapter,
  type AgentQuotaProvider,
  type WorkspaceProvider,
} from "../../supabase/functions/_shared/execution/adapters/code/code-edit.ts";
import { createCodeEditVerifier } from "../../supabase/functions/_shared/execution/adapters/code/code-edit-verifier.ts";
import {
  CODE_DOMAIN,
  CODE_ERROR_CODES,
  CODE_TASK_TYPES,
  type CodeEditResult,
} from "../../supabase/functions/_shared/execution/adapters/code/types.ts";
import {
  MemoryFs,
  type SandboxFs,
} from "../../supabase/functions/_shared/execution/adapters/code/sandbox.ts";
import {
  MemoryTaskRepository,
  makeTask,
} from "../../supabase/functions/_shared/execution/__test-helpers__.ts";

function makeStack(
  seed: Record<string, string>,
  opts?: { maxDiffBytes?: number; agentQuotaMaxDiffBytes?: number | null },
) {
  // Track every acquire/release so tests can assert per-run isolation
  // and proper cleanup; each acquire returns a FRESH MemoryFs seeded
  // from the fixture so cross-run state bleed is impossible.
  const acquired: MemoryFs[] = [];
  const released: MemoryFs[] = [];
  const workspaces: WorkspaceProvider = {
    async acquire() {
      const fs = new MemoryFs("ws-1", seed);
      acquired.push(fs);
      return fs as SandboxFs;
    },
    async release(fs) {
      released.push(fs as MemoryFs);
    },
  };
  const tasks = new MemoryTaskRepository();
  const adapters = new AdapterRegistry();
  const verifiers = new VerifierRegistry();
  const sink = new InMemoryEventSink();
  const locks = new MemoryLockService();
  const idem = new MemoryIdempotencyService();

  verifiers.register(createCodeEditVerifier());
  // Stub the live DB quota lookup so tests can prove DB-side updates are
  // honoured without standing up Supabase.
  const agentQuotas: AgentQuotaProvider | undefined = opts?.agentQuotaMaxDiffBytes !== undefined
    ? { async getMaxDiffBytes() { return opts.agentQuotaMaxDiffBytes ?? null; } }
    : undefined;
  adapters.register(createCodeEditAdapter({
    workspaces,
    maxDiffBytes: opts?.maxDiffBytes,
    agentQuotas,
  }));

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

  return { acquired, released, tasks, adapters, sink, locks, idem, orchestrator };
}

describe("LC1 — code.edit adapter via ExecutionOrchestratorV2", () => {
  let stack: ReturnType<typeof makeStack>;

  beforeEach(() => {
    stack = makeStack({
      "src/foo.ts": "export const foo = 1;\n",
      "README.md":  "# Project\n",
    });
  });

  it("runs read_file + write_file + apply_diff and produces a structured diff", async () => {
    const task = makeTask({
      id: "task-code-1",
      type: CODE_TASK_TYPES.EDIT,
      domain: CODE_DOMAIN,
      status: "queued",
      requires_approval: false,
      approval_policy: "none",
      payload: {
        workspace: "ws-1",
        operations: [
          { op: "list_files", path: "src" },
          { op: "read_file", path: "src/foo.ts" },
          { op: "write_file", path: "src/foo.ts", content: "export const foo = 2;\n" },
          { op: "apply_diff", path: "README.md", find: "# Project\n", replace: "# Project\n\nLevel C — managed by code.edit.\n" },
        ],
      },
      idempotency_key: "lc1-success",
    });
    stack.tasks.upsert(task);

    const outcome = await stack.orchestrator.run(task.id);
    expect(outcome.finalStatus).toBe("succeeded");

    const row = stack.tasks.snapshot(task.id);
    expect(row?.status).toBe("succeeded");
    const result = row?.execution_result as { output: CodeEditResult } | CodeEditResult | null;
    const summary = (result && typeof result === "object" && "output" in result
      ? result.output
      : result) as CodeEditResult;
    expect(summary.workspace).toBe("ws-1");
    expect(summary.modifiedFiles.map((f) => f.path).sort()).toEqual(["README.md", "src/foo.ts"]);
    for (const f of summary.modifiedFiles) {
      expect(f.beforeChecksum).toMatch(/^[0-9a-f]{64}$/);
      expect(f.afterChecksum).toMatch(/^[0-9a-f]{64}$/);
      expect(f.beforeChecksum).not.toBe(f.afterChecksum);
    }
    expect(summary.unifiedDiff).toContain("--- a/src/foo.ts");
    expect(summary.unifiedDiff).toContain("+++ b/src/foo.ts");
    expect(summary.unifiedDiff).toContain("-export const foo = 1;");
    expect(summary.unifiedDiff).toContain("+export const foo = 2;");
    expect(summary.diffBytes).toBeGreaterThan(0);
    expect(summary.operations).toHaveLength(4);
    expect(summary.operations.every((o) => o.ok)).toBe(true);

    const writtenFs = stack.acquired[0];
    expect(writtenFs.snapshot()["src/foo.ts"]).toBe("export const foo = 2;\n");
    expect(writtenFs.snapshot()["README.md"]).toContain("Level C — managed by code.edit.");

    // Lifecycle: every acquire is matched with a release (deterministic
    // sandbox cleanup, no leaked workspaces).
    expect(stack.acquired).toHaveLength(1);
    expect(stack.released).toHaveLength(1);
    expect(stack.released[0]).toBe(writtenFs);
  });

  it("rejects path-escape attempts with PATH_OUT_OF_SCOPE and never writes", async () => {
    const task = makeTask({
      id: "task-code-escape",
      type: CODE_TASK_TYPES.EDIT,
      domain: CODE_DOMAIN,
      status: "queued",
      requires_approval: false,
      approval_policy: "none",
      payload: {
        workspace: "ws-1",
        operations: [
          { op: "write_file", path: "../../etc/passwd", content: "hacked" },
        ],
      },
      idempotency_key: "lc1-escape",
    });
    stack.tasks.upsert(task);

    const outcome = await stack.orchestrator.run(task.id);
    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.errorCode).toBe(CODE_ERROR_CODES.PATH_OUT_OF_SCOPE);

    // Sanity: the in-memory FS still contains only the seeded files.
    expect(Object.keys(stack.acquired[0].snapshot()).sort())
      .toEqual(["README.md", "src/foo.ts"]);
    // Workspace was released on the failure path too.
    expect(stack.released).toHaveLength(1);
  });

  it("aborts with DIFF_BUDGET_EXCEEDED before writing when over the cap", async () => {
    stack = makeStack({ "src/foo.ts": "old\n" }, { maxDiffBytes: 32 });
    const task = makeTask({
      id: "task-code-budget",
      type: CODE_TASK_TYPES.EDIT,
      domain: CODE_DOMAIN,
      status: "queued",
      requires_approval: false,
      approval_policy: "none",
      payload: {
        workspace: "ws-1",
        operations: [
          { op: "write_file", path: "src/foo.ts", content: "x".repeat(10_000) },
        ],
      },
      idempotency_key: "lc1-budget",
    });
    stack.tasks.upsert(task);

    const outcome = await stack.orchestrator.run(task.id);
    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.errorCode).toBe(CODE_ERROR_CODES.DIFF_BUDGET_EXCEEDED);
    expect(stack.acquired[0].snapshot()["src/foo.ts"]).toBe("old\n");
    expect(stack.released).toHaveLength(1);
  });

  it("honours a tighter live agent quota from `system.agents.quotas`", async () => {
    // Adapter default is 50 MB; live quota provider returns 32 bytes —
    // the adapter must enforce the smaller cap without redeploy.
    stack = makeStack(
      { "src/foo.ts": "old\n" },
      { agentQuotaMaxDiffBytes: 32 },
    );
    const task = makeTask({
      id: "task-code-db-quota",
      type: CODE_TASK_TYPES.EDIT,
      domain: CODE_DOMAIN,
      status: "queued",
      requires_approval: false,
      approval_policy: "none",
      payload: {
        workspace: "ws-1",
        operations: [
          { op: "write_file", path: "src/foo.ts", content: "x".repeat(10_000) },
        ],
      },
      idempotency_key: "lc1-db-quota",
    });
    stack.tasks.upsert(task);

    const outcome = await stack.orchestrator.run(task.id);
    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.errorCode).toBe(CODE_ERROR_CODES.DIFF_BUDGET_EXCEEDED);
    expect(stack.acquired[0].snapshot()["src/foo.ts"]).toBe("old\n");
  });

  it("isolates per-run state: a write in run #1 does not leak into run #2", async () => {
    // Run 1 writes a new file.
    const t1 = makeTask({
      id: "task-iso-1",
      type: CODE_TASK_TYPES.EDIT,
      domain: CODE_DOMAIN,
      status: "queued",
      requires_approval: false,
      approval_policy: "none",
      payload: {
        workspace: "ws-1",
        operations: [
          { op: "write_file", path: "src/foo.ts", content: "// run-1 marker\n" },
        ],
      },
      idempotency_key: "iso-1",
    });
    stack.tasks.upsert(t1);
    const o1 = await stack.orchestrator.run(t1.id);
    expect(o1.finalStatus).toBe("succeeded");

    // Run 2 reads — should see the ORIGINAL fixture (run-1's write was
    // scoped to its own MemoryFs and the workspace was released).
    const t2 = makeTask({
      id: "task-iso-2",
      type: CODE_TASK_TYPES.EDIT,
      domain: CODE_DOMAIN,
      status: "queued",
      requires_approval: false,
      approval_policy: "none",
      payload: {
        workspace: "ws-1",
        operations: [{ op: "read_file", path: "src/foo.ts" }],
      },
      idempotency_key: "iso-2",
    });
    stack.tasks.upsert(t2);
    const o2 = await stack.orchestrator.run(t2.id);
    expect(o2.finalStatus).toBe("succeeded");

    const row2 = stack.tasks.snapshot(t2.id);
    const out2 = (row2?.execution_result as { output: { operations: Array<{ data?: { content?: string } }> } }).output;
    expect(out2.operations[0].data?.content).toBe("export const foo = 1;\n");

    // Two runs → two distinct acquired sandboxes, two releases.
    expect(stack.acquired).toHaveLength(2);
    expect(stack.released).toHaveLength(2);
    expect(stack.acquired[0]).not.toBe(stack.acquired[1]);
  });
});
