/**
 * Type-level tests for the v2 DispatchTaskRequest shape (task #750).
 *
 * These don't assert runtime behaviour — they assert the v2 governance fields
 * are present and optional, so legacy Phase-1 callers continue to compile and
 * Phase-2 callers can supply the new fields.
 */

import { describe, expect, it } from "vitest";
import type {
  DispatchTaskRequest,
  ExecutionTaskRow,
  ExecutionTaskStatus,
  ApprovalPolicy,
} from "../types";

describe("DispatchTaskRequest v2 surface", () => {
  it("accepts a Phase-1-style request with no v2 fields", () => {
    const req: DispatchTaskRequest = {
      type: "ANALYSIS",
      domain: "data",
    };
    expect(req.type).toBe("ANALYSIS");
  });

  it("accepts a v2 request carrying every governance field", () => {
    const req: DispatchTaskRequest = {
      type: "ANALYSIS",
      domain: "data",
      payload: { foo: 1 },
      requestedBy: "tester",
      approvedBy: "admin@example.com",
      idempotencyKey: "test:1:run",
      rootTaskId: "00000000-0000-0000-0000-000000000000",
      correlationId: "corr-123",
      entityType: "listing",
      entityId: "abc-123",
      approvalPolicy: "single_admin" satisfies ApprovalPolicy,
      requiresApproval: true,
      retryPolicy: { max: 5, backoffMs: 1000 },
    };
    expect(req.requiresApproval).toBe(true);
    expect(req.approvalPolicy).toBe("single_admin");
  });
});

describe("ExecutionTaskRow v2 surface", () => {
  it("compiles with every v2 field present and typed", () => {
    const row: ExecutionTaskRow = {
      id: "00000000-0000-0000-0000-000000000000",
      type: "ANALYSIS",
      domain: "data",
      risk_level: "SAFE",
      status: "queued" satisfies ExecutionTaskStatus,
      payload: {},
      result: null,
      error: null,
      requested_by: "system",
      parent_task_id: null,
      attempt_count: 0,
      max_attempts: 3,
      blocked_reason: null,
      approved_by: null,
      approved_at: null,
      idempotency_key: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // v2
      root_task_id: null,
      correlation_id: null,
      entity_type: null,
      entity_id: null,
      approval_policy: "none",
      requires_approval: false,
      execution_state: null,
      rejected_by: null,
      escalated_by: null,
      locked_by: null,
      lock_key: null,
      validation_result: null,
      execution_result: null,
      rollback_result: null,
      retry_policy: null,
      error_code: null,
      started_at: null,
      completed_at: null,
      failed_at: null,
      rolled_back_at: null,
      next_retry_at: null,
    };

    // All eleven v2 statuses must be assignable to the enum.
    const statuses: ExecutionTaskStatus[] = [
      "draft", "pending_review", "approved", "rejected", "queued",
      "running", "succeeded", "failed", "blocked", "rolled_back", "cancelled",
    ];
    expect(statuses).toContain(row.status);
  });
});
