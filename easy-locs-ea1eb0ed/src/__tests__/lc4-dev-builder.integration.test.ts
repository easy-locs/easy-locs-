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
