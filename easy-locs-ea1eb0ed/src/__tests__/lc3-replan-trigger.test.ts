/**
 * Task #881 — `lc3-replan-trigger` edge function unit tests.
 *
 * The trigger is the bridge between LC7 (operator clicks Replan, which
 * stamps `drift_report.replan_requested_at`) and LC3 (planner re-plans
 * against the current diff). Behaviour pinned here:
 *
 *   1. Selection contract is exact: status='blocked',
 *      blocked_reason='BLOCKED_BY_DRIFT', replan_requested_at present,
 *      replan_dispatched_at absent. Anything else MUST be ignored.
 *   2. Each candidate row goes through `system.dispatch_lc3_replan`
 *      via RPC — never a direct table mutation (control-plane
 *      invariant, see #812 + 20260418300000_execution_tasks.sql).
 *   3. Per-row RPC errors are isolated: one bad row never poisons the
 *      whole batch.
 *   4. `already_dispatched: true` outcomes are counted separately
 *      (idempotent re-runs are a non-event, not an error).
 *   5. `batchSize` is clamped to [1, 100] so a runaway caller can't
 *      starve the orchestrator.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { runLc3ReplanTrigger } from "../../supabase/functions/_shared/execution/lc3-replan-trigger.ts";

interface FakeRow {
  id: string;
  status: string;
  blocked_reason: string | null;
  drift_report: Record<string, unknown> | null;
}

interface RpcCall {
  fn: string;
  args: Record<string, unknown>;
}

interface SelectCall {
  table: string;
  filters: Record<string, unknown>;
  limit: number | null;
}

function createFakeSb(opts: {
  rows: FakeRow[];
  rpcResponder?: (taskId: string) => {
    data: unknown;
    error: { message: string } | null;
  };
  selectError?: { message: string } | null;
}) {
  const rpcCalls: RpcCall[] = [];
  const selectCalls: SelectCall[] = [];

  const rpcResponder =
    opts.rpcResponder ??
    ((taskId: string) => ({
      data: {
        ok: true,
        already_dispatched: false,
        original_task_id: taskId,
        replan_task_id: `replan-of-${taskId}`,
        dispatched_at: "2026-04-30T12:00:00.000Z",
      },
      error: null,
    }));

  function fromBuilder(table: string) {
    const filters: Record<string, unknown> = {};
    let limitVal: number | null = null;
    const builder = {
      select: (_cols: string) => builder,
      eq: (col: string, val: unknown) => {
        filters[`eq:${col}`] = val;
        return builder;
      },
      not: (col: string, op: string, val: unknown) => {
        filters[`not:${col}:${op}`] = val;
        return builder;
      },
      is: (col: string, val: unknown) => {
        filters[`is:${col}`] = val;
        return builder;
      },
      order: (_col: string, _opts: unknown) => builder,
      limit: (n: number) => {
        limitVal = n;
        selectCalls.push({ table, filters: { ...filters }, limit: limitVal });
        // Filter rows in-memory the same way Postgres would have.
        if (opts.selectError) {
          return Promise.resolve({ data: null, error: opts.selectError });
        }
        const data = opts.rows
          .filter(
            (r) =>
              r.status === filters["eq:status"] &&
              r.blocked_reason === filters["eq:blocked_reason"] &&
              !!(r.drift_report &&
                (r.drift_report as Record<string, unknown>)
                  .replan_requested_at) &&
              !(r.drift_report &&
                (r.drift_report as Record<string, unknown>)
                  .replan_dispatched_at),
          )
          .slice(0, limitVal ?? undefined)
          .map((r) => ({ id: r.id, drift_report: r.drift_report }));
        return Promise.resolve({ data, error: null });
      },
    };
    return builder;
  }

  return {
    sb: {
      schema: (_s: string) => ({
        from: (table: string) => fromBuilder(table),
        rpc: (fn: string, args: Record<string, unknown>) => {
          rpcCalls.push({ fn, args });
          const taskId = String(args.p_task_id ?? "");
          return Promise.resolve(rpcResponder(taskId));
        },
      }),
    },
    rpcCalls,
    selectCalls,
  };
}

const baseDriftReport = {
  current_branch: "agent-task-881",
  severity: "hard",
  overlaps: [],
  replan_requested_at: "2026-04-30T11:00:00.000Z",
  replan_requested_by: "admin-uuid",
};

describe("Task #881 · runLc3ReplanTrigger", () => {
  let env: ReturnType<typeof createFakeSb>;

  beforeEach(() => {
    env = createFakeSb({
      rows: [
        {
          id: "task-A",
          status: "blocked",
          blocked_reason: "BLOCKED_BY_DRIFT",
          drift_report: { ...baseDriftReport },
        },
        {
          id: "task-B-already-dispatched",
          status: "blocked",
          blocked_reason: "BLOCKED_BY_DRIFT",
          drift_report: {
            ...baseDriftReport,
            replan_dispatched_at: "2026-04-30T10:00:00.000Z",
            replan_task_id: "prior-replan",
          },
        },
        {
          id: "task-C-no-marker",
          status: "blocked",
          blocked_reason: "BLOCKED_BY_DRIFT",
          drift_report: { current_branch: "x", severity: "hard", overlaps: [] },
        },
        {
          id: "task-D-not-blocked",
          status: "queued",
          blocked_reason: null,
          drift_report: { ...baseDriftReport },
        },
        {
          id: "task-E-other-reason",
          status: "blocked",
          blocked_reason: "OTHER",
          drift_report: { ...baseDriftReport },
        },
      ],
    });
  });

  it("only selects status=blocked + BLOCKED_BY_DRIFT + replan_requested_at + no replan_dispatched_at", async () => {
    const out = await runLc3ReplanTrigger(env.sb);
    expect(env.selectCalls).toHaveLength(1);
    const call = env.selectCalls[0];
    expect(call.table).toBe("execution_tasks");
    expect(call.filters["eq:status"]).toBe("blocked");
    expect(call.filters["eq:blocked_reason"]).toBe("BLOCKED_BY_DRIFT");
    expect(call.filters["not:drift_report->>replan_requested_at:is"]).toBe(
      null,
    );
    expect(call.filters["is:drift_report->>replan_dispatched_at"]).toBe(null);
    // Only task-A matches the four-way filter.
    expect(out.scanned).toBe(1);
    expect(env.rpcCalls).toEqual([
      { fn: "dispatch_lc3_replan", args: { p_task_id: "task-A" } },
    ]);
    expect(out.dispatched).toBe(1);
    expect(out.already_dispatched).toBe(0);
    expect(out.errors).toBe(0);
    expect(out.results["task-A"]).toMatchObject({
      ok: true,
      replan_task_id: "replan-of-task-A",
    });
  });

  it("never bypasses the RPC choke-point (no direct table mutation)", async () => {
    // The fake builder only exposes select / eq / not / is / order / limit —
    // calling .update / .insert / .delete on it would throw. The fact that
    // the trigger completes proves the only mutation path is the RPC.
    const out = await runLc3ReplanTrigger(env.sb);
    expect(out.errors).toBe(0);
    expect(env.rpcCalls.every((c) => c.fn === "dispatch_lc3_replan")).toBe(
      true,
    );
  });

  it("counts already_dispatched outcomes separately from fresh dispatches", async () => {
    env = createFakeSb({
      rows: [
        {
          id: "task-X",
          status: "blocked",
          blocked_reason: "BLOCKED_BY_DRIFT",
          drift_report: { ...baseDriftReport },
        },
        {
          id: "task-Y",
          status: "blocked",
          blocked_reason: "BLOCKED_BY_DRIFT",
          drift_report: { ...baseDriftReport },
        },
      ],
      rpcResponder: (taskId) =>
        taskId === "task-Y"
          ? {
              data: {
                ok: true,
                already_dispatched: true,
                original_task_id: taskId,
                replan_task_id: "old-replan",
                dispatched_at: "2026-04-30T09:00:00.000Z",
              },
              error: null,
            }
          : {
              data: {
                ok: true,
                already_dispatched: false,
                original_task_id: taskId,
                replan_task_id: `fresh-${taskId}`,
                dispatched_at: "2026-04-30T12:00:00.000Z",
              },
              error: null,
            },
    });
    const out = await runLc3ReplanTrigger(env.sb);
    expect(out.scanned).toBe(2);
    expect(out.dispatched).toBe(1);
    expect(out.already_dispatched).toBe(1);
    expect(out.errors).toBe(0);
  });

  it("isolates per-row RPC failures so one bad row does not starve the batch", async () => {
    env = createFakeSb({
      rows: [
        {
          id: "good-1",
          status: "blocked",
          blocked_reason: "BLOCKED_BY_DRIFT",
          drift_report: { ...baseDriftReport },
        },
        {
          id: "bad-1",
          status: "blocked",
          blocked_reason: "BLOCKED_BY_DRIFT",
          drift_report: { ...baseDriftReport },
        },
        {
          id: "good-2",
          status: "blocked",
          blocked_reason: "BLOCKED_BY_DRIFT",
          drift_report: { ...baseDriftReport },
        },
      ],
      rpcResponder: (taskId) =>
        taskId === "bad-1"
          ? { data: null, error: { message: "constraint violation" } }
          : {
              data: {
                ok: true,
                already_dispatched: false,
                original_task_id: taskId,
                replan_task_id: `r-${taskId}`,
                dispatched_at: "2026-04-30T12:00:00.000Z",
              },
              error: null,
            },
    });
    const out = await runLc3ReplanTrigger(env.sb);
    expect(out.scanned).toBe(3);
    expect(out.dispatched).toBe(2);
    expect(out.errors).toBe(1);
    expect(out.results["bad-1"]).toEqual({
      ok: false,
      error: "constraint violation",
    });
    expect(out.results["good-1"].ok).toBe(true);
    expect(out.results["good-2"].ok).toBe(true);
  });

  it("surfaces a top-level scan error when the candidate read itself fails", async () => {
    env = createFakeSb({
      rows: [],
      selectError: { message: "permission denied for table execution_tasks" },
    });
    const out = await runLc3ReplanTrigger(env.sb);
    expect(out.scanned).toBe(0);
    expect(out.errors).toBe(1);
    expect(out.results.__scan__).toEqual({
      ok: false,
      error: "permission denied for table execution_tasks",
    });
  });

  it("clamps batchSize into [1, 100] so a runaway caller cannot exhaust the orchestrator", async () => {
    // Ask for 9999 — should be clamped to 100.
    await runLc3ReplanTrigger(env.sb, { batchSize: 9999 });
    expect(env.selectCalls[0].limit).toBe(100);
    // Ask for 0 — should be clamped to 1.
    env = createFakeSb({ rows: [] });
    await runLc3ReplanTrigger(env.sb, { batchSize: 0 });
    expect(env.selectCalls[0].limit).toBe(1);
  });
});
