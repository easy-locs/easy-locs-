/**
 * LC4 — Dev Builder · merge-conflict recovery wiring tests (task #915).
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
  createMergeConflictRecoveryHandler,
  formatMergeConflictReason,
  requestMergeConflictReplan,
} from "../../supabase/functions/_shared/execution/builders/merge-conflict-recovery";
import {
  runDevBuilderMerge,
  type MergePrFn,
} from "../../supabase/functions/_shared/execution/builders/dev-builder";
import {
  BLOCKED_BY_DRIFT_REASON,
  type DriftReport,
} from "../../supabase/functions/_shared/execution/drift-detector";

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
