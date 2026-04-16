/**
 * Risk Classification — Single Source of Truth
 *
 * Maps every known execution task type to a risk level. Unknown task types
 * are CRITICAL by default (deny-by-default).
 *
 * SAFE     → auto-runnable
 * MEDIUM   → approval-gated (optional approval, configurable per type)
 * CRITICAL → forbidden without explicit `approved_by` (manual authorization)
 *
 * Phase 1 of the Autonomous Execution Layer (task #710).
 */

export type RiskLevel = "SAFE" | "MEDIUM" | "CRITICAL";

export type ExecutionTaskType =
  // SAFE
  | "ANALYSIS"
  | "VALIDATION"
  | "RETRY"
  | "RESYNC"
  | "REPORT_GENERATION"
  | "INCIDENT_CLASSIFICATION"
  | "NON_SENSITIVE_DEDUP"
  | "READ_ONLY_QUERY"
  | "CACHE_REFRESH"
  // MEDIUM
  | "UI_FIX"
  | "NON_CRITICAL_DATA_FIX"
  | "REVIEW_QUEUE_RESOLUTION"
  | "NOTIFICATION_DISPATCH"
  | "NON_SENSITIVE_BULK_UPDATE"
  // CRITICAL
  | "WALLET_CREDIT"
  | "WALLET_DEBIT"
  | "WALLET_FREEZE"
  | "WALLET_TRANSFER"
  | "AUTH_GRANT"
  | "AUTH_REVOKE"
  | "AUTH_PASSWORD_RESET"
  | "SCHEMA_MIGRATION"
  | "DEPLOYMENT"
  | "CODE_PATCH"
  | "RLS_CHANGE"
  | "SECRET_ROTATION"
  | "USER_DELETION"
  | "FINANCIAL_PAYOUT"
  | "FINANCIAL_REFUND"
  | "FINANCIAL_CHARGE"
  | (string & {});

export const SAFE_TASK_TYPES: readonly string[] = [
  "ANALYSIS",
  "VALIDATION",
  "RETRY",
  "RESYNC",
  "REPORT_GENERATION",
  "INCIDENT_CLASSIFICATION",
  "NON_SENSITIVE_DEDUP",
  "READ_ONLY_QUERY",
  "CACHE_REFRESH",
] as const;

export const MEDIUM_TASK_TYPES: readonly string[] = [
  "UI_FIX",
  "NON_CRITICAL_DATA_FIX",
  "REVIEW_QUEUE_RESOLUTION",
  "NOTIFICATION_DISPATCH",
  "NON_SENSITIVE_BULK_UPDATE",
] as const;

/**
 * MEDIUM tasks are approval-gated *per type*. A `true` entry means the
 * task type requires an explicit `approved_by` (any non-empty, non-"system"
 * value) before it may leave PENDING. A `false` entry — or a missing entry —
 * means the type may run without approval.
 *
 * Defaults are deliberately conservative: the two MEDIUM types that touch
 * external recipients or affect many rows at once require approval; the
 * smaller-blast-radius types do not.
 *
 * Phase-1 design note: this map is the only place per-type MEDIUM gating is
 * defined. If a future task type needs approval, add it here — never inline
 * the rule at the call site.
 */
export const MEDIUM_TASK_APPROVAL_POLICY: Readonly<Record<string, boolean>> = {
  UI_FIX: false,
  NON_CRITICAL_DATA_FIX: false,
  REVIEW_QUEUE_RESOLUTION: false,
  NOTIFICATION_DISPATCH: true,
  NON_SENSITIVE_BULK_UPDATE: true,
};

/**
 * Returns true if the given MEDIUM task type requires an explicit approver.
 * Unknown / non-MEDIUM types return false (CRITICAL has its own hard gate;
 * SAFE never requires approval).
 */
export function mediumRequiresApproval(type: string): boolean {
  if (!type) return false;
  const t = type.trim().toUpperCase();
  return MEDIUM_TASK_APPROVAL_POLICY[t] === true;
}

/**
 * Explicit CRITICAL types. Anything matching the CRITICAL prefix patterns
 * (WALLET_*, AUTH_*, FINANCIAL_*) is also CRITICAL.
 */
export const CRITICAL_TASK_TYPES: readonly string[] = [
  "SCHEMA_MIGRATION",
  "DEPLOYMENT",
  "CODE_PATCH",
  "RLS_CHANGE",
  "SECRET_ROTATION",
  "USER_DELETION",
] as const;

const CRITICAL_PREFIXES: readonly string[] = [
  "WALLET_",
  "AUTH_",
  "FINANCIAL_",
];

/**
 * Classify a task type to its risk level.
 * Unknown types → CRITICAL (deny-by-default).
 */
export function classifyTaskType(type: string): RiskLevel {
  if (!type || typeof type !== "string") return "CRITICAL";
  const t = type.trim().toUpperCase();
  if (!t) return "CRITICAL";

  if (SAFE_TASK_TYPES.includes(t)) return "SAFE";
  if (MEDIUM_TASK_TYPES.includes(t)) return "MEDIUM";
  if (CRITICAL_TASK_TYPES.includes(t)) return "CRITICAL";
  if (CRITICAL_PREFIXES.some((p) => t.startsWith(p))) return "CRITICAL";

  // Deny-by-default: unknown task types are CRITICAL.
  return "CRITICAL";
}

/**
 * Returns true if the task type is recognized in the classification table.
 * Used by validation to flag unknown types in `blocked_reason`.
 */
export function isKnownTaskType(type: string): boolean {
  if (!type) return false;
  const t = type.trim().toUpperCase();
  if (
    SAFE_TASK_TYPES.includes(t) ||
    MEDIUM_TASK_TYPES.includes(t) ||
    CRITICAL_TASK_TYPES.includes(t)
  ) {
    return true;
  }
  return CRITICAL_PREFIXES.some((p) => t.startsWith(p));
}
