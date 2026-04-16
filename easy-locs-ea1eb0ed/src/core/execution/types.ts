/**
 * Shared types for the Autonomous Execution Layer.
 *
 * Phase 2 (task #750) — schema execution_tasks v2.
 * The status enum, transition matrix and v2 governance / traceability /
 * locking / verification fields are mirrored here so client code (dashboard,
 * dispatcher, orchestrator adapters, edge functions) stays in lock-step with
 * the SQL surface in `system.execution_tasks`.
 */

import type { RiskLevel } from "./risk-classification";

/** v2 lifecycle states — see migration 20260418500000_execution_tasks_v2.sql. */
export type ExecutionTaskStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "blocked"
  | "rolled_back"
  | "cancelled";

/** Approval-policy enum — bound by CHECK constraint in SQL. */
export type ApprovalPolicy = "none" | "single_admin" | "two_person" | "auto";

export interface ExecutionTaskRow {
  id: string;
  type: string;
  domain: string;
  risk_level: RiskLevel;
  status: ExecutionTaskStatus;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  requested_by: string;
  parent_task_id: string | null;
  attempt_count: number;
  max_attempts: number;
  blocked_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;

  // ── v2 additions (task #750) ────────────────────────────────────────────
  root_task_id: string | null;
  correlation_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  approval_policy: ApprovalPolicy;
  requires_approval: boolean;
  execution_state: string | null;
  rejected_by: string | null;
  escalated_by: string | null;
  locked_by: string | null;
  lock_key: string | null;
  validation_result: Record<string, unknown> | null;
  execution_result: Record<string, unknown> | null;
  rollback_result: Record<string, unknown> | null;
  retry_policy: Record<string, unknown> | null;
  error_code: string | null;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  rolled_back_at: string | null;
  next_retry_at: string | null;
}

/** Structured failure-class enum surfaced in engine_run_logs metadata. */
export type DispatchFailureClass =
  | "ok"
  | "blocked"
  | "validation_failed"
  | "rpc_failed"
  | "insert_failed";

export interface DispatchTaskRequest {
  type: string;
  domain: string;
  payload?: Record<string, unknown>;
  requestedBy?: string;
  parentTaskId?: string;
  maxAttempts?: number;
  approvedBy?: string;
  /**
   * Optional dispatcher-level idempotency key. When set, the server-side RPC
   * de-duplicates identical requests so double-clicks, retries and network
   * replays cannot create multiple execution_tasks rows. Recommended format:
   *   "<surface>:<entity-id>:<action>" (e.g. "review:abc-123:approve")
   */
  idempotencyKey?: string;

  // ── v2 governance / traceability fields (task #750) ─────────────────────
  rootTaskId?: string;
  correlationId?: string;
  entityType?: string;
  entityId?: string;
  approvalPolicy?: ApprovalPolicy;
  requiresApproval?: boolean;
  retryPolicy?: Record<string, unknown>;
}

export interface DispatchResult {
  ok: boolean;
  task: ExecutionTaskRow | null;
  riskLevel: RiskLevel;
  validation: ValidationOutcome;
  error?: string;
  failureClass: DispatchFailureClass;
}

export interface ValidationOutcome {
  valid: boolean;
  blocked: boolean;
  blockedReason: string | null;
  warnings: string[];
}
