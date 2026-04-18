/**
 * Dependency-guard tests (task #1016).
 *
 * These tests are an in-memory mirror of the SQL function
 * `system.validate_task_dependency` so the two surfaces cannot drift.
 * If you add a new state to `ExecutionTaskStatus`, decide here whether it
 * is a legal blocker — and update the SQL `IN (...)` list to match.
 */

import { describe, expect, it } from "vitest";
import {
  ALLOWED_DEPENDENCY_STATES,
  checkDependency,
} from "../dependency-guard";
import type { ExecutionTaskStatus } from "../types";

const ALL_STATUSES: ExecutionTaskStatus[] = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "queued",
  "running",
  "succeeded",
  "failed",
  "blocked",
  "rolling_back",
  "rolled_back",
  "rollback_failed",
  "cancelled",
];

describe("checkDependency — allowed states", () => {
  for (const s of ALLOWED_DEPENDENCY_STATES) {
    it(`accepts blocker in state '${s}'`, () => {
      const r = checkDependency("00000000-0000-0000-0000-000000000001", s);
      expect(r.ok).toBe(true);
      expect(r.dependsOnStatus).toBe(s);
    });
  }
});

describe("checkDependency — rejected states", () => {
  const rejectedStates = ALL_STATUSES.filter(
    (s) => !ALLOWED_DEPENDENCY_STATES.includes(s),
  );

  for (const s of rejectedStates) {
    it(`rejects blocker in state '${s}' as DEPENDENCY_NOT_APPROVED`, () => {
      const r = checkDependency("00000000-0000-0000-0000-000000000001", s);
      expect(r.ok).toBe(false);
      expect(r.reasonCode).toBe("DEPENDENCY_NOT_APPROVED");
      expect(r.dependsOnStatus).toBe(s);
    });
  }
});

describe("checkDependency — structural rejections", () => {
  it("rejects null/undefined dependsOn as DEPENDENCY_NULL", () => {
    expect(checkDependency(null, "approved").reasonCode).toBe(
      "DEPENDENCY_NULL",
    );
    expect(checkDependency(undefined, "approved").reasonCode).toBe(
      "DEPENDENCY_NULL",
    );
    expect(checkDependency("", "approved").reasonCode).toBe(
      "DEPENDENCY_NULL",
    );
  });

  it("rejects unknown blocker (no status) as DEPENDENCY_NOT_FOUND", () => {
    const r = checkDependency(
      "00000000-0000-0000-0000-000000000001",
      null,
    );
    expect(r.ok).toBe(false);
    expect(r.reasonCode).toBe("DEPENDENCY_NOT_FOUND");
  });

  it("specifically refuses 'draft' (the deadlock that motivated #1016)", () => {
    const r = checkDependency(
      "00000000-0000-0000-0000-000000000001",
      "draft",
    );
    expect(r.ok).toBe(false);
    expect(r.reasonCode).toBe("DEPENDENCY_NOT_APPROVED");
  });

  it("specifically refuses 'cancelled' (terminal-but-no-result)", () => {
    const r = checkDependency(
      "00000000-0000-0000-0000-000000000001",
      "cancelled",
    );
    expect(r.ok).toBe(false);
    expect(r.reasonCode).toBe("DEPENDENCY_NOT_APPROVED");
  });
});

describe("ALLOWED_DEPENDENCY_STATES — exhaustive partition", () => {
  it("every ExecutionTaskStatus is either allowed or rejected (no gaps)", () => {
    for (const s of ALL_STATUSES) {
      const r = checkDependency("00000000-0000-0000-0000-000000000001", s);
      if (ALLOWED_DEPENDENCY_STATES.includes(s)) {
        expect(r.ok).toBe(true);
      } else {
        expect(r.ok).toBe(false);
      }
    }
  });
});
