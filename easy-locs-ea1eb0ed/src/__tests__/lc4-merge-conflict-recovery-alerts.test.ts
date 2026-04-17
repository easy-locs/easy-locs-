/**
 * #973 — Tests for the merge-conflict recovery spike alert evaluator.
 *
 * `evaluateMergeConflictRecoveryAlerts` is the pure decision function
 * that the scheduled cron uses to decide when to wake operators. It is
 * critical that:
 *
 *   - It fires nothing on an empty / quiet summary.
 *   - It fires the daily-spike alert on the WORST day at-or-above the
 *     configured threshold (and only one of them — not one per day).
 *   - It fires the total-spike alert on a 14-day total at-or-above the
 *     configured threshold.
 *   - It fires the file-dominance alert when a single path crosses BOTH
 *     the absolute count floor AND the ratio floor.
 *   - Setting any threshold to 0 disables that alert family.
 *   - All three alert families can fire independently from the same
 *     summary.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLDS,
  evaluateMergeConflictRecoveryAlerts,
  type MergeConflictRecoverySummary,
} from "../repositories/merge-conflict-recovery.repository";

function summary(
  overrides: Partial<MergeConflictRecoverySummary> = {},
): MergeConflictRecoverySummary {
  return {
    events: [],
    totalEvents: overrides.totalEvents ?? 0,
    affectedTasks: overrides.affectedTasks ?? 0,
    perDay: overrides.perDay ?? [],
    topFiles: overrides.topFiles ?? [],
    ...overrides,
  };
}

describe("evaluateMergeConflictRecoveryAlerts", () => {
  it("returns no alerts on a quiet summary", () => {
    const out = evaluateMergeConflictRecoveryAlerts(
      summary({
        perDay: [
          { day: "2026-04-15", count: 0 },
          { day: "2026-04-16", count: 1 },
          { day: "2026-04-17", count: 2 },
        ],
        totalEvents: 3,
        affectedTasks: 2,
        topFiles: [{ file: "src/foo.ts", count: 2 }],
      }),
    );
    expect(out).toEqual([]);
  });

  it("uses default thresholds when none provided", () => {
    const out = evaluateMergeConflictRecoveryAlerts(
      summary({
        perDay: [
          { day: "2026-04-17", count: 11 }, // > default 10
        ],
        totalEvents: 11,
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.kind).toBe("daily_spike");
  });

  it("fires daily_spike on the WORST day, not once per breaching day", () => {
    const out = evaluateMergeConflictRecoveryAlerts(
      summary({
        perDay: [
          { day: "2026-04-15", count: 5 },
          { day: "2026-04-16", count: 9 }, // breaches
          { day: "2026-04-17", count: 12 }, // worst
        ],
        totalEvents: 26,
      }),
      { ...DEFAULT_MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLDS, dailyEventThreshold: 5 },
    );
    const daily = out.filter((a) => a.kind === "daily_spike");
    expect(daily).toHaveLength(1);
    expect(daily[0]!.data).toMatchObject({ day: "2026-04-17", count: 12 });
    expect(daily[0]!.severity).toBe("high");
  });

  it("fires total_spike when totalEvents reaches the threshold", () => {
    const out = evaluateMergeConflictRecoveryAlerts(
      summary({ totalEvents: 30, affectedTasks: 7 }),
      DEFAULT_MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLDS,
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.kind).toBe("total_spike");
    expect(out[0]!.data).toMatchObject({ total: 30, affectedTasks: 7 });
  });

  it("fires file_dominance only when BOTH count floor AND ratio floor are met", () => {
    // Ratio met but count floor not met → no alert.
    const ratioOnly = evaluateMergeConflictRecoveryAlerts(
      summary({
        totalEvents: 4,
        topFiles: [{ file: "src/a.ts", count: 3 }],
      }),
      { ...DEFAULT_MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLDS, totalEventsThreshold: 0 },
    );
    expect(ratioOnly.find((a) => a.kind === "file_dominance")).toBeUndefined();

    // Count floor met but ratio not met → no alert.
    const countOnly = evaluateMergeConflictRecoveryAlerts(
      summary({
        totalEvents: 100,
        topFiles: [{ file: "src/a.ts", count: 10 }],
      }),
      { ...DEFAULT_MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLDS, totalEventsThreshold: 0 },
    );
    expect(countOnly.find((a) => a.kind === "file_dominance")).toBeUndefined();

    // Both met → alert fires.
    const both = evaluateMergeConflictRecoveryAlerts(
      summary({
        totalEvents: 12,
        topFiles: [{ file: "src/a.ts", count: 8 }],
      }),
      { ...DEFAULT_MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLDS, totalEventsThreshold: 0 },
    );
    const dom = both.find((a) => a.kind === "file_dominance");
    expect(dom).toBeDefined();
    expect(dom!.data).toMatchObject({
      file: "src/a.ts",
      count: 8,
      total: 12,
    });
    expect(dom!.severity).toBe("high");
  });

  it("does not fire file_dominance when totalEvents is 0", () => {
    const out = evaluateMergeConflictRecoveryAlerts(
      summary({ totalEvents: 0, topFiles: [{ file: "src/a.ts", count: 0 }] }),
    );
    expect(out).toEqual([]);
  });

  it("treats a 0 threshold as 'disable this alert family'", () => {
    const out = evaluateMergeConflictRecoveryAlerts(
      summary({
        perDay: [{ day: "2026-04-17", count: 99 }],
        totalEvents: 99,
        topFiles: [{ file: "src/a.ts", count: 99 }],
      }),
      {
        dailyEventThreshold: 0,
        totalEventsThreshold: 0,
        topFileMinEvents: 0,
        topFileDominanceRatio: 0,
      },
    );
    expect(out).toEqual([]);
  });

  it("can fire all three alert families from a single summary", () => {
    const out = evaluateMergeConflictRecoveryAlerts(
      summary({
        perDay: [
          { day: "2026-04-15", count: 2 },
          { day: "2026-04-16", count: 5 },
          { day: "2026-04-17", count: 25 }, // daily spike
        ],
        totalEvents: 32, // total spike
        affectedTasks: 8,
        topFiles: [
          { file: "src/hot.ts", count: 20 }, // file dominance (20/32 ≈ 62.5%)
          { file: "src/cold.ts", count: 5 },
        ],
      }),
    );
    const kinds = out.map((a) => a.kind).sort();
    expect(kinds).toEqual(["daily_spike", "file_dominance", "total_spike"]);
  });

  it("respects custom ratio threshold for file dominance", () => {
    // 6/10 = 60%; with a 70% ratio floor and totals disabled it should not fire.
    const out = evaluateMergeConflictRecoveryAlerts(
      summary({
        totalEvents: 10,
        topFiles: [{ file: "src/a.ts", count: 6 }],
      }),
      {
        dailyEventThreshold: 0,
        totalEventsThreshold: 0,
        topFileMinEvents: 5,
        topFileDominanceRatio: 0.7,
      },
    );
    expect(out).toEqual([]);
  });
});
