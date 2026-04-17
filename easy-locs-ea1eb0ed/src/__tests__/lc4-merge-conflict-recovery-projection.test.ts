/**
 * #953 — Tests for the merge-conflict recovery dashboard projection.
 *
 * `projectMergeConflictRecoverySummary` and the `normalizeAudit` helper
 * in `merge-conflict-recovery.repository.ts` are pure functions that
 * power the operator dashboard. They are critical: a regression here
 * (e.g. losing per-day bucketing when the audit envelope grows a new
 * field) silently corrupts what operators see, so we pin the
 * behaviour:
 *
 *   - perDay seeds 14 days oldest → newest, even when there are no
 *     events; events outside the window are kept in `events` /
 *     `totalEvents` but do NOT inflate any per-day bucket.
 *   - topFiles is capped at 5 entries, descending by count, and a file
 *     repeated within a single event counts only once.
 *   - `affectedTasks` counts unique `builder_task_id`s.
 *   - `normalizeAudit` drops malformed envelopes (non-objects, wrong
 *     `kind`, missing `at`, non-array `files`) and applies sane
 *     defaults for everything else.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type MergeConflictRecoveryEvent,
  normalizeAudit,
  projectMergeConflictRecoverySummary,
} from "../repositories/merge-conflict-recovery.repository";

// ── Helpers ───────────────────────────────────────────────────────────────

const FIXED_NOW = new Date("2026-04-17T12:00:00.000Z");

function dayOffsetIso(daysAgo: number, hour = 12): string {
  const d = new Date(FIXED_NOW.getTime() - daysAgo * 86_400_000);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

function makeEvent(
  overrides: Partial<MergeConflictRecoveryEvent> = {},
): MergeConflictRecoveryEvent {
  return {
    kind: "merge_conflict_recovery",
    task_id: overrides.task_id ?? "task-1",
    builder_task_id: overrides.builder_task_id ?? "task-1",
    at: overrides.at ?? dayOffsetIso(0),
    severity: overrides.severity ?? "hard",
    overlaps: overrides.overlaps ?? 1,
    files: overrides.files ?? ["src/foo.ts"],
    reason: overrides.reason ?? "hard_overlap:1",
  };
}

// ── projectMergeConflictRecoverySummary ───────────────────────────────────

describe("projectMergeConflictRecoverySummary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("seeds 14 zero-count days oldest → newest when events is empty", () => {
    const s = projectMergeConflictRecoverySummary([]);
    expect(s.events).toEqual([]);
    expect(s.totalEvents).toBe(0);
    expect(s.affectedTasks).toBe(0);
    expect(s.perDay).toHaveLength(14);
    expect(s.perDay.every((d) => d.count === 0)).toBe(true);
    // Oldest first → newest last.
    const days = s.perDay.map((d) => d.day);
    const sorted = [...days].sort();
    expect(days).toEqual(sorted);
    // Newest entry is today's UTC date.
    expect(s.perDay.at(-1)!.day).toBe(
      FIXED_NOW.toISOString().slice(0, 10),
    );
    expect(s.topFiles).toEqual([]);
  });

  it("buckets events into the correct UTC day", () => {
    const events = [
      makeEvent({ at: dayOffsetIso(0, 1), task_id: "a", builder_task_id: "a" }),
      makeEvent({ at: dayOffsetIso(0, 23), task_id: "b", builder_task_id: "b" }),
      makeEvent({ at: dayOffsetIso(3, 12), task_id: "c", builder_task_id: "c" }),
    ];
    const s = projectMergeConflictRecoverySummary(events);
    const today = FIXED_NOW.toISOString().slice(0, 10);
    const threeDaysAgo = new Date(FIXED_NOW.getTime() - 3 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const byDay = new Map(s.perDay.map((d) => [d.day, d.count]));
    expect(byDay.get(today)).toBe(2);
    expect(byDay.get(threeDaysAgo)).toBe(1);
    // All other days remain zero.
    expect(
      [...byDay.entries()]
        .filter(([day]) => day !== today && day !== threeDaysAgo)
        .every(([, c]) => c === 0),
    ).toBe(true);
  });

  it("respects the 14-day lookback boundary: old events stay in totals but not in perDay", () => {
    const inWindowEdge = makeEvent({
      at: dayOffsetIso(13, 0),
      task_id: "edge",
      builder_task_id: "edge",
    });
    const outsideWindow = makeEvent({
      at: dayOffsetIso(20, 0),
      task_id: "old",
      builder_task_id: "old",
    });
    const s = projectMergeConflictRecoverySummary([
      inWindowEdge,
      outsideWindow,
    ]);
    // Both are kept in events / totals (the projection is total-aware).
    expect(s.totalEvents).toBe(2);
    expect(s.affectedTasks).toBe(2);
    // perDay only ever has the seeded 14 days — the old event has no
    // matching bucket and silently does not inflate any day.
    expect(s.perDay).toHaveLength(14);
    const sumPerDay = s.perDay.reduce((a, d) => a + d.count, 0);
    expect(sumPerDay).toBe(1);
    const edgeDay = inWindowEdge.at.slice(0, 10);
    expect(s.perDay.find((d) => d.day === edgeDay)?.count).toBe(1);
  });

  it("top-files is capped at 5, descending by count", () => {
    const events: MergeConflictRecoveryEvent[] = [];
    // 7 distinct files, each appearing in N events where N = 7..1.
    const counts = [7, 6, 5, 4, 3, 2, 1];
    counts.forEach((n, idx) => {
      for (let i = 0; i < n; i++) {
        events.push(
          makeEvent({
            task_id: `t-${idx}-${i}`,
            builder_task_id: `t-${idx}-${i}`,
            files: [`src/f${idx}.ts`],
          }),
        );
      }
    });
    const s = projectMergeConflictRecoverySummary(events);
    expect(s.topFiles).toHaveLength(5);
    expect(s.topFiles.map((f) => f.count)).toEqual([7, 6, 5, 4, 3]);
    expect(s.topFiles.map((f) => f.file)).toEqual([
      "src/f0.ts",
      "src/f1.ts",
      "src/f2.ts",
      "src/f3.ts",
      "src/f4.ts",
    ]);
  });

  it("deduplicates files within a single event for top-files counting", () => {
    const s = projectMergeConflictRecoverySummary([
      makeEvent({
        task_id: "dup",
        builder_task_id: "dup",
        // A buggy audit might emit a file path twice — that must NOT
        // double-count in the leaderboard.
        files: ["src/dup.ts", "src/dup.ts", "src/dup.ts", "src/other.ts"],
      }),
      makeEvent({
        task_id: "second",
        builder_task_id: "second",
        files: ["src/dup.ts"],
      }),
    ]);
    const dup = s.topFiles.find((f) => f.file === "src/dup.ts");
    const other = s.topFiles.find((f) => f.file === "src/other.ts");
    // 2 distinct events touched src/dup.ts → count of 2, not 4.
    expect(dup?.count).toBe(2);
    expect(other?.count).toBe(1);
  });

  it("counts affectedTasks by unique builder_task_id (not by event count)", () => {
    const events = [
      makeEvent({ task_id: "row-1", builder_task_id: "B1" }),
      makeEvent({ task_id: "row-1", builder_task_id: "B1" }),
      makeEvent({ task_id: "row-2", builder_task_id: "B2" }),
    ];
    const s = projectMergeConflictRecoverySummary(events);
    expect(s.totalEvents).toBe(3);
    expect(s.affectedTasks).toBe(2);
  });

  it("preserves the input events array verbatim on the summary", () => {
    const events = [makeEvent()];
    const s = projectMergeConflictRecoverySummary(events);
    expect(s.events).toBe(events);
  });
});

// ── normalizeAudit ────────────────────────────────────────────────────────

describe("normalizeAudit", () => {
  const ROW_ID = "row-abc";

  it("returns null for non-object inputs", () => {
    expect(normalizeAudit(null, ROW_ID)).toBeNull();
    expect(normalizeAudit(undefined, ROW_ID)).toBeNull();
    expect(normalizeAudit("not-an-object", ROW_ID)).toBeNull();
    expect(normalizeAudit(42, ROW_ID)).toBeNull();
  });

  it("returns null when kind is wrong or missing", () => {
    expect(normalizeAudit({ at: "2026-04-17T00:00:00Z" }, ROW_ID)).toBeNull();
    expect(
      normalizeAudit({ kind: "something_else", at: "2026-04-17T00:00:00Z" }, ROW_ID),
    ).toBeNull();
  });

  it("returns null when `at` is missing or not a string", () => {
    expect(
      normalizeAudit({ kind: "merge_conflict_recovery" }, ROW_ID),
    ).toBeNull();
    expect(
      normalizeAudit({ kind: "merge_conflict_recovery", at: 12345 }, ROW_ID),
    ).toBeNull();
  });

  it("normalizes a fully-populated audit envelope verbatim", () => {
    const out = normalizeAudit(
      {
        kind: "merge_conflict_recovery",
        at: "2026-04-17T10:00:00.000Z",
        builder_task_id: "builder-xyz",
        severity: "soft",
        overlaps: 3,
        files: ["a.ts", "b.ts"],
        reason: "hard_overlap:3",
      },
      ROW_ID,
    );
    expect(out).toEqual({
      kind: "merge_conflict_recovery",
      task_id: ROW_ID,
      builder_task_id: "builder-xyz",
      at: "2026-04-17T10:00:00.000Z",
      severity: "soft",
      overlaps: 3,
      files: ["a.ts", "b.ts"],
      reason: "hard_overlap:3",
    });
  });

  it("falls back to row id for builder_task_id and to defaults for other fields", () => {
    const out = normalizeAudit(
      {
        kind: "merge_conflict_recovery",
        at: "2026-04-17T10:00:00.000Z",
      },
      ROW_ID,
    );
    expect(out).toMatchObject({
      task_id: ROW_ID,
      builder_task_id: ROW_ID, // missing → falls back to row id
      severity: "hard", // unknown → defaults to "hard"
      overlaps: 0,
      files: [],
      reason: "hard_overlap:0",
    });
  });

  it("clamps an unknown severity to `hard`", () => {
    const out = normalizeAudit(
      {
        kind: "merge_conflict_recovery",
        at: "2026-04-17T10:00:00.000Z",
        severity: "catastrophic",
      },
      ROW_ID,
    );
    expect(out?.severity).toBe("hard");
  });

  it("filters non-string entries out of the files array", () => {
    const out = normalizeAudit(
      {
        kind: "merge_conflict_recovery",
        at: "2026-04-17T10:00:00.000Z",
        files: ["a.ts", 42, null, { path: "b.ts" }, "c.ts"],
      },
      ROW_ID,
    );
    expect(out?.files).toEqual(["a.ts", "c.ts"]);
  });

  it("treats a non-array `files` as an empty list", () => {
    const out = normalizeAudit(
      {
        kind: "merge_conflict_recovery",
        at: "2026-04-17T10:00:00.000Z",
        files: "not-an-array",
      },
      ROW_ID,
    );
    expect(out?.files).toEqual([]);
  });

  it("synthesizes a reason from overlaps when none is provided", () => {
    const out = normalizeAudit(
      {
        kind: "merge_conflict_recovery",
        at: "2026-04-17T10:00:00.000Z",
        overlaps: 7,
      },
      ROW_ID,
    );
    expect(out?.reason).toBe("hard_overlap:7");
  });
});
