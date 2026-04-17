/**
 * LC4 — Dev Builder · merge step integration tests (task #880).
 *
 * Exercises `runDevBuilderMerge` end-to-end with the LC7 drift-detector
 * hook wired in. Two scenarios:
 *
 *   1. Happy path: no overlap with any other branch / commit → the
 *      injected `mergePr` callback is invoked exactly once and the
 *      builder returns `status: "merged"`.
 *   2. Blocked path: the current branch overlaps a commit already on
 *      main → the builder MUST NOT call `mergePr`, MUST transition the
 *      task row to `blocked / BLOCKED_BY_DRIFT`, and MUST surface the
 *      structured drift report to the operator.
 *
 * Plus light-weight tests for the GitHub `fetchOthers` helper:
 *   - `parsePatchRanges` covers the unified-diff hunk-header parser.
 *   - `createGithubFetchOthers` is driven through an injected `fetch`
 *     stub to assert the right endpoints are called and the comparison
 *     set is materialised correctly without ever talking to GitHub.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  runDevBuilderMerge,
  type MergePrFn,
} from "../../supabase/functions/_shared/execution/builders/dev-builder";
import {
  createGithubFetchOthers,
  parsePatchRanges,
} from "../../supabase/functions/_shared/execution/builders/github-fetch-others";
import {
  BLOCKED_BY_DRIFT_REASON,
  type BranchChanges,
} from "../../supabase/functions/_shared/execution/drift-detector";

// ── Minimal in-memory fake of the Supabase surface drift-detector uses ──

interface FakeRow {
  id: string;
  status: string;
  blocked_reason: string | null;
  drift_report: Record<string, unknown> | null;
}

function createFakeSupabase(initial: FakeRow[]) {
  const rows = new Map<string, FakeRow>(initial.map((r) => [r.id, { ...r }]));
  function tableApi() {
    type Op = { kind: "select" | "update"; cols?: string; patch?: Record<string, unknown> };
    let op: Op = { kind: "select" };
    let filterId: string | null = null;
    const chain = {
      select(cols: string) { op = { kind: "select", cols }; return chain; },
      update(patch: Record<string, unknown>) { op = { kind: "update", patch }; return chain; },
      eq(col: string, val: string) {
        if (col !== "id") throw new Error(`fake supports only .eq("id", ...) — got ${col}`);
        filterId = val;
        if (op.kind === "update") {
          if (filterId && rows.has(filterId)) {
            const cur = rows.get(filterId)!;
            rows.set(filterId, { ...cur, ...(op.patch ?? {}) } as FakeRow);
          }
          return Promise.resolve({ error: null, data: null });
        }
        return chain;
      },
      maybeSingle() {
        if (filterId && rows.has(filterId)) {
          return Promise.resolve({ data: rows.get(filterId)!, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
    };
    return chain;
  }
  const sb = {
    schema(_: string) {
      return {
        from(table: string) {
          if (table !== "execution_tasks") throw new Error(`fake table ${table} not supported`);
          return tableApi();
        },
      };
    },
  };
  return {
    sb: sb as unknown as Parameters<typeof runDevBuilderMerge>[0]["sb"],
    rows,
  };
}

// ── runDevBuilderMerge ───────────────────────────────────────────────────

describe("LC4 · runDevBuilderMerge (drift gate wired in)", () => {
  const TASK_ID = "00000000-0000-0000-0000-000000000880";
  let fake: ReturnType<typeof createFakeSupabase>;

  beforeEach(() => {
    fake = createFakeSupabase([
      { id: TASK_ID, status: "queued", blocked_reason: null, drift_report: null },
    ]);
  });

  it("happy path: no overlap → mergePr is invoked and outcome is 'merged'", async () => {
    const mergePr = vi.fn<MergePrFn>(async () => ({ pr_number: 42, merge_sha: "deadbeef" }));

    const result = await runDevBuilderMerge({
      sb: fake.sb,
      taskId: TASK_ID,
      currentBranch: "agent-task-880",
      currentChanges: [{ file: "src/foo.ts", startLine: 1, endLine: 5 }],
      fetchOthers: async () => [
        // A different file → no overlap.
        { ref: "main@sha-x", changes: [{ file: "src/bar.ts", startLine: 10, endLine: 20 }] },
      ],
      mergePr,
    });

    expect(result.status).toBe("merged");
    if (result.status !== "merged") throw new Error("type narrowing");
    expect(result.merge_result).toEqual({ pr_number: 42, merge_sha: "deadbeef" });
    expect(result.drift_report.severity).toBe("none");
    expect(mergePr).toHaveBeenCalledOnce();

    // Row stays queued (orchestrator still owns the lifecycle).
    expect(fake.rows.get(TASK_ID)!.status).toBe("queued");
  });

  it("blocked path: hard overlap → mergePr NEVER runs, row goes to BLOCKED_BY_DRIFT", async () => {
    const mergePr = vi.fn<MergePrFn>(async () => ({ pr_number: 99 }));
    const onBlocked = vi.fn();

    const result = await runDevBuilderMerge({
      sb: fake.sb,
      taskId: TASK_ID,
      currentBranch: "agent-task-880",
      currentChanges: [{ file: "src/foo.ts", startLine: 15, endLine: 25 }],
      fetchOthers: async () => [
        // Same file, intersecting line range → drift "hard".
        {
          ref: "main@taskA-merged-sha",
          changes: [{ file: "src/foo.ts", startLine: 10, endLine: 20 }],
        },
      ],
      mergePr,
      onBlocked,
    });

    expect(result.status).toBe("blocked_by_drift");
    if (result.status !== "blocked_by_drift") throw new Error("type narrowing");
    expect(result.drift_report.severity).toBe("hard");
    expect(result.drift_report.overlaps).toHaveLength(1);
    expect(result.persist_error).toBeUndefined();

    // The merge step MUST have been aborted.
    expect(mergePr).not.toHaveBeenCalled();
    // Observer fired with the report.
    expect(onBlocked).toHaveBeenCalledOnce();
    expect(onBlocked.mock.calls[0][0]).toMatchObject({ severity: "hard" });

    // Row was transitioned by the LC7 hook before the merge attempt.
    const row = fake.rows.get(TASK_ID)!;
    expect(row.status).toBe("blocked");
    expect(row.blocked_reason).toBe(BLOCKED_BY_DRIFT_REASON);
    expect((row.drift_report as { severity: string }).severity).toBe("hard");
  });

  it("merge_failed: mergePr throws → outcome carries the error and the row is untouched", async () => {
    const mergePr = vi.fn<MergePrFn>(async () => {
      throw new Error("github 422: branch is behind");
    });

    const result = await runDevBuilderMerge({
      sb: fake.sb,
      taskId: TASK_ID,
      currentBranch: "agent-task-880",
      currentChanges: [{ file: "src/foo.ts", startLine: 1, endLine: 5 }],
      fetchOthers: async () => [],
      mergePr,
    });

    expect(result.status).toBe("merge_failed");
    if (result.status !== "merge_failed") throw new Error("type narrowing");
    expect(result.error).toMatch(/branch is behind/);
    expect(fake.rows.get(TASK_ID)!.status).toBe("queued");
  });
});

// ── parsePatchRanges (pure) ─────────────────────────────────────────────

describe("LC4 · parsePatchRanges", () => {
  it("extracts new-side ranges from standard hunk headers", () => {
    const patch = [
      "@@ -10,3 +10,5 @@",
      " ctx",
      "+a",
      "+b",
      "@@ -100,1 +120,1 @@",
      "-x",
      "+y",
    ].join("\n");
    expect(parsePatchRanges(patch)).toEqual([
      { startLine: 10, endLine: 14 },
      { startLine: 120, endLine: 120 },
    ]);
  });

  it("treats `@@ -a,b +c @@` (no count on new side) as a single line", () => {
    expect(parsePatchRanges("@@ -1,1 +7 @@")).toEqual([{ startLine: 7, endLine: 7 }]);
  });

  it("skips pure-deletion hunks (new-side count = 0)", () => {
    expect(parsePatchRanges("@@ -10,3 +10,0 @@")).toEqual([]);
  });

  it("returns [] for empty / null patches", () => {
    expect(parsePatchRanges(undefined)).toEqual([]);
    expect(parsePatchRanges(null)).toEqual([]);
    expect(parsePatchRanges("")).toEqual([]);
  });
});

// ── createGithubFetchOthers (with injected fetch) ───────────────────────

describe("LC4 · createGithubFetchOthers", () => {
  it("collects open PRs (excluding current branch) + commits since branch-cut", async () => {
    const calls: string[] = [];

    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = typeof url === "string" ? url : url.toString();
      calls.push(u);

      // Open PRs list
      if (u.endsWith("/pulls?state=open&per_page=30")) {
        return new Response(
          JSON.stringify([
            { number: 12, head: { ref: "agent-task-880", sha: "self" }, base: { ref: "main" }, state: "open" },
            { number: 13, head: { ref: "agent-task-other", sha: "abc" }, base: { ref: "main" }, state: "open" },
            // PR targeting a long-lived feature branch — MUST be ignored.
            { number: 14, head: { ref: "agent-task-feature", sha: "xyz" }, base: { ref: "release/2026" }, state: "open" },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      // Files for PR #13
      if (u.endsWith("/pulls/13/files?per_page=30")) {
        return new Response(
          JSON.stringify([
            { filename: "src/foo.ts", status: "modified", patch: "@@ -1,3 +1,4 @@\n a\n b" },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      // Commits on main since branch-cut
      if (u.includes("/commits?sha=main&since=")) {
        return new Response(
          JSON.stringify([{ sha: "deadbeef", commit: { message: "merge X" } }]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      // Commit detail
      if (u.endsWith("/commits/deadbeef")) {
        return new Response(
          JSON.stringify({
            files: [
              { filename: "src/baz.ts", status: "modified", patch: "@@ -10,1 +10,2 @@\n x\n+y" },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error(`unexpected URL: ${u}`);
    });

    const fetchOthers = createGithubFetchOthers({
      pat: "ghp_test",
      repo: "owner/repo",
      currentBranch: "agent-task-880",
      branchCutAt: "2026-04-30T00:00:00Z",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const others = await fetchOthers("agent-task-880");

    // Two comparison entries: PR #13 and main@deadbeef. PR #12 (self) is excluded.
    expect(others).toHaveLength(2);
    const refs = others.map((o: BranchChanges) => o.ref).sort();
    expect(refs).toEqual(["main@deadbeef", "pr#13@agent-task-other"]);

    const pr = others.find((o) => o.ref === "pr#13@agent-task-other")!;
    expect(pr.changes).toEqual([{ file: "src/foo.ts", startLine: 1, endLine: 4 }]);

    const commit = others.find((o) => o.ref === "main@deadbeef")!;
    expect(commit.changes).toEqual([{ file: "src/baz.ts", startLine: 10, endLine: 11 }]);

    // Sanity: only GET requests, no POST/PUT/DELETE/PATCH.
    for (const c of fetchImpl.mock.calls) {
      const init = c[1] as RequestInit | undefined;
      expect(init?.method ?? "GET").toBe("GET");
    }
  });

  it("propagates non-2xx GitHub responses as thrown errors (no silent partial result)", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("rate limited", { status: 429 })
    );
    const fetchOthers = createGithubFetchOthers({
      pat: "x",
      repo: "owner/repo",
      currentBranch: "br",
      branchCutAt: "2026-04-30T00:00:00Z",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(fetchOthers("br")).rejects.toThrow(/429/);
  });
});

// ── runDevBuilderLoop (task #878 — full builder loop) ───────────────────

import {
  type DevPlan,
  runDevBuilderLoop,
} from "../../supabase/functions/_shared/execution/builders/dev-builder-loop";

function makeTrivialPlan(revision = 1, planId = "plan-1"): DevPlan {
  return {
    plan_id: planId,
    revision,
    goal: "Trivial: edit a file and run tests",
    steps: [
      {
        id: "s1",
        kind: "code.edit",
        payload: { file: "src/foo.ts", op: "set", content: "// edited\n" },
      },
      { id: "s2", kind: "build.run", payload: {} },
      { id: "s3", kind: "test.run", payload: {} },
    ],
  };
}

describe("LC4 · runDevBuilderLoop (#878)", () => {
  const BUILDER_TASK_ID = "00000000-0000-0000-0000-000000000878";

  it("happy path: trivial plan executes end-to-end and opens a PR", async () => {
    let nextChild = 0;
    const dispatchChildTask = vi.fn(async () => `child-${++nextChild}`);
    const runStep = vi.fn(async () => ({
      status: "succeeded" as const,
      result: { tests_passed: true },
    }));
    const runVerifier = vi.fn(async () => ({ status: "green" as const }));
    const requestReplan = vi.fn(async () => null);
    const openPullRequest = vi.fn(async () => ({
      number: 1234,
      url: "https://github.com/owner/repo/pull/1234",
    }));

    const result = await runDevBuilderLoop({
      builderTaskId: BUILDER_TASK_ID,
      initialPlan: makeTrivialPlan(),
      maxIterations: 3,
      dispatchChildTask,
      runStep,
      runVerifier,
      requestReplan,
      openPullRequest,
    });

    expect(result.status).toBe("merged");
    expect(result.pr).toEqual({
      number: 1234,
      url: "https://github.com/owner/repo/pull/1234",
    });
    expect(result.iterations).toHaveLength(1);
    expect(result.iterations[0].children).toHaveLength(3);
    // Each plan step got exactly one child execution_tasks row.
    expect(dispatchChildTask).toHaveBeenCalledTimes(3);
    expect(runStep).toHaveBeenCalledTimes(3);
    // Children are linked to the builder task row via parent_task_id.
    for (const call of dispatchChildTask.mock.calls) {
      expect(call[0].builderTaskId).toBe(BUILDER_TASK_ID);
    }
    expect(runVerifier).toHaveBeenCalledTimes(1);
    expect(requestReplan).not.toHaveBeenCalled();
    expect(openPullRequest).toHaveBeenCalledOnce();
  });

  it("red verifier → replan loop → green on iteration 2 → PR opens", async () => {
    const dispatchChildTask = vi.fn(
      async ({ iteration, step }: { iteration: number; step: { id: string } }) =>
        `child-${iteration}-${step.id}`,
    );
    const runStep = vi.fn(async () => ({
      status: "succeeded" as const,
      result: {},
    }));
    let verifierCall = 0;
    const runVerifier = vi.fn(async () => {
      verifierCall++;
      if (verifierCall === 1) {
        return { status: "red" as const, reason: "test_x_failed" };
      }
      return { status: "green" as const };
    });
    const requestReplan = vi.fn(async () => makeTrivialPlan(2, "plan-2"));
    const openPullRequest = vi.fn(async () => ({
      number: 99,
      url: "https://github.com/owner/repo/pull/99",
    }));

    const result = await runDevBuilderLoop({
      builderTaskId: BUILDER_TASK_ID,
      initialPlan: makeTrivialPlan(),
      maxIterations: 3,
      dispatchChildTask,
      runStep,
      runVerifier,
      requestReplan,
      openPullRequest,
    });

    expect(result.status).toBe("merged");
    expect(result.iterations).toHaveLength(2);
    expect(result.iterations[0].verifier.status).toBe("red");
    expect(result.iterations[1].verifier.status).toBe("green");
    expect(result.iterations[1].planRevision).toBe(2);
    expect(requestReplan).toHaveBeenCalledOnce();
    expect(openPullRequest).toHaveBeenCalledOnce();
  });

  it("permanent reject from verifier terminates without opening a PR", async () => {
    const openPullRequest = vi.fn();
    const requestReplan = vi.fn();
    const result = await runDevBuilderLoop({
      builderTaskId: BUILDER_TASK_ID,
      initialPlan: makeTrivialPlan(),
      maxIterations: 5,
      dispatchChildTask: async () => "child-x",
      runStep: async () => ({ status: "succeeded", result: {} }),
      runVerifier: async () => ({
        status: "red",
        reason: "task_type_unsupported",
        permanent: true,
      }),
      requestReplan,
      openPullRequest,
    });

    expect(result.status).toBe("rejected_permanent");
    expect(result.reason).toBe("task_type_unsupported");
    expect(openPullRequest).not.toHaveBeenCalled();
    expect(requestReplan).not.toHaveBeenCalled();
  });

  it("quota exhausted: stops after maxIterations red passes, no PR opened", async () => {
    const openPullRequest = vi.fn();
    const result = await runDevBuilderLoop({
      builderTaskId: BUILDER_TASK_ID,
      initialPlan: makeTrivialPlan(),
      maxIterations: 2,
      dispatchChildTask: async () => "child-x",
      runStep: async () => ({ status: "succeeded", result: {} }),
      runVerifier: async () => ({ status: "red", reason: "still_failing" }),
      requestReplan: async () => makeTrivialPlan(99, "plan-replanned"),
      openPullRequest,
    });

    expect(result.status).toBe("rejected_quota_exhausted");
    expect(result.iterations).toHaveLength(2);
    expect(openPullRequest).not.toHaveBeenCalled();
    expect(result.reason).toMatch(/max_iterations=2/);
  });

  it("step failure aborts the rest of the iteration (verifier still runs)", async () => {
    let stepCall = 0;
    const runStep = vi.fn(async () => {
      stepCall++;
      if (stepCall === 1) return { status: "succeeded" as const, result: {} };
      return { status: "failed" as const, error: "build_broke" };
    });
    const runVerifier = vi.fn(async () => ({
      status: "red" as const,
      reason: "step_failed",
      permanent: true,
    }));
    const result = await runDevBuilderLoop({
      builderTaskId: BUILDER_TASK_ID,
      initialPlan: makeTrivialPlan(),
      maxIterations: 3,
      dispatchChildTask: async () => "child-x",
      runStep,
      runVerifier,
      requestReplan: async () => null,
      openPullRequest: vi.fn(),
    });

    // Plan has 3 steps: s1 succeeds, s2 fails, s3 is NEVER dispatched.
    expect(runStep).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("rejected_permanent");
    expect(result.iterations[0].children).toHaveLength(2);
    expect(result.iterations[0].children[1].outcome.status).toBe("failed");
  });

  it("replan returning null aborts with rejected_replan_failed", async () => {
    const result = await runDevBuilderLoop({
      builderTaskId: BUILDER_TASK_ID,
      initialPlan: makeTrivialPlan(),
      maxIterations: 5,
      dispatchChildTask: async () => "child-x",
      runStep: async () => ({ status: "succeeded", result: {} }),
      runVerifier: async () => ({ status: "red", reason: "transient" }),
      requestReplan: async () => null,
      openPullRequest: vi.fn(),
    });
    expect(result.status).toBe("rejected_replan_failed");
    expect(result.reason).toMatch(/null/);
  });

  it("clamps non-positive maxIterations to 1", async () => {
    const result = await runDevBuilderLoop({
      builderTaskId: BUILDER_TASK_ID,
      initialPlan: makeTrivialPlan(),
      maxIterations: 0,
      dispatchChildTask: async () => "child-x",
      runStep: async () => ({ status: "succeeded", result: {} }),
      runVerifier: async () => ({ status: "red", reason: "x" }),
      requestReplan: async () => makeTrivialPlan(2),
      openPullRequest: vi.fn(),
    });
    expect(result.status).toBe("rejected_quota_exhausted");
    expect(result.iterations).toHaveLength(1);
  });
});

// ── runDevBuilderForPlan E2E (production wiring with stubs) ─────────────

import {
  aggregateFileChanges,
  deriveVerifierVerdict,
  type OrchestrationOutcomeLike,
  runDevBuilderForPlan,
} from "../../supabase/functions/_shared/execution/builders/dev-builder-runtime";

interface FakeOrchestrator {
  run: (taskId: string) => Promise<OrchestrationOutcomeLike>;
  outcomes: Map<string, OrchestrationOutcomeLike>;
}

function makeFakeSbRpc() {
  const dispatchedChildren: Array<Record<string, unknown>> = [];
  let nextChildId = 1;
  const rpc = vi.fn(async (fn: string, params: Record<string, unknown>) => {
    if (fn === "dispatch_execution_task") {
      const id = `child-uuid-${nextChildId++}`;
      dispatchedChildren.push({ id, ...params });
      return { data: { id }, error: null };
    }
    if (fn === "dispatch_lc3_replan") {
      return { data: { replan_task_id: null }, error: null };
    }
    throw new Error(`unexpected rpc ${fn}`);
  });
  const from = vi.fn(() => ({
    select: () => ({
      eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
    }),
  }));
  const sb = { schema: () => ({ rpc, from }) };
  return { sb, rpc, dispatchedChildren };
}

describe("LC4 · runDevBuilderForPlan (#878 — production wiring)", () => {
  const BUILDER_TASK_ID = "00000000-0000-0000-0000-000000000878";

  it("E2E happy path: orchestrator runs each child, LC6 verifies, real PR opens", async () => {
    const { sb, rpc, dispatchedChildren } = makeFakeSbRpc();

    // The orchestrator stub returns succeeded + verified outcomes for
    // every child task. The code.edit step returns a `files[]` array
    // that the runtime will aggregate into the GitHub commit.
    const orchestrator: FakeOrchestrator = {
      outcomes: new Map(),
      async run(childTaskId: string) {
        const idx = dispatchedChildren.findIndex(
          (c) => (c as { id: string }).id === childTaskId,
        );
        const child = dispatchedChildren[idx]!;
        const taskType = (child as { p_type: string }).p_type;
        let outcome: OrchestrationOutcomeLike;
        if (taskType === "code.edit") {
          outcome = {
            taskId: childTaskId,
            finalStatus: "succeeded",
            verification: { status: "verified" },
            result: {
              files: [
                { path: "src/foo.ts", after: "// edited\n" },
                { path: "src/old.ts", after: null },
              ],
            },
          };
        } else if (taskType === "build.run") {
          outcome = {
            taskId: childTaskId,
            finalStatus: "succeeded",
            verification: { status: "verified" },
            result: { built: true },
          };
        } else {
          outcome = {
            taskId: childTaskId,
            finalStatus: "succeeded",
            verification: { status: "verified" },
            result: { tests_passed: true },
          };
        }
        this.outcomes.set(childTaskId, outcome);
        return outcome;
      },
    };

    // Stub GitHub Git Data API.
    const ghCalls: Array<{ method: string; url: string; body?: unknown }> = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = typeof url === "string" ? url : url.toString();
      const method = (init?.method ?? "GET").toUpperCase();
      ghCalls.push({
        method,
        url: u,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      const json = (b: unknown, status = 200) =>
        new Response(JSON.stringify(b), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      if (method === "GET" && u.includes("/git/refs/heads/main")) {
        return json({ object: { sha: "base-sha", type: "commit" } });
      }
      if (method === "GET" && u.includes("/git/commits/base-sha")) {
        return json({ sha: "base-sha", tree: { sha: "base-tree" } });
      }
      if (method === "POST" && u.endsWith("/git/blobs")) {
        return json({ sha: `blob-sha-${ghCalls.length}` });
      }
      if (method === "POST" && u.endsWith("/git/trees")) {
        return json({ sha: "new-tree" });
      }
      if (method === "POST" && u.endsWith("/git/commits")) {
        return json({ sha: "new-commit-sha", tree: { sha: "new-tree" } });
      }
      if (method === "GET" && u.includes("/git/refs/heads/agent-task-")) {
        return new Response("not found", { status: 404 });
      }
      if (method === "POST" && u.endsWith("/git/refs")) {
        return json({ ref: "refs/heads/agent-task-x", object: { sha: "new-commit-sha" } });
      }
      if (method === "GET" && u.includes("/pulls?state=open&head=")) {
        return json([]);
      }
      if (method === "POST" && u.endsWith("/pulls")) {
        return json({
          number: 4242,
          html_url: "https://github.com/owner/repo/pull/4242",
          head: { sha: "new-commit-sha" },
        });
      }
      throw new Error(`unexpected gh ${method} ${u}`);
    });

    const result = await runDevBuilderForPlan({
      // deno-lint-ignore no-explicit-any
      sb: sb as any,
      orchestrator,
      builderTaskId: BUILDER_TASK_ID,
      initialPlan: makeTrivialPlan(),
      maxIterations: 3,
      github: {
        pat: "ghp_test",
        repo: "owner/repo",
        baseBranch: "main",
        headBranch: `agent-task-${BUILDER_TASK_ID}`,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      },
    });

    expect(result.status).toBe("merged");
    expect(result.pr_result?.number).toBe(4242);
    expect(result.pr_result?.headSha).toBe("new-commit-sha");
    expect(result.iterations).toHaveLength(1);
    expect(result.iterations[0].verifier.status).toBe("green");

    // 3 children dispatched (one per plan step) with parent_task_id linking.
    expect(rpc).toHaveBeenCalledWith(
      "dispatch_execution_task",
      expect.objectContaining({
        p_type: "code.edit",
        p_domain: "code",
        p_parent_task_id: BUILDER_TASK_ID,
        p_requested_by: "dev.builder",
      }),
    );
    expect(dispatchedChildren).toHaveLength(3);

    // Real PR flow exercised the GitHub Git Data API: blob → tree →
    // commit → ref → pulls.
    const ghEndpoints = ghCalls.map((c) => `${c.method} ${c.url.split("github.com")[1]}`);
    expect(ghEndpoints.some((e) => e.includes("/git/refs/heads/main"))).toBe(true);
    expect(ghEndpoints.some((e) => e.startsWith("POST") && e.endsWith("/git/blobs"))).toBe(true);
    expect(ghEndpoints.some((e) => e.startsWith("POST") && e.endsWith("/git/trees"))).toBe(true);
    expect(ghEndpoints.some((e) => e.startsWith("POST") && e.endsWith("/git/commits"))).toBe(true);
    expect(ghEndpoints.some((e) => e.startsWith("POST") && e.endsWith("/pulls"))).toBe(true);

    // The commit body included the new content of src/foo.ts.
    const blobBodies = ghCalls.filter((c) => c.url.endsWith("/git/blobs")).map((c) => c.body);
    expect(blobBodies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ content: "// edited\n", encoding: "utf-8" }),
      ]),
    );
    // Tree includes the deletion tombstone for src/old.ts.
    const treeBody = ghCalls.find((c) => c.url.endsWith("/git/trees"))?.body as {
      tree: Array<{ path: string; sha: string | null }>;
    };
    expect(treeBody.tree.some((t) => t.path === "src/old.ts" && t.sha === null)).toBe(true);
  });

  it("E2E red verifier: rejected verification → no PR opened", async () => {
    const { sb } = makeFakeSbRpc();
    const orchestrator: FakeOrchestrator = {
      outcomes: new Map(),
      async run(childTaskId: string) {
        // Code edit verifies, build verifies, test step REJECTED by LC6.
        const out: OrchestrationOutcomeLike = childTaskId.endsWith("3")
          ? {
            taskId: childTaskId,
            finalStatus: "succeeded",
            verification: { status: "rejected" },
            result: { tests_passed: false },
          }
          : {
            taskId: childTaskId,
            finalStatus: "succeeded",
            verification: { status: "verified" },
            result: {},
          };
        this.outcomes.set(childTaskId, out);
        return out;
      },
    };
    const fetchImpl = vi.fn();
    const result = await runDevBuilderForPlan({
      // deno-lint-ignore no-explicit-any
      sb: sb as any,
      orchestrator,
      builderTaskId: BUILDER_TASK_ID,
      initialPlan: makeTrivialPlan(),
      maxIterations: 1,
      github: {
        pat: "x",
        repo: "owner/repo",
        baseBranch: "main",
        headBranch: "agent-task-x",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      },
    });
    expect(result.status).toBe("rejected_quota_exhausted");
    expect(result.iterations[0].verifier.status).toBe("red");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("LC4 · aggregateFileChanges + deriveVerifierVerdict (pure)", () => {
  it("aggregates the latest after-content per path across iterations", () => {
    const iterations = [
      {
        iteration: 1,
        planRevision: 1,
        children: [
          {
            iteration: 1,
            stepId: "s1",
            stepKind: "code.edit" as const,
            childTaskId: "c1",
            outcome: {
              status: "succeeded" as const,
              result: { files: [{ path: "a.ts", after: "v1" }] },
            },
          },
        ],
        verifier: { status: "red" as const, reason: "x" },
      },
      {
        iteration: 2,
        planRevision: 2,
        children: [
          {
            iteration: 2,
            stepId: "s1",
            stepKind: "code.edit" as const,
            childTaskId: "c2",
            outcome: {
              status: "succeeded" as const,
              result: { files: [{ path: "a.ts", after: "v2" }, { path: "b.ts", after: null }] },
            },
          },
        ],
        verifier: { status: "green" as const },
      },
    ];
    const files = aggregateFileChanges(iterations);
    expect(files).toEqual(
      expect.arrayContaining([
        { path: "a.ts", content: "v2" },
        { path: "b.ts", content: null },
      ]),
    );
  });

  it("derives green only when last test step is verified and no rejections", () => {
    const stepResults = [
      {
        iteration: 1,
        stepId: "s1",
        stepKind: "code.edit" as const,
        childTaskId: "c1",
        outcome: { status: "succeeded" as const, result: {} },
      },
      {
        iteration: 1,
        stepId: "s2",
        stepKind: "test.run" as const,
        childTaskId: "c2",
        outcome: { status: "succeeded" as const, result: {} },
      },
    ];
    const map = new Map<string, OrchestrationOutcomeLike>([
      ["c1", { taskId: "c1", finalStatus: "succeeded", verification: { status: "verified" } }],
      ["c2", { taskId: "c2", finalStatus: "succeeded", verification: { status: "verified" } }],
    ]);
    expect(deriveVerifierVerdict(stepResults, map)).toEqual({ status: "green" });

    const map2 = new Map(map);
    map2.set("c2", {
      taskId: "c2",
      finalStatus: "succeeded",
      verification: { status: "rejected" },
    });
    expect(deriveVerifierVerdict(stepResults, map2).status).toBe("red");

    const noTest = stepResults.slice(0, 1);
    expect(deriveVerifierVerdict(noTest, map).status).toBe("red");
  });
});

describe("LC4 · runDevBuilderForPlan red→replan→green (#878)", () => {
  it("runtime drives request_dev_replan, polls for plan, runs iter 2, opens PR", async () => {
    const BUILDER_TASK_ID = "00000000-0000-0000-0000-000000000aaa";
    const REPLAN_TASK_ID = "00000000-0000-0000-0000-000000000bbb";

    let nextChildId = 1;
    let pollCount = 0;
    const dispatchedChildren: Array<Record<string, unknown>> = [];

    const rpc = vi.fn(async (fn: string, params: Record<string, unknown>) => {
      if (fn === "dispatch_execution_task") {
        const id = `child-${nextChildId++}`;
        dispatchedChildren.push({ id, ...params });
        return { data: { id }, error: null };
      }
      if (fn === "request_dev_replan") {
        expect(params.p_builder_task_id).toBe(BUILDER_TASK_ID);
        return { data: { replan_task_id: REPLAN_TASK_ID }, error: null };
      }
      throw new Error(`unexpected rpc ${fn}`);
    });

    // The replan row's payload.plan only appears after the second poll
    // — exercises the polling loop. The runtime tick is set to 0 so the
    // test does not actually sleep.
    const fromImpl = vi.fn(() => ({
      select: () => ({
        eq: (_col: string, val: string) => ({
          maybeSingle: async () => {
            if (val !== REPLAN_TASK_ID) return { data: null, error: null };
            pollCount++;
            if (pollCount < 2) {
              return { data: { payload: {}, status: "queued" }, error: null };
            }
            return {
              data: {
                payload: { plan: makeTrivialPlan(2, "plan-replanned") },
                status: "queued",
              },
              error: null,
            };
          },
        }),
      }),
    }));
    const sb = { schema: () => ({ rpc, from: fromImpl }) };

    let verifierCall = 0;
    const orchestrator = {
      async run(childTaskId: string): Promise<OrchestrationOutcomeLike> {
        const child = dispatchedChildren.find(
          (c) => (c as { id: string }).id === childTaskId,
        )!;
        const taskType = (child as { p_type: string }).p_type;
        if (taskType === "test.run") {
          verifierCall++;
          // Iteration 1: tests fail (rejected). Iteration 2: tests pass.
          if (verifierCall === 1) {
            return {
              taskId: childTaskId,
              finalStatus: "succeeded",
              verification: { status: "rejected" },
              result: { tests_passed: false },
            };
          }
          return {
            taskId: childTaskId,
            finalStatus: "succeeded",
            verification: { status: "verified" },
            result: { tests_passed: true },
          };
        }
        if (taskType === "code.edit") {
          return {
            taskId: childTaskId,
            finalStatus: "succeeded",
            verification: { status: "verified" },
            result: {
              files: [{ path: "src/foo.ts", after: "// edited\n" }],
            },
          };
        }
        return {
          taskId: childTaskId,
          finalStatus: "succeeded",
          verification: { status: "verified" },
          result: {},
        };
      },
    };

    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = typeof url === "string" ? url : url.toString();
      const m = (init?.method ?? "GET").toUpperCase();
      const json = (b: unknown, status = 200) =>
        new Response(JSON.stringify(b), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      if (m === "GET" && u.includes("/git/refs/heads/main")) {
        return json({ object: { sha: "base", type: "commit" } });
      }
      if (m === "GET" && u.includes("/git/commits/base")) {
        return json({ sha: "base", tree: { sha: "base-tree" } });
      }
      if (m === "POST" && u.endsWith("/git/blobs")) return json({ sha: "blob" });
      if (m === "POST" && u.endsWith("/git/trees")) return json({ sha: "tree" });
      if (m === "POST" && u.endsWith("/git/commits"))
        return json({ sha: "commit", tree: { sha: "tree" } });
      if (m === "GET" && u.includes("/git/refs/heads/agent-task-"))
        return new Response("nf", { status: 404 });
      if (m === "POST" && u.endsWith("/git/refs"))
        return json({ ref: "refs/heads/x", object: { sha: "commit" } });
      if (m === "GET" && u.includes("/pulls?state=open&head=")) return json([]);
      if (m === "POST" && u.endsWith("/pulls"))
        return json({
          number: 555,
          html_url: "https://github.com/o/r/pull/555",
          head: { sha: "commit" },
        });
      throw new Error(`unexpected ${m} ${u}`);
    });

    const result = await runDevBuilderForPlan({
      // deno-lint-ignore no-explicit-any
      sb: sb as any,
      orchestrator,
      builderTaskId: BUILDER_TASK_ID,
      initialPlan: makeTrivialPlan(),
      maxIterations: 3,
      replanTickMs: 0,
      replanWaitMs: 100,
      github: {
        pat: "ghp",
        repo: "owner/repo",
        baseBranch: "main",
        headBranch: `agent-task-${BUILDER_TASK_ID}`,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      },
    });

    expect(result.status).toBe("merged");
    expect(result.iterations).toHaveLength(2);
    expect(result.iterations[0].verifier.status).toBe("red");
    expect(result.iterations[1].verifier.status).toBe("green");
    expect(result.iterations[1].planRevision).toBe(2);
    expect(result.pr_result?.number).toBe(555);

    // Replan RPC was actually invoked with the canonical name.
    expect(rpc).toHaveBeenCalledWith(
      "request_dev_replan",
      expect.objectContaining({ p_builder_task_id: BUILDER_TASK_ID }),
    );
    // 6 children dispatched (3 per iteration).
    expect(dispatchedChildren).toHaveLength(6);
    // Polling actually happened (>= 2 polls before plan was ready).
    expect(pollCount).toBeGreaterThanOrEqual(2);
  });
});
