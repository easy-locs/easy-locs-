/**
 * LC7 (#874) — Drift detector integration tests.
 *
 * Two parallel dev tasks touch the same file. The second one runs the
 * pre-merge drift hook and MUST be transitioned to the existing
 * `blocked` status with `blocked_reason = 'BLOCKED_BY_DRIFT'` and a
 * structured `drift_report` JSONB attached.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  BLOCKED_BY_DRIFT_REASON,
  computeDriftReport,
  handlePreMergeDriftRequest,
  markDriftReplanRequested,
  markTaskBlockedByDrift,
  runPreMergeDriftCheck,
  type BranchChanges,
  type FileChange,
} from "../../supabase/functions/_shared/execution/drift-detector";

// ── In-memory fake Supabase client (only the surface drift-detector uses) ──
//
// The detector calls:
//   sb.schema("system").from("execution_tasks").update(patch).eq("id", id)
//   sb.schema("system").from("execution_tasks").select(...).eq("id", id).maybeSingle()
//
// Anything else the harness does NOT need to honour.

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
      select(cols: string) {
        op = { kind: "select", cols };
        return chain;
      },
      update(patch: Record<string, unknown>) {
        op = { kind: "update", patch };
        return chain;
      },
      eq(col: string, val: string) {
        if (col !== "id") throw new Error(`fake supports only .eq("id", ...) — got ${col}`);
        filterId = val;
        if (op.kind === "update") {
          // Update is terminal in this codebase: returns { error: null } shape.
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
          const r = rows.get(filterId)!;
          return Promise.resolve({ data: r, error: null });
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
    sb: sb as unknown as Parameters<typeof markTaskBlockedByDrift>[0],
    rows,
  };
}

// ── Pure-overlap algorithm tests ──────────────────────────────────────────

describe("LC7 · computeDriftReport (pure)", () => {
  const taskA: FileChange[] = [{ file: "src/foo.ts", startLine: 10, endLine: 20 }];

  it("returns severity=none when no shared file", () => {
    const others: BranchChanges[] = [
      { ref: "agent-task-1", changes: [{ file: "src/bar.ts", startLine: 1, endLine: 5 }] },
    ];
    const r = computeDriftReport("agent-task-2", taskA, others);
    expect(r.severity).toBe("none");
    expect(r.overlaps).toEqual([]);
    expect(r.compared_against).toEqual(["agent-task-1"]);
  });

  it("returns severity=soft when same file but disjoint line ranges", () => {
    const others: BranchChanges[] = [
      { ref: "agent-task-1", changes: [{ file: "src/foo.ts", startLine: 100, endLine: 110 }] },
    ];
    const r = computeDriftReport("agent-task-2", taskA, others);
    expect(r.severity).toBe("soft");
    expect(r.overlaps).toEqual([]);
  });

  it("returns severity=hard with overlap entry on intersecting ranges", () => {
    const others: BranchChanges[] = [
      { ref: "main@deadbeef", changes: [{ file: "src/foo.ts", startLine: 18, endLine: 22 }] },
    ];
    const r = computeDriftReport("agent-task-2", taskA, others);
    expect(r.severity).toBe("hard");
    expect(r.overlaps).toHaveLength(1);
    expect(r.overlaps[0]).toMatchObject({
      file: "src/foo.ts",
      other_ref: "main@deadbeef",
      current_lines: [10, 20],
      other_lines: [18, 22],
    });
  });

  it("normalizes reversed line bounds defensively", () => {
    const others: BranchChanges[] = [
      { ref: "x", changes: [{ file: "src/foo.ts", startLine: 22, endLine: 18 }] },
    ];
    const r = computeDriftReport("y", taskA, others);
    expect(r.severity).toBe("hard");
  });

  it("aggregates overlaps across multiple branches", () => {
    const others: BranchChanges[] = [
      { ref: "br1", changes: [{ file: "src/foo.ts", startLine: 19, endLine: 25 }] },
      { ref: "br2", changes: [{ file: "src/foo.ts", startLine: 5, endLine: 12 }] },
      { ref: "br3", changes: [{ file: "src/other.ts", startLine: 1, endLine: 9 }] },
    ];
    const r = computeDriftReport("cur", taskA, others);
    expect(r.overlaps.map((o) => o.other_ref).sort()).toEqual(["br1", "br2"]);
  });
});

// ── End-to-end pre-merge hook tests ──────────────────────────────────────

describe("LC7 · runPreMergeDriftCheck", () => {
  const TASK_ID = "00000000-0000-0000-0000-000000000874";
  let fake: ReturnType<typeof createFakeSupabase>;

  beforeEach(() => {
    fake = createFakeSupabase([
      { id: TASK_ID, status: "queued", blocked_reason: null, drift_report: null },
    ]);
  });

  it("scenario from task brief: two parallel dev tasks touching the same file → second is BLOCKED_BY_DRIFT", async () => {
    // Task A (already merged to main): edited src/foo.ts lines 10–20.
    // Task B (current): edits src/foo.ts lines 15–25.
    const result = await runPreMergeDriftCheck({
      sb: fake.sb,
      taskId: TASK_ID,
      currentBranch: "agent-task-B",
      currentChanges: [{ file: "src/foo.ts", startLine: 15, endLine: 25 }],
      fetchOthers: async () => [
        {
          ref: "main@taskA-sha",
          changes: [{ file: "src/foo.ts", startLine: 10, endLine: 20 }],
        },
      ],
    });

    expect(result.blocked).toBe(true);
    expect(result.persistError).toBeUndefined();
    expect(result.report.severity).toBe("hard");
    expect(result.report.overlaps).toHaveLength(1);

    const row = fake.rows.get(TASK_ID)!;
    expect(row.status).toBe("blocked");
    expect(row.blocked_reason).toBe(BLOCKED_BY_DRIFT_REASON);
    expect(row.drift_report).not.toBeNull();
    expect((row.drift_report as { severity: string }).severity).toBe("hard");
  });

  it("does NOT mutate the row when there is no hard overlap", async () => {
    const result = await runPreMergeDriftCheck({
      sb: fake.sb,
      taskId: TASK_ID,
      currentBranch: "agent-task-B",
      currentChanges: [{ file: "src/foo.ts", startLine: 100, endLine: 110 }],
      fetchOthers: async () => [
        {
          ref: "main@otherA",
          changes: [{ file: "src/unrelated.ts", startLine: 1, endLine: 5 }],
        },
      ],
    });

    expect(result.blocked).toBe(false);
    const row = fake.rows.get(TASK_ID)!;
    expect(row.status).toBe("queued");
    expect(row.blocked_reason).toBeNull();
    expect(row.drift_report).toBeNull();
  });

  it("markTaskBlockedByDrift is idempotent", async () => {
    const report = computeDriftReport(
      "br",
      [{ file: "f", startLine: 1, endLine: 2 }],
      [{ ref: "o", changes: [{ file: "f", startLine: 1, endLine: 2 }] }],
    );
    const r1 = await markTaskBlockedByDrift(fake.sb, TASK_ID, report);
    const r2 = await markTaskBlockedByDrift(fake.sb, TASK_ID, report);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    const row = fake.rows.get(TASK_ID)!;
    expect(row.status).toBe("blocked");
    expect(row.blocked_reason).toBe(BLOCKED_BY_DRIFT_REASON);
  });
});

// ── End-to-end: builder → callback PRE_MERGE gate ───────────────────────
//
// The runner has only one path back to the orchestrator: HTTP POST to
// execution-runner-callback. The PRE_MERGE branch of that callback
// delegates to `handlePreMergeDriftRequest`, which is what we exercise
// here — this is the actual server-side merge gate the LC4 builder must
// pass through. Two parallel dev tasks → second is BLOCKED_BY_DRIFT
// before any merge happens.

describe("LC7 · handlePreMergeDriftRequest (callback gate)", () => {
  const TASK_A_ID = "00000000-0000-0000-0000-00000000A001";
  const TASK_B_ID = "00000000-0000-0000-0000-00000000B002";

  it("two parallel dev tasks touching the same file: A merges, B is blocked at the callback before merging", async () => {
    // Both tasks start queued.
    const fake = createFakeSupabase([
      { id: TASK_A_ID, status: "queued", blocked_reason: null, drift_report: null },
      { id: TASK_B_ID, status: "queued", blocked_reason: null, drift_report: null },
    ]);

    // Task A reaches PRE_MERGE first. No other branch has merged yet,
    // so the callback returns 200 { proceed: true } and A continues to merge.
    const responseA = await handlePreMergeDriftRequest(fake.sb, TASK_A_ID, {
      current_branch: "agent-task-A",
      current_changes: [{ file: "src/foo.ts", startLine: 10, endLine: 20 }],
      others: [],
    });
    expect(responseA.httpStatus).toBe(200);
    expect(responseA.proceed).toBe(true);
    expect(responseA.body).toMatchObject({ proceed: true });
    expect(fake.rows.get(TASK_A_ID)!.status).toBe("queued");

    // Task A merges; main is now ahead by A's changes.
    const mainAfterA: BranchChanges = {
      ref: "main@taskA-merged-sha",
      changes: [{ file: "src/foo.ts", startLine: 10, endLine: 20 }],
    };

    // Task B reaches PRE_MERGE — overlaps A's lines on the same file.
    const responseB = await handlePreMergeDriftRequest(fake.sb, TASK_B_ID, {
      current_branch: "agent-task-B",
      current_changes: [{ file: "src/foo.ts", startLine: 15, endLine: 25 }],
      others: [mainAfterA],
    });

    // Callback rejects with HTTP 409 and a structured drift_report.
    expect(responseB.httpStatus).toBe(409);
    expect(responseB.proceed).toBe(false);
    expect(responseB.body).toMatchObject({
      proceed: false,
      blocked_reason: BLOCKED_BY_DRIFT_REASON,
    });
    const reportInBody = (responseB.body as { drift_report: { severity: string; overlaps: unknown[] } })
      .drift_report;
    expect(reportInBody.severity).toBe("hard");
    expect(reportInBody.overlaps).toHaveLength(1);

    // AND the row is transitioned BEFORE any merge happens.
    const rowB = fake.rows.get(TASK_B_ID)!;
    expect(rowB.status).toBe("blocked");
    expect(rowB.blocked_reason).toBe(BLOCKED_BY_DRIFT_REASON);
    expect((rowB.drift_report as { severity: string }).severity).toBe("hard");
  });

  it("returns HTTP 400 when the runner forgets the pre_merge payload", async () => {
    const fake = createFakeSupabase([
      { id: TASK_A_ID, status: "queued", blocked_reason: null, drift_report: null },
    ]);
    const r = await handlePreMergeDriftRequest(fake.sb, TASK_A_ID, null);
    expect(r.httpStatus).toBe(400);
    expect(r.proceed).toBe(false);
    expect(fake.rows.get(TASK_A_ID)!.status).toBe("queued");
  });

  it("returns HTTP 400 when current_branch is missing", async () => {
    const fake = createFakeSupabase([
      { id: TASK_A_ID, status: "queued", blocked_reason: null, drift_report: null },
    ]);
    const r = await handlePreMergeDriftRequest(fake.sb, TASK_A_ID, {
      current_branch: "",
      current_changes: [],
      others: [],
    });
    expect(r.httpStatus).toBe(400);
  });

  // Regression guards: the merge gate is the SOLE enforcement point right
  // now (LC4 builder not yet wired), so a runner sending a malformed or
  // missing `others` array MUST fail the request — not silently succeed
  // with no comparison data, which would let any branch merge.

  it("returns HTTP 400 when `others` is missing entirely", async () => {
    const fake = createFakeSupabase([
      { id: TASK_A_ID, status: "queued", blocked_reason: null, drift_report: null },
    ]);
    // Intentionally omit `others` to simulate a runner / builder bug.
    const r = await handlePreMergeDriftRequest(fake.sb, TASK_A_ID, {
      current_branch: "agent-task-A",
      current_changes: [{ file: "src/foo.ts", startLine: 1, endLine: 5 }],
    } as unknown as Parameters<typeof handlePreMergeDriftRequest>[2]);
    expect(r.httpStatus).toBe(400);
    expect(r.proceed).toBe(false);
    expect(fake.rows.get(TASK_A_ID)!.status).toBe("queued");
  });

  it("returns HTTP 400 when `others` is not an array", async () => {
    const fake = createFakeSupabase([
      { id: TASK_A_ID, status: "queued", blocked_reason: null, drift_report: null },
    ]);
    const r = await handlePreMergeDriftRequest(fake.sb, TASK_A_ID, {
      current_branch: "agent-task-A",
      current_changes: [{ file: "src/foo.ts", startLine: 1, endLine: 5 }],
      others: "not-an-array" as unknown as BranchChanges[],
    });
    expect(r.httpStatus).toBe(400);
    expect(r.proceed).toBe(false);
  });

  it("returns HTTP 400 when an `others` entry is malformed", async () => {
    const fake = createFakeSupabase([
      { id: TASK_A_ID, status: "queued", blocked_reason: null, drift_report: null },
    ]);
    const r = await handlePreMergeDriftRequest(fake.sb, TASK_A_ID, {
      current_branch: "agent-task-A",
      current_changes: [{ file: "src/foo.ts", startLine: 1, endLine: 5 }],
      // Missing `changes` array on the other-branch entry.
      others: [{ ref: "main@abc" } as unknown as BranchChanges],
    });
    expect(r.httpStatus).toBe(400);
    expect(r.proceed).toBe(false);
    expect(fake.rows.get(TASK_A_ID)!.status).toBe("queued");
  });

  it("returns HTTP 400 when an `others` entry has a non-string ref", async () => {
    const fake = createFakeSupabase([
      { id: TASK_A_ID, status: "queued", blocked_reason: null, drift_report: null },
    ]);
    const r = await handlePreMergeDriftRequest(fake.sb, TASK_A_ID, {
      current_branch: "agent-task-A",
      current_changes: [{ file: "src/foo.ts", startLine: 1, endLine: 5 }],
      others: [{ ref: 123, changes: [] } as unknown as BranchChanges],
    });
    expect(r.httpStatus).toBe(400);
  });
});

describe("LC7 · markDriftReplanRequested", () => {
  const TASK_ID = "00000000-0000-0000-0000-000000000875";

  it("stamps replan markers on a BLOCKED_BY_DRIFT row WITHOUT triggering LC4", async () => {
    const initialReport = {
      computed_at: "2026-04-30T12:00:00.000Z",
      current_branch: "br",
      compared_against: ["main"],
      overlaps: [],
      severity: "hard" as const,
    };
    const fake = createFakeSupabase([
      {
        id: TASK_ID,
        status: "blocked",
        blocked_reason: BLOCKED_BY_DRIFT_REASON,
        drift_report: initialReport,
      },
    ]);

    const r = await markDriftReplanRequested(fake.sb, TASK_ID, "admin-uuid-1");
    expect(r.ok).toBe(true);

    const row = fake.rows.get(TASK_ID)!;
    // Status MUST stay blocked — LC3 will pick this up via the timestamp,
    // and only LC3 may re-queue the task. LC7 never touches LC4 directly.
    expect(row.status).toBe("blocked");
    expect(row.blocked_reason).toBe(BLOCKED_BY_DRIFT_REASON);
    const report = row.drift_report as Record<string, unknown>;
    expect(report.replan_requested_by).toBe("admin-uuid-1");
    expect(typeof report.replan_requested_at).toBe("string");
    // Original fields preserved.
    expect(report.severity).toBe("hard");
    expect(report.current_branch).toBe("br");
  });

  it("refuses to stamp tasks that are not BLOCKED_BY_DRIFT", async () => {
    const fake = createFakeSupabase([
      { id: TASK_ID, status: "blocked", blocked_reason: "OTHER", drift_report: null },
    ]);
    const r = await markDriftReplanRequested(fake.sb, TASK_ID, "admin");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("task_not_blocked_by_drift");
  });

  it("refuses to stamp unknown task ids", async () => {
    const fake = createFakeSupabase([]);
    const r = await markDriftReplanRequested(fake.sb, "missing-uuid", "admin");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("task_not_found");
  });
});

// ── Static guards on the migration + module surface ──────────────────────

describe("LC7 · migration + module invariants", () => {
  it("migration adds the drift_report JSONB column", () => {
    const sql = readFileSync(
      "supabase/migrations/20260430000000_execution_tasks_drift_report.sql",
      "utf8",
    );
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS drift_report JSONB/);
    expect(sql).toMatch(/system\.execution_tasks/);
  });

  it("migration does NOT introduce a new execution_task_status enum value (reuses blocked)", () => {
    const sql = readFileSync(
      "supabase/migrations/20260430000000_execution_tasks_drift_report.sql",
      "utf8",
    );
    expect(sql).not.toMatch(/ALTER TYPE\s+system\.execution_task_status\s+ADD\s+VALUE/i);
  });

  it("drift-detector source never opens a network connection itself", () => {
    const src = readFileSync(
      "supabase/functions/_shared/execution/drift-detector.ts",
      "utf8",
    );
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/api\.github\.com/);
  });
});
