/**
 * MarketplaceAdapter — risk + approval policy resolver (task #754).
 *
 * Tied to the two pilot operations only. The dispatch RPC accepts both
 * `requires_approval` and `approval_policy`; this resolver returns the values
 * any caller (Edge Function, RPC, client) should pass when dispatching a
 * marketplace task.
 *
 *   publish   → MEDIUM, requires_approval = true,  policy = single_admin
 *   unpublish → MEDIUM, requires_approval = false, policy = auto (SAFE_BY_POLICY)
 */
import { MARKETPLACE_TASK_TYPES, type MarketplaceTaskType } from "./types.ts";

export interface MarketplacePolicy {
  riskLevel: "MEDIUM";
  requires_approval: boolean;
  approval_policy: "single_admin" | "auto";
  /** True when the task may execute without human approval. */
  safeByPolicy: boolean;
}

export function resolveMarketplacePolicy(taskType: string): MarketplacePolicy | null {
  const t = taskType.toUpperCase() as MarketplaceTaskType;
  if (t === MARKETPLACE_TASK_TYPES.PUBLISH) {
    return {
      riskLevel: "MEDIUM",
      requires_approval: true,
      approval_policy: "single_admin",
      safeByPolicy: false,
    };
  }
  if (t === MARKETPLACE_TASK_TYPES.UNPUBLISH) {
    return {
      riskLevel: "MEDIUM",
      requires_approval: false,
      approval_policy: "auto",
      safeByPolicy: true,
    };
  }
  return null;
}

/**
 * Deterministic lock key. The lock is per-listing so concurrent publish +
 * unpublish on the same listing serialise; cross-listing operations run in
 * parallel.
 */
export function marketplaceListingLockKey(listingId: string): string {
  return `marketplace:listing:${listingId}`;
}

/**
 * Deterministic idempotency key derived from (task_type, listingId,
 * payload_hash). When the dispatcher omits payload_hash we hash the full
 * payload so two byte-identical dispatches collapse, but two semantically
 * distinct dispatches (e.g. a republish after unpublish) do NOT.
 */
export function marketplaceIdempotencyKey(
  taskType: string,
  listingId: string,
  payloadHash: string,
): string {
  return `${taskType.toUpperCase()}::${listingId}::${payloadHash}`;
}

/**
 * Lightweight payload hash. Stable, dependency-free (FNV-1a 32-bit) so it
 * works under both Deno and Vitest without crypto/subtle availability.
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
