/**
 * PaymentsAdapter — risk + approval policy resolver (task #926, L7 P1).
 *
 * All three governed payments task types are CRITICAL by classification
 * (`FINANCIAL_*` prefix in `src/core/execution/risk-classification.ts`).
 * They reach `pending_review` unless an explicit pre-approved policy profile
 * says otherwise. L7 does not author new policy profiles — it consumes the
 * ones already produced by L1/L2 (per agent-migration-inventory.md §6).
 */

import { PAYMENTS_TASK_TYPES, type PaymentsTaskType } from "./types.ts";

export interface PaymentsPolicy {
  riskLevel: "CRITICAL";
  requires_approval: boolean;
  approval_policy: "single_admin" | "dual_admin" | "auto";
  /** True when the task may execute without human approval (only via policy profile). */
  safeByPolicy: boolean;
}

export function resolvePaymentsPolicy(taskType: string): PaymentsPolicy | null {
  const t = taskType.toUpperCase() as PaymentsTaskType;
  if (
    t === PAYMENTS_TASK_TYPES.CHARGE ||
    t === PAYMENTS_TASK_TYPES.REFUND
  ) {
    return {
      riskLevel: "CRITICAL",
      requires_approval: true,
      approval_policy: "single_admin",
      safeByPolicy: false,
    };
  }
  if (t === PAYMENTS_TASK_TYPES.PAYOUT) {
    return {
      riskLevel: "CRITICAL",
      requires_approval: true,
      // Payouts move money externally and cannot be unilaterally approved.
      approval_policy: "dual_admin",
      safeByPolicy: false,
    };
  }
  return null;
}

/**
 * Per-payment / per-payout exclusive lock so concurrent dispatches against
 * the same row serialise.
 */
export function paymentsLockKey(taskType: string, entityId: string): string {
  return `payments:${taskType.toUpperCase()}:${entityId}`;
}

/**
 * Deterministic idempotency key derived from (task_type, entityId,
 * payload_hash). The orchestrator uses this to collapse byte-identical
 * dispatches without losing semantically distinct ones (e.g. a retry after
 * a partial provider failure).
 */
export function paymentsIdempotencyKey(
  taskType: string,
  entityId: string,
  payloadHash: string,
): string {
  return `${taskType.toUpperCase()}::${entityId}::${payloadHash}`;
}

/**
 * Stable, dependency-free FNV-1a 32-bit hash. Works under both Deno and
 * Vitest without crypto/subtle. Identical contract to marketplace adapter.
 */
export function hashPayload(input: unknown): string {
  const s = typeof input === "string" ? input : JSON.stringify(input ?? "");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
