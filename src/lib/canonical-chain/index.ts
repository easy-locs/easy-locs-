/**
 * CANONICAL CHAIN — The single enforced data flow for the entire app.
 *
 * UI → Store canonique → Service canonique → Queue/Optimistic → API/Realtime → Normalizer → Store
 *
 * This module re-exports all canonical infrastructure pieces and defines
 * the enforced chain contract. Any path that bypasses this chain is a violation.
 */

// ── 1. Canonical Entities ──
export type {
  NormalizedMessage,
  NormalizedConversation,
  NormalizedCallSession,
  NormalizedUser,
} from "@/lib/normalizers";

// ── 2. Normalizers (gate between raw data and stores) ──
export {
  normalizeMessage,
  normalizeConversation,
  normalizeCallSession,
  normalizeUser,
} from "@/lib/normalizers";

// ── 3. State Machines (enforce valid transitions only) ──
export {
  MESSAGE_MACHINE,
  CALL_MACHINE,
  UPLOAD_MACHINE,
  transition,
} from "@/lib/state-machines/canonical-machines";
export type { MessageState, CallState, UploadState } from "@/lib/state-machines/canonical-machines";

// ── 4. Canonical IDs ──
export { mapLegacyIds, isValidUUID } from "@/types/canonical-ids";

// ── 5. Identity ──
export { getCanonicalIdentity, invalidateIdentityCache, peekIdentity } from "@/lib/canonical-identity";

// ── 6. Priority Queue ──
export { enqueueAction, PRIORITY_PRESETS, priorityQueue } from "@/lib/queue/priority-queue";

// ── 7. Network ──
export { connectionManager } from "@/lib/network/connection-manager";
export { getNetworkProfile, getAdaptiveSettings } from "@/lib/network/network-adapter";
export { fallbackSystem } from "@/lib/network/fallback-system";

// ── 8. Sync ──
export { startClockSync, getCorrectedTimestamp } from "@/lib/sync/time-sync";
export { backgroundSync } from "@/lib/sync/background-sync";

// ── 9. Dedup ──
export {
  isMessageDuplicate,
  markMessageSeen,
  generateIdempotencyKey,
  reconcileTempToServer,
  deduplicateMessages,
} from "@/lib/dedup/message-dedup";

// ── 10. Memory ──
export { memoryManager } from "@/lib/performance/memory-manager";
export { prefetchEngine } from "@/lib/performance/prefetch-engine";

// ── Chain Enforcement Types ──

/**
 * CanonicalWriteCommand — Every write MUST be expressed as a command.
 * UI never writes directly; it dispatches a command.
 */
export interface CanonicalWriteCommand {
  kind: string;
  idempotencyKey: string;
  priority: "critical" | "high" | "medium" | "low";
  payload: unknown;
}

/**
 * CanonicalWriteResult — Every write returns a typed result.
 */
export interface CanonicalWriteResult {
  ok: boolean;
  id?: string;
  tempId?: string;
  error?: string;
}

/**
 * CHAIN RULES (enforced by audit script):
 *
 * 1. Components NEVER import from @/integrations/supabase/client
 * 2. Components NEVER call .insert() / .update() / .upsert() / .delete()
 * 3. All writes go through families/orbit-dispatch or domain services
 * 4. All realtime events pass through normalizers before store merge
 * 5. All stores have exactly ONE owner per domain
 * 6. State transitions respect canonical machines
 * 7. Every write has an idempotencyKey
 * 8. tempId → serverId reconciliation is mandatory
 */
export const CHAIN_RULES = {
  NO_DIRECT_DB_IN_UI: "Components must not import supabase client or call DB methods directly",
  SINGLE_WRITE_PATH: "Each domain has exactly one write service",
  NORMALIZE_BEFORE_STORE: "All data passes through normalizer before store insertion",
  MACHINE_TRANSITIONS: "State changes must use canonical state machine transitions",
  IDEMPOTENCY_REQUIRED: "Critical writes must have idempotency keys",
  SINGLE_REALTIME_LISTENER: "One realtime subscription per domain per resource",
  OPTIMISTIC_RECONCILE: "tempId must reconcile to serverId on ack",
} as const;
