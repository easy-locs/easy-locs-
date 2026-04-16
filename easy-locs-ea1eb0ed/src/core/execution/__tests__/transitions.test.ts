/**
 * Phase-2 transition matrix tests (task #750).
 *
 * Mirrors the SQL `system.assert_task_transition` function. Both sides must
 * agree — if a row is added here without the SQL counterpart (or vice versa),
 * the orchestrator and dashboard will diverge on what's "legal".
 */

import { describe, expect, it } from "vitest";
import {
  TASK_TRANSITIONS,
  assertTaskTransition,
  isTerminalStatus,
} from "../transitions";
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
  "rolled_back",
  "cancelled",
];

describe("Phase-2 execution_tasks transition matrix", () => {
  it("covers every Phase-2 status as a key", () => {
    for (const s of ALL_STATUSES) {
      expect(TASK_TRANSITIONS[s]).toBeDefined();
    }
  });

  it("treats same-state writes as legal (no-op)", () => {
    for (const s of ALL_STATUSES) {
      expect(assertTaskTransition(s, s).ok).toBe(true);
    }
  });

  it("treats null/undefined old status as legal (insert path)", () => {
    expect(assertTaskTransition(null, "queued").ok).toBe(true);
    expect(assertTaskTransition(undefined, "draft").ok).toBe(true);
  });

  describe("happy-path orchestrator flow", () => {
    it("draft → queued → running → succeeded", () => {
      expect(assertTaskTransition("draft", "queued").ok).toBe(true);
      expect(assertTaskTransition("queued", "running").ok).toBe(true);
      expect(assertTaskTransition("running", "succeeded").ok).toBe(true);
    });

    it("pending_review → approved → queued → running → succeeded", () => {
      expect(assertTaskTransition("pending_review", "approved").ok).toBe(true);
      expect(assertTaskTransition("approved", "queued").ok).toBe(true);
      expect(assertTaskTransition("queued", "running").ok).toBe(true);
      expect(assertTaskTransition("running", "succeeded").ok).toBe(true);
    });

    it("running → failed → queued (retry) → running", () => {
      expect(assertTaskTransition("running", "failed").ok).toBe(true);
      expect(assertTaskTransition("failed", "queued").ok).toBe(true);
      expect(assertTaskTransition("queued", "running").ok).toBe(true);
    });

    it("running → failed → blocked (dead-letter)", () => {
      expect(assertTaskTransition("running", "failed").ok).toBe(true);
      expect(assertTaskTransition("failed", "blocked").ok).toBe(true);
    });

    it("blocked → queued (re-queue after manual unblock)", () => {
      expect(assertTaskTransition("blocked", "queued").ok).toBe(true);
    });

    it("failed → rolled_back and succeeded → rolled_back", () => {
      expect(assertTaskTransition("failed", "rolled_back").ok).toBe(true);
      expect(assertTaskTransition("succeeded", "rolled_back").ok).toBe(true);
    });
  });

  describe("forbidden transitions", () => {
    it("refuses succeeded → queued (no re-execution of completed work)", () => {
      const r = assertTaskTransition("succeeded", "queued");
      expect(r.ok).toBe(false);
      expect(r.reason).toMatch(/illegal/);
    });

    it("refuses succeeded → running, succeeded → failed", () => {
      expect(assertTaskTransition("succeeded", "running").ok).toBe(false);
      expect(assertTaskTransition("succeeded", "failed").ok).toBe(false);
    });

    it("refuses any transition out of rolled_back (terminal)", () => {
      for (const s of ALL_STATUSES) {
        if (s === "rolled_back") continue;
        expect(assertTaskTransition("rolled_back", s).ok).toBe(false);
      }
    });

    it("refuses any transition out of cancelled (terminal)", () => {
      for (const s of ALL_STATUSES) {
        if (s === "cancelled") continue;
        expect(assertTaskTransition("cancelled", s).ok).toBe(false);
      }
    });

    it("refuses queued → succeeded directly (must go through running)", () => {
      expect(assertTaskTransition("queued", "succeeded").ok).toBe(false);
      expect(assertTaskTransition("queued", "failed").ok).toBe(false);
    });

    it("refuses pending_review → running (must go through approved → queued)", () => {
      expect(assertTaskTransition("pending_review", "running").ok).toBe(false);
      expect(assertTaskTransition("pending_review", "queued").ok).toBe(false);
    });

    it("refuses draft → running (must go through queued)", () => {
      expect(assertTaskTransition("draft", "running").ok).toBe(false);
    });

    it("refuses approved → running (must go through queued)", () => {
      expect(assertTaskTransition("approved", "running").ok).toBe(false);
    });

    it("refuses rejected → queued (must restart via draft)", () => {
      expect(assertTaskTransition("rejected", "queued").ok).toBe(false);
      expect(assertTaskTransition("rejected", "running").ok).toBe(false);
    });
  });

  describe("terminal classification", () => {
    it("rolled_back and cancelled are terminal", () => {
      expect(isTerminalStatus("rolled_back")).toBe(true);
      expect(isTerminalStatus("cancelled")).toBe(true);
    });

    it("everything else has at least one successor", () => {
      for (const s of ALL_STATUSES) {
        if (s === "rolled_back" || s === "cancelled") continue;
        expect(isTerminalStatus(s)).toBe(false);
      }
    });
  });

  describe("matrix invariants", () => {
    it("every successor in the matrix is itself a known status", () => {
      const known = new Set<ExecutionTaskStatus>(ALL_STATUSES);
      for (const [from, successors] of Object.entries(TASK_TRANSITIONS)) {
        for (const to of successors) {
          expect(known.has(to)).toBe(true);
          // Self-loops are handled by the "same-state" short-circuit, not by
          // listing the status as its own successor — keeps the matrix clean.
          expect(to).not.toBe(from);
        }
      }
    });
  });
});
