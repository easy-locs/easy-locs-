/**
 * Shared types for the Autonomous Execution Layer (task #710).
 */

import type { RiskLevel } from "./risk-classification";

export type ExecutionTaskStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "BLOCKED";

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
