/**
 * #981 — Tests for the operator-tunable cron alert thresholds.
 *
 * The thresholds row in `public.merge_conflict_alert_thresholds` feeds
 * `merge-conflict-recovery-alerts-cron` (task #973). The pure
 * normalizer in the repository is the single source of truth for
 * clamping operator-supplied values into the bounds the DB enforces
 * via CHECK constraints — so we exercise it exhaustively here.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLDS,
  MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLD_BOUNDS,
  normalizeMergeConflictRecoveryAlertThresholds,
} from "../repositories/merge-conflict-recovery.repository";

describe("normalizeMergeConflictRecoveryAlertThresholds", () => {
  it("returns defaults when input is null/undefined/empty", () => {
    expect(normalizeMergeConflictRecoveryAlertThresholds(null)).toEqual(
      DEFAULT_MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLDS,
    );
    expect(normalizeMergeConflictRecoveryAlertThresholds(undefined)).toEqual(
      DEFAULT_MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLDS,
    );
    expect(normalizeMergeConflictRecoveryAlertThresholds({})).toEqual(
      DEFAULT_MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLDS,
    );
  });

  it("preserves valid in-range integer thresholds", () => {
    const out = normalizeMergeConflictRecoveryAlertThresholds({
      dailyEventThreshold: 7,
      totalEventsThreshold: 25,
      topFileMinEvents: 3,
      topFileDominanceRatio: 0.65,
    });
    expect(out).toEqual({
      dailyEventThreshold: 7,
      totalEventsThreshold: 25,
      topFileMinEvents: 3,
      topFileDominanceRatio: 0.65,
    });
  });

  it("treats 0 as a valid disable signal (does not coerce to default)", () => {
    const out = normalizeMergeConflictRecoveryAlertThresholds({
      dailyEventThreshold: 0,
      totalEventsThreshold: 0,
      topFileMinEvents: 0,
      topFileDominanceRatio: 0,
    });
    expect(out).toEqual({
      dailyEventThreshold: 0,
      totalEventsThreshold: 0,
      topFileMinEvents: 0,
      topFileDominanceRatio: 0,
    });
  });

  it("clamps negative ints to the lower bound", () => {
    const out = normalizeMergeConflictRecoveryAlertThresholds({
      dailyEventThreshold: -5,
      totalEventsThreshold: -100,
      topFileMinEvents: -1,
      topFileDominanceRatio: -0.2,
    });
    expect(out.dailyEventThreshold).toBe(0);
    expect(out.totalEventsThreshold).toBe(0);
    expect(out.topFileMinEvents).toBe(0);
    expect(out.topFileDominanceRatio).toBe(0);
  });

  it("clamps oversized values to the upper bound", () => {
    const b = MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLD_BOUNDS;
    const out = normalizeMergeConflictRecoveryAlertThresholds({
      dailyEventThreshold: b.dailyEventThresholdMax + 1_000,
      totalEventsThreshold: b.totalEventsThresholdMax + 1_000,
      topFileMinEvents: b.topFileMinEventsMax + 1_000,
      topFileDominanceRatio: 5,
    });
    expect(out.dailyEventThreshold).toBe(b.dailyEventThresholdMax);
    expect(out.totalEventsThreshold).toBe(b.totalEventsThresholdMax);
    expect(out.topFileMinEvents).toBe(b.topFileMinEventsMax);
    expect(out.topFileDominanceRatio).toBe(b.topFileDominanceRatioMax);
  });

  it("floors fractional integer thresholds (matches DB INTEGER column)", () => {
    const out = normalizeMergeConflictRecoveryAlertThresholds({
      dailyEventThreshold: 7.9,
      totalEventsThreshold: 25.4,
      topFileMinEvents: 3.7,
      topFileDominanceRatio: 0.4,
    });
    expect(out.dailyEventThreshold).toBe(7);
    expect(out.totalEventsThreshold).toBe(25);
    expect(out.topFileMinEvents).toBe(3);
    expect(out.topFileDominanceRatio).toBe(0.4);
  });

  it("falls back to defaults on NaN / non-numeric input", () => {
    const out = normalizeMergeConflictRecoveryAlertThresholds({
      dailyEventThreshold: Number.NaN,
      totalEventsThreshold: Number.NaN,
      topFileMinEvents: Number.NaN,
      topFileDominanceRatio: Number.NaN,
    });
    expect(out).toEqual(DEFAULT_MERGE_CONFLICT_RECOVERY_ALERT_THRESHOLDS);
  });

  it("normalizes string-encoded numbers (PostgREST may return numeric as string)", () => {
    const out = normalizeMergeConflictRecoveryAlertThresholds({
      dailyEventThreshold: "12" as unknown as number,
      totalEventsThreshold: "40" as unknown as number,
      topFileMinEvents: "6" as unknown as number,
      topFileDominanceRatio: "0.75" as unknown as number,
    });
    expect(out).toEqual({
      dailyEventThreshold: 12,
      totalEventsThreshold: 40,
      topFileMinEvents: 6,
      topFileDominanceRatio: 0.75,
    });
  });
});
