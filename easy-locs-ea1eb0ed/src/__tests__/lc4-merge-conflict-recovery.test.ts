/**
 * LC4 — Dev Builder · merge-conflict recovery wiring tests (#915 + #924).
 *
 * Covers the bridge between the LC7 pre-merge drift gate and the LC4
 * `system.request_dev_replan` dispatch path:
 *
 *   - `formatMergeConflictReason` is pure: deterministic, stable, and
 *     refuses to render a reason for anything other than a hard report
 *     with at least one usable overlap.
 *   - `requestMergeConflictReplan` calls the RPC with the exact
 *     `merge_conflict:overlap_with:<branch>` reason and surfaces RPC
 *     errors loudly.
 *   - `createMergeConflictRecoveryHandler` integrates with
 *     `runDevBuilderMerge`: a hard overlap fires the RPC exactly once
 *     and the row's audit blob carries the reason verbatim. RPC
 *     failures are swallowed (the row is already BLOCKED_BY_DRIFT)
 *     and forwarded to `onReplanFailed`.
 */
import { describe, it, expect, vi } from "vitest";
import {
  runDevBuilderForPlan,
  type OrchestrationOutcomeLike,
} from "../../supabase/functions/_shared/execution/builders/dev-builder-runtime";
import {
  createMergeConflictAuditHandler,
  createMergeConflictPreMergeCheck,
  createMergeConflictRecoveryHandler,
  defaultComputeCurrentChanges,
  formatMergeConflictReason,
  requestMergeConflictReplan,
} from "../../supabase/functions/_shared/execution/builders/merge-conflict-recovery";
import {
  runDevBuilderMerge,
  type MergePrFn,
} from "../../supabase/functions/_shared/execution/builders/dev-builder";
import {
  BLOCKED_BY_DRIFT_REASON,
  type BranchChanges,
  type DriftReport,
} from "../../supabase/functions/_shared/execution/drift-detector";
import type { DevPlan } from "../../supabase/functions/_shared/execution/builders/dev-builder-loop";

// ── Fakes ─────────────────────────────────────────────────────────────────

/** A minimal Supabase fake exposing only `.schema().rpc()` and the
 *  `.schema().from("execution_tasks").(select|update).eq.maybeSingle`
 *  surface used by the merge step + recovery wiring. */
function createFakeSupabase(opts?: {
  rpc?: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  rows?: Map<string, Record<string, unknown>>;
}) {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const rows = opts?.rows ??
    new Map<string, Record<string, unknown>>();
  const sb = {
    schema(_: string) {
      return {
        rpc(name: string, args: Record<string, unknown>) {
          rpcCalls.push({ name, args });
          if (opts?.rpc) return opts.rpc(name, args);
          return Promise.resolve({
            data: { replan_task_id: "replan-fake-1" },
            error: null,
          });
        },
        from(_table: string) {
          // Minimal chain used by markTaskBlockedByDrift (update) and
          // by tests that read rows back.
          let filterId: string | null = null;
          let pendingPatch: Record<string, unknown> | null = null;
          const chain = {
            select(_cols: string) {
              pendingPatch = null;
              return chain;
            },
            update(patch: Record<string, unknown>) {
              pendingPatch = patch;
              return chain;
            },
            eq(col: string, val: string) {
              if (col !== "id") throw new Error(`unsupported eq col: ${col}`);
              filterId = val;
              if (pendingPatch && filterId) {
                const cur = rows.get(filterId) ?? { id: filterId };
                rows.set(filterId, { ...cur, ...pendingPatch });
                pendingPatch = null;
                return Promise.resolve({ data: null, error: null });
              }
              return chain;
            },
            maybeSingle() {
              if (filterId && rows.has(filterId)) {
                return Promise.resolve({ data: rows.get(filterId), error: null });
              }
              return Promise.resolve({ data: null, error: null });
            },
          };
          return chain;
        },
      };
    },
  };
  return { sb, rpcCalls, rows };
}

// ── Fakes for the LC4 loop integration (#924) ────────────────────────────

function makePlan(rev: number, planId: string, file: string): DevPlan {
  return {
    plan_id: planId,
    revision: rev,
    goal: "edit + build + test",
    steps: [
      {
        id: "s1",
        kind: "code.edit",
        payload: { file, op: "set", content: `// ${planId}\n` },
      },
      { id: "s2", kind: "build.run", payload: {} },
      { id: "s3", kind: "test.run", payload: {} },
    ],
  };
}

interface FakeRow {
  id: string;
  status: string;
  blocked_reason: string | null;
  drift_report: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
}

/** A minimal Supabase fake supporting the surface the runtime + the
 *  drift detector + the recovery handler all hit:
 *    - `.schema("system").rpc("dispatch_execution_task", ...)`
 *    - `.schema("system").rpc("request_dev_replan", ...)`
 *    - `.schema("system").from("execution_tasks").select(...).eq("id", id).maybeSingle()`
 *    - `.schema("system").from("execution_tasks").update({...}).eq("id", id)`
 */
function makeFakeSb(builderTaskId: string, replanTaskId: string) {
  const rows = new Map<string, FakeRow>();
  rows.set(builderTaskId, {
    id: builderTaskId,
    status: "queued",
    blocked_reason: null,
    drift_report: null,
    payload: {},
  });
  rows.set(replanTaskId, {
    id: replanTaskId,
    status: "queued",
    blocked_reason: null,
    drift_report: null,
    payload: { plan: makePlan(2, "plan-rev-2", "src/foo.ts") },
  });
  const dispatchedChildren: Array<Record<string, unknown>> = [];
  let nextChild = 1;
  let replanCalls = 0;

  const rpc = vi.fn(async (fn: string, params: Record<string, unknown>) => {
    if (fn === "dispatch_execution_task") {
      const id = `child-${nextChild++}`;
      dispatchedChildren.push({ id, ...params });
      return { data: { id }, error: null };
    }
    if (fn === "request_dev_replan") {
      replanCalls++;
      expect(params.p_builder_task_id).toBe(builderTaskId);
      return { data: { replan_task_id: replanTaskId }, error: null };
    }
    throw new Error(`unexpected rpc ${fn}`);
  });

  function tableApi() {
    type Op = { kind: "select" | "update"; patch?: Record<string, unknown> };
    let op: Op = { kind: "select" };
    let filterId: string | null = null;
    const chain = {
      select(_cols: string) {
        op = { kind: "select" };
        return chain;
      },
      update(patch: Record<string, unknown>) {
        op = { kind: "update", patch };
        return chain;
      },
      eq(col: string, val: string) {
        if (col !== "id") throw new Error(`fake supports only .eq("id", ...)`);
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
        rpc,
        from(table: string) {
          if (table !== "execution_tasks") {
            throw new Error(`fake table ${table} not supported`);
          }
          return tableApi();
        },
      };
    },
  };
  return {
    sb,
    rpc,
    rows,
    dispatchedChildren,
    get replanCalls() {
      return replanCalls;
    },
  };
}

function hardReport(overrides?: Partial<DriftReport>): DriftReport {
  return {
    computed_at: "2026-04-17T00:00:00.000Z",
    current_branch: "agent-task-915-B",
    compared_against: ["agent-task-915-A"],
    overlaps: [
      {
        file: "smoke/conflict-target.md",
        other_ref: "agent-task-915-A",
        current_lines: [5, 8],
        other_lines: [5, 8],
      },
    ],
    severity: "hard",
    ...overrides,
  };
}

// ── formatMergeConflictReason (pure) ─────────────────────────────────────

describe("formatMergeConflictReason", () => {
  it("renders the canonical reason from the FIRST hard overlap", () => {
    const r = hardReport({
      overlaps: [
        {
          file: "a.ts",
          other_ref: "branch-A",
          current_lines: [1, 2],
          other_lines: [1, 2],
        },
        {
          file: "b.ts",
          other_ref: "branch-B",
          current_lines: [3, 4],
          other_lines: [3, 4],
        },
      ],
    });
    expect(formatMergeConflictReason(r)).toBe(
      "merge_conflict:overlap_with:branch-A",
    );
  });

  it("returns null for soft reports", () => {
    expect(
      formatMergeConflictReason(hardReport({ severity: "soft", overlaps: [] })),
    ).toBeNull();
  });

  it("returns null for none reports", () => {
    expect(
      formatMergeConflictReason(hardReport({ severity: "none", overlaps: [] })),
    ).toBeNull();
  });

  it("returns null when severity is hard but overlaps array is empty (defensive)", () => {
    expect(
      formatMergeConflictReason(hardReport({ overlaps: [] })),
    ).toBeNull();
  });

  it("supports `main@<sha>` style refs verbatim (LC7 emits these for merged commits)", () => {
    const r = hardReport({
      overlaps: [
        {
          file: "a.ts",
          other_ref: "main@deadbeefcafe",
          current_lines: [1, 1],
          other_lines: [1, 1],
        },
      ],
    });
    expect(formatMergeConflictReason(r)).toBe(
      "merge_conflict:overlap_with:main@deadbeefcafe",
    );
  });
});

// ── requestMergeConflictReplan (RPC) ─────────────────────────────────────

describe("requestMergeConflictReplan", () => {
  it("calls system.request_dev_replan with the exact reason and returns the new task id", async () => {
    const fake = createFakeSupabase();
    const result = await requestMergeConflictReplan({
      sb: fake.sb,
      builderTaskId: "builder-915",
      report: hardReport(),
    });
    expect(result).toEqual({
      replan_task_id: "replan-fake-1",
      reason: "merge_conflict:overlap_with:agent-task-915-A",
      conflict_ref: "agent-task-915-A",
    });
    expect(fake.rpcCalls).toEqual([
      {
        name: "request_dev_replan",
        args: {
          p_builder_task_id: "builder-915",
          p_reason: "merge_conflict:overlap_with:agent-task-915-A",
        },
      },
    ]);
  });

  it("returns null (and does NOT call the RPC) for soft reports", async () => {
    const fake = createFakeSupabase();
    const result = await requestMergeConflictReplan({
      sb: fake.sb,
      builderTaskId: "builder-915",
      report: hardReport({ severity: "soft", overlaps: [] }),
    });
    expect(result).toBeNull();
    expect(fake.rpcCalls).toEqual([]);
  });

  it("throws when the RPC returns an error", async () => {
    const fake = createFakeSupabase({
      rpc: async () => ({ data: null, error: { message: "rpc kaboom" } }),
    });
    await expect(
      requestMergeConflictReplan({
        sb: fake.sb,
        builderTaskId: "builder-915",
        report: hardReport(),
      }),
    ).rejects.toThrow(/request_dev_replan_failed: rpc kaboom/);
  });

  it("throws when the RPC payload is missing replan_task_id", async () => {
    const fake = createFakeSupabase({
      rpc: async () => ({ data: { other: "x" }, error: null }),
    });
    await expect(
      requestMergeConflictReplan({
        sb: fake.sb,
        builderTaskId: "builder-915",
        report: hardReport(),
      }),
    ).rejects.toThrow(/did not return a replan_task_id/);
  });
});

// ── createMergeConflictRecoveryHandler (integration with runDevBuilderMerge) ─

describe("createMergeConflictRecoveryHandler · with runDevBuilderMerge", () => {
  const TASK_ID = "00000000-0000-0000-0000-000000000915";

  it("dispatches the replan RPC exactly once on a hard drift block", async () => {
    const fake = createFakeSupabase({
      rows: new Map([[
        TASK_ID,
        { id: TASK_ID, status: "queued", blocked_reason: null, drift_report: null },
      ]]),
    });
    const onReplanRequested = vi.fn();
    const handler = createMergeConflictRecoveryHandler({
      sb: fake.sb,
      builderTaskId: TASK_ID,
      onReplanRequested,
    });

    const mergePr = vi.fn<MergePrFn>(async () => ({}));

    const result = await runDevBuilderMerge({
      sb: fake.sb as unknown as Parameters<typeof runDevBuilderMerge>[0]["sb"],
      taskId: TASK_ID,
      currentBranch: "agent-task-915-B",
      currentChanges: [
        { file: "smoke/conflict-target.md", startLine: 5, endLine: 8 },
      ],
      fetchOthers: async () => [
        {
          ref: "agent-task-915-A",
          changes: [
            { file: "smoke/conflict-target.md", startLine: 5, endLine: 8 },
          ],
        },
      ],
      mergePr,
      onBlocked: handler,
    });

    expect(result.status).toBe("blocked_by_drift");
    expect(mergePr).not.toHaveBeenCalled();
    expect(fake.rpcCalls).toHaveLength(1);
    expect(fake.rpcCalls[0]).toEqual({
      name: "request_dev_replan",
      args: {
        p_builder_task_id: TASK_ID,
        p_reason: "merge_conflict:overlap_with:agent-task-915-A",
      },
    });
    expect(onReplanRequested).toHaveBeenCalledOnce();
    expect(onReplanRequested.mock.calls[0][0]).toMatchObject({
      reason: "merge_conflict:overlap_with:agent-task-915-A",
      conflict_ref: "agent-task-915-A",
      replan_task_id: "replan-fake-1",
    });

    // Row carries the LC7 block AND remains untouched by the recovery wiring
    // (the audit row write itself is owned by the RPC, not by the handler).
    const row = fake.rows.get(TASK_ID)!;
    expect(row.status).toBe("blocked");
    expect(row.blocked_reason).toBe(BLOCKED_BY_DRIFT_REASON);
  });

  it("does NOT dispatch the RPC when the merge step succeeds (no drift)", async () => {
    const fake = createFakeSupabase({
      rows: new Map([[
        TASK_ID,
        { id: TASK_ID, status: "queued", blocked_reason: null, drift_report: null },
      ]]),
    });
    const onReplanRequested = vi.fn();
    const handler = createMergeConflictRecoveryHandler({
      sb: fake.sb,
      builderTaskId: TASK_ID,
      onReplanRequested,
    });

    const mergePr = vi.fn<MergePrFn>(async () => ({ pr_number: 1 }));
    const result = await runDevBuilderMerge({
      sb: fake.sb as unknown as Parameters<typeof runDevBuilderMerge>[0]["sb"],
      taskId: TASK_ID,
      currentBranch: "agent-task-915-B",
      currentChanges: [
        { file: "smoke/conflict-target.md", startLine: 5, endLine: 8 },
      ],
      fetchOthers: async () => [],
      mergePr,
      onBlocked: handler,
    });

    expect(result.status).toBe("merged");
    expect(mergePr).toHaveBeenCalledOnce();
    expect(fake.rpcCalls).toEqual([]);
    expect(onReplanRequested).not.toHaveBeenCalled();
  });

  it("swallows RPC failures and reports them via onReplanFailed (row stays BLOCKED_BY_DRIFT)", async () => {
    const fake = createFakeSupabase({
      rows: new Map([[
        TASK_ID,
        { id: TASK_ID, status: "queued", blocked_reason: null, drift_report: null },
      ]]),
      rpc: async () => ({ data: null, error: { message: "planner offline" } }),
    });
    const onReplanRequested = vi.fn();
    const onReplanFailed = vi.fn();
    const handler = createMergeConflictRecoveryHandler({
      sb: fake.sb,
      builderTaskId: TASK_ID,
      onReplanRequested,
      onReplanFailed,
    });

    const mergePr = vi.fn<MergePrFn>(async () => ({}));
    const result = await runDevBuilderMerge({
      sb: fake.sb as unknown as Parameters<typeof runDevBuilderMerge>[0]["sb"],
      taskId: TASK_ID,
      currentBranch: "agent-task-915-B",
      currentChanges: [
        { file: "smoke/conflict-target.md", startLine: 5, endLine: 8 },
      ],
      fetchOthers: async () => [
        {
          ref: "agent-task-915-A",
          changes: [
            { file: "smoke/conflict-target.md", startLine: 5, endLine: 8 },
          ],
        },
      ],
      mergePr,
      onBlocked: handler,
    });

    expect(result.status).toBe("blocked_by_drift");
    expect(mergePr).not.toHaveBeenCalled();
    expect(onReplanRequested).not.toHaveBeenCalled();
    expect(onReplanFailed).toHaveBeenCalledOnce();
    expect(onReplanFailed.mock.calls[0][0].message).toMatch(/planner offline/);

    const row = fake.rows.get(TASK_ID)!;
    expect(row.status).toBe("blocked");
    expect(row.blocked_reason).toBe(BLOCKED_BY_DRIFT_REASON);
  });
});

// ── createMergeConflictAuditHandler (loop-side audit, no RPC) ───────────

describe("LC4 · createMergeConflictAuditHandler", () => {
  it("appends a structured audit entry to the builder row payload", async () => {
    const builderTaskId = "00000000-0000-0000-0000-000000000924";
    const fake = makeFakeSb(builderTaskId, "00000000-0000-0000-0000-00000000bbbb");
    const handler = createMergeConflictAuditHandler({
      sb: fake.sb,
      builderTaskId,
    });
    await handler({
      currentBranch: "agent-task-924",
      severity: "hard",
      overlaps: [
        {
          file: "src/foo.ts",
          ranges: [{ startLine: 10, endLine: 20 }],
          others: [{ ref: "main@x", ranges: [{ startLine: 15, endLine: 25 }] }],
        },
      ],
      // deno-lint-ignore no-explicit-any
    } as any);
    const row = fake.rows.get(builderTaskId)!;
    const history =
      (row.payload as { merge_conflict_recovery?: unknown[] } | null)
        ?.merge_conflict_recovery;
    expect(Array.isArray(history)).toBe(true);
    expect(history!).toHaveLength(1);
    expect(history![0]).toMatchObject({
      kind: "merge_conflict_recovery",
      builder_task_id: builderTaskId,
      severity: "hard",
      overlaps: 1,
      reason: "hard_overlap:1",
    });
  });

  it("never throws even if the persistence write fails", async () => {
    const sb = {
      schema: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
          update: () => ({ eq: async () => ({ error: { message: "boom" } }) }),
        }),
      }),
    };
    const handler = createMergeConflictAuditHandler({
      sb,
      builderTaskId: "x",
    });
    // deno-lint-ignore no-explicit-any
    await expect(handler({ severity: "hard", overlaps: [] } as any)).resolves
      .toBeUndefined();
  });
});

// ── defaultComputeCurrentChanges (pure) ─────────────────────────────────

describe("LC4 · defaultComputeCurrentChanges", () => {
  it("collects every code.edit file across iterations exactly once", () => {
    const changes = defaultComputeCurrentChanges({
      iterations: [
        {
          iteration: 1,
          planRevision: 1,
          children: [
            {
              iteration: 1,
              stepId: "s1",
              stepKind: "code.edit",
              childTaskId: "c1",
              outcome: {
                status: "succeeded",
                result: {
                  files: [
                    { path: "src/foo.ts", after: "v1" },
                    { path: "src/bar.ts", after: null },
                  ],
                },
              },
            },
          ],
          verifier: { status: "red", reason: "x" },
        },
        {
          iteration: 2,
          planRevision: 2,
          children: [
            {
              iteration: 2,
              stepId: "s1",
              stepKind: "code.edit",
              childTaskId: "c2",
              outcome: {
                status: "succeeded",
                result: { files: [{ path: "src/foo.ts", after: "v2" }] },
              },
            },
          ],
          verifier: { status: "green" },
        },
      ],
    });
    expect(changes).toHaveLength(2);
    const paths = changes.map((c) => c.file).sort();
    expect(paths).toEqual(["src/bar.ts", "src/foo.ts"]);
    for (const c of changes) {
      expect(c.startLine).toBe(1);
      expect(c.endLine).toBeGreaterThan(1000);
    }
  });

  it("returns [] when no successful code.edit step is present", () => {
    expect(defaultComputeCurrentChanges({ iterations: [] })).toEqual([]);
    expect(
      defaultComputeCurrentChanges({
        iterations: [
          {
            iteration: 1,
            planRevision: 1,
            children: [
              {
                iteration: 1,
                stepId: "s1",
                stepKind: "code.edit",
                childTaskId: "c1",
                outcome: { status: "failed", error: "x" },
              },
            ],
            verifier: { status: "red", reason: "x" },
          },
        ],
      }),
    ).toEqual([]);
  });
});

// ── createMergeConflictPreMergeCheck (drift gate) ───────────────────────

describe("LC4 · createMergeConflictPreMergeCheck", () => {
  it("returns ok when the drift detector reports no overlap", async () => {
    const builderTaskId = "00000000-0000-0000-0000-000000000aaa";
    const fake = makeFakeSb(builderTaskId, "00000000-0000-0000-0000-00000000bbb");
    const fetchOthers = vi.fn(
      async (): Promise<BranchChanges[]> => [
        { ref: "main@x", changes: [{ file: "src/other.ts", startLine: 1, endLine: 5 }] },
      ],
    );
    const onBlocked = vi.fn();
    const check = createMergeConflictPreMergeCheck({
      sb: fake.sb,
      builderTaskId,
      currentBranch: "agent-task-aaa",
      fetchOthers,
      onBlocked,
    });
    const verdict = await check({
      builderTaskId,
      planId: "plan-1",
      iteration: 1,
      iterations: [
        {
          iteration: 1,
          planRevision: 1,
          children: [
            {
              iteration: 1,
              stepId: "s1",
              stepKind: "code.edit",
              childTaskId: "c1",
              outcome: {
                status: "succeeded",
                result: { files: [{ path: "src/foo.ts", after: "x" }] },
              },
            },
          ],
          verifier: { status: "green" },
        },
      ],
    });
    expect(verdict).toEqual({ status: "ok" });
    expect(onBlocked).not.toHaveBeenCalled();
    expect(fetchOthers).toHaveBeenCalledOnce();
  });

  it("returns drift_conflict + fires onBlocked on a hard overlap", async () => {
    const builderTaskId = "00000000-0000-0000-0000-000000000aaa";
    const fake = makeFakeSb(builderTaskId, "00000000-0000-0000-0000-00000000bbb");
    const fetchOthers = vi.fn(
      async (): Promise<BranchChanges[]> => [
        {
          ref: "main@conflict",
          changes: [{ file: "src/foo.ts", startLine: 5, endLine: 50 }],
        },
      ],
    );
    const onBlocked = vi.fn();
    const check = createMergeConflictPreMergeCheck({
      sb: fake.sb,
      builderTaskId,
      currentBranch: "agent-task-aaa",
      fetchOthers,
      onBlocked,
    });
    const verdict = await check({
      builderTaskId,
      planId: "plan-1",
      iteration: 1,
      iterations: [
        {
          iteration: 1,
          planRevision: 1,
          children: [
            {
              iteration: 1,
              stepId: "s1",
              stepKind: "code.edit",
              childTaskId: "c1",
              outcome: {
                status: "succeeded",
                result: { files: [{ path: "src/foo.ts", after: "x" }] },
              },
            },
          ],
          verifier: { status: "green" },
        },
      ],
    });
    expect(verdict.status).toBe("drift_conflict");
    if (verdict.status !== "drift_conflict") throw new Error("type narrowing");
    expect(verdict.reason).toMatch(/hard_overlap:/);
    expect(onBlocked).toHaveBeenCalledOnce();
    // The drift detector also stamped BLOCKED_BY_DRIFT on the row.
    expect(fake.rows.get(builderTaskId)!.blocked_reason).toBe(
      BLOCKED_BY_DRIFT_REASON,
    );
  });

  it("short-circuits to ok when no code.edit files are aggregated", async () => {
    const builderTaskId = "00000000-0000-0000-0000-000000000aaa";
    const fake = makeFakeSb(builderTaskId, "00000000-0000-0000-0000-00000000bbb");
    const fetchOthers = vi.fn(async (): Promise<BranchChanges[]> => []);
    const check = createMergeConflictPreMergeCheck({
      sb: fake.sb,
      builderTaskId,
      currentBranch: "agent-task-aaa",
      fetchOthers,
    });
    const verdict = await check({
      builderTaskId,
      planId: "plan-1",
      iteration: 1,
      iterations: [],
    });
    expect(verdict).toEqual({ status: "ok" });
    expect(fetchOthers).not.toHaveBeenCalled();
  });
});

// ── End-to-end: runDevBuilderForPlan with merge-recovery wired in ──────

describe("LC4 · runDevBuilderForPlan with merge-conflict recovery (#924)", () => {
  it("hard overlap on iter 1 → request_dev_replan → rev-2 plan opens PR", async () => {
    const BUILDER_TASK_ID = "00000000-0000-0000-0000-000000000924";
    const REPLAN_TASK_ID = "00000000-0000-0000-0000-000000000bbb";
    const fake = makeFakeSb(BUILDER_TASK_ID, REPLAN_TASK_ID);

    // Each iteration: 3 children (code.edit, build.run, test.run).
    // All children succeed + verify, so the verifier is green and the
    // pre-merge gate is consulted on every iteration.
    const orchestrator = {
      async run(childTaskId: string): Promise<OrchestrationOutcomeLike> {
        const child = fake.dispatchedChildren.find(
          (c) => (c as { id: string }).id === childTaskId,
        )!;
        const taskType = (child as { p_type: string }).p_type;
        if (taskType === "code.edit") {
          return {
            taskId: childTaskId,
            finalStatus: "succeeded",
            verification: { status: "verified" },
            result: { files: [{ path: "src/foo.ts", after: "// edited\n" }] },
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

    // Drift detector fake: hard overlap on iteration 1, clean on iter 2+.
    let driftCallCount = 0;
    const fetchOthers = vi.fn(async (): Promise<BranchChanges[]> => {
      driftCallCount++;
      if (driftCallCount === 1) {
        return [
          {
            ref: "main@conflict",
            changes: [{ file: "src/foo.ts", startLine: 5, endLine: 50 }],
          },
        ];
      }
      return [];
    });

    // GitHub stubs for the eventual successful PR open on iter 2.
    const mergePrSpy = vi.fn();
    const fetchImpl = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        const u = typeof url === "string" ? url : url.toString();
        const m = (init?.method ?? "GET").toUpperCase();
        const json = (b: unknown, status = 200) =>
          new Response(JSON.stringify(b), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        if (m === "POST") mergePrSpy(u);
        if (m === "GET" && u.includes("/git/refs/heads/main")) {
          return json({ object: { sha: "base", type: "commit" } });
        }
        if (m === "GET" && u.includes("/git/commits/base")) {
          return json({ sha: "base", tree: { sha: "base-tree" } });
        }
        if (m === "POST" && u.endsWith("/git/blobs")) return json({ sha: "blob" });
        if (m === "POST" && u.endsWith("/git/trees")) return json({ sha: "tree" });
        if (m === "POST" && u.endsWith("/git/commits")) {
          return json({ sha: "commit", tree: { sha: "tree" } });
        }
        if (m === "GET" && u.includes("/git/refs/heads/agent-task-")) {
          return new Response("nf", { status: 404 });
        }
        if (m === "POST" && u.endsWith("/git/refs")) {
          return json({ ref: "refs/heads/x", object: { sha: "commit" } });
        }
        if (m === "GET" && u.includes("/pulls?state=open&head=")) return json([]);
        if (m === "POST" && u.endsWith("/pulls")) {
          return json({
            number: 924,
            html_url: "https://github.com/o/r/pull/924",
            head: { sha: "commit" },
          });
        }
        throw new Error(`unexpected ${m} ${u}`);
      },
    );

    const result = await runDevBuilderForPlan({
      // deno-lint-ignore no-explicit-any
      sb: fake.sb as any,
      orchestrator,
      builderTaskId: BUILDER_TASK_ID,
      initialPlan: makePlan(1, "plan-rev-1", "src/foo.ts"),
      maxIterations: 3,
      replanTickMs: 0,
      replanWaitMs: 50,
      merge: { fetchOthers },
      github: {
        pat: "ghp",
        repo: "owner/repo",
        baseBranch: "main",
        headBranch: `agent-task-${BUILDER_TASK_ID}`,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      },
    });

    // The loop did NOT stop at the blocked merge — it replanned.
    expect(result.status).toBe("merged");
    expect(result.iterations).toHaveLength(2);

    // Iteration 1 was converted to red via merge_conflict:hard_overlap.
    expect(result.iterations[0].verifier.status).toBe("red");
    if (result.iterations[0].verifier.status !== "red") {
      throw new Error("type narrowing");
    }
    expect(result.iterations[0].verifier.reason).toMatch(
      /^merge_conflict:hard_overlap:/,
    );

    // Iteration 2 is the rev-2 plan from request_dev_replan.
    expect(result.iterations[1].planRevision).toBe(2);
    expect(result.iterations[1].verifier.status).toBe("green");

    // request_dev_replan was actually invoked (no operator intervention).
    expect(fake.replanCalls).toBe(1);

    // The recovery audit landed on the builder row.
    const audit =
      (fake.rows.get(BUILDER_TASK_ID)!.payload as {
        merge_conflict_recovery?: Array<{ reason: string; severity: string }>;
      } | null)?.merge_conflict_recovery;
    expect(Array.isArray(audit)).toBe(true);
    expect(audit!.length).toBe(1);
    expect(audit![0].severity).toBe("hard");
    expect(audit![0].reason).toMatch(/hard_overlap:/);

    // The PR was opened exactly once — for the rev-2 plan.
    expect(result.pr_result?.number).toBe(924);
  });
});
