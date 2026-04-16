/**
 * idempotencyService — Phase 2 idempotency primitives (task #751).
 *
 * Backed by `system.execution_tasks.idempotency_key` and the SECURITY DEFINER
 * RPCs `system.claim_idempotency_key` /
 * `system.find_existing_result_by_idempotency_key` introduced in
 * supabase/migrations/20260418500000_execution_locks_idempotency.sql.
 *
 * ## Contract
 * Every Phase-2 adapter MUST:
 *   1. Compute `computeIdempotencyKey(...)` from the *intent* of the call
 *      (task type + entity + payload), not from any server-side artefact.
 *   2. `claimIdempotencyKey(key, taskId)` BEFORE doing the mutation. If the
 *      claim returns `claimed: false`, call `findExistingResult(key)` and
 *      return that prior outcome verbatim — do not re-execute.
 *   3. Treat the key as the canonical de-dup token for retries: any retry
 *      with the same intent reuses the same key.
 */

import { supabase } from "@/integrations/supabase/client";
import type { ExecutionTaskStatus } from "./types";

const SYSTEM_SCHEMA = "system";

interface SystemRpcClient {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
}

function systemClient(): SystemRpcClient {
  return supabase.schema(SYSTEM_SCHEMA) as unknown as SystemRpcClient;
}

// ── Key derivation ────────────────────────────────────────────────────────
/** Stable JSON.stringify: keys sorted recursively for deterministic hashing. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/** SHA-256 hex digest using Web Crypto (available in browsers and Node ≥17). */
async function sha256Hex(input: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    // Defensive: fall back to a deterministic non-crypto hash. Keys are not
    // a security boundary — they are de-dup tokens — so this is acceptable
    // when subtle is unavailable (very old runtimes / sandboxes).
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `fnv1a_${(h >>> 0).toString(16).padStart(8, "0")}`;
  }
  const enc = new TextEncoder().encode(input);
  const digest = await subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface IdempotencyKeyInput {
  taskType: string;
  entityType: string;
  entityId: string;
  /**
   * Either a pre-computed payload hash, or the raw payload to hash. Both are
   * supported so callers that already have a stable digest don't need to
   * recompute it.
   */
  payload?: unknown;
  payloadHash?: string;
}

/**
 * Deterministic idempotency key.
 *
 * Format: `idem:<task_type>:<entity_type>:<entity_id>:<payload_hash>`
 *
 * The payload hash is a SHA-256 over a stable JSON serialisation, so semantically
 * identical payloads with re-ordered object keys collapse to the same key.
 */
export async function computeIdempotencyKey(
  input: IdempotencyKeyInput,
): Promise<string> {
  const norm = (s: string) => s.trim().toLowerCase();
  if (!input.taskType || !input.entityType || !input.entityId) {
    throw new Error(
      "computeIdempotencyKey: taskType, entityType and entityId are required",
    );
  }
  const hash =
    input.payloadHash?.trim() ||
    (await sha256Hex(stableStringify(input.payload ?? null)));
  return `idem:${norm(input.taskType)}:${norm(input.entityType)}:${input.entityId.trim()}:${hash}`;
}

// ── Claim ────────────────────────────────────────────────────────────────
export interface IdempotencyClaimResult {
  claimed: boolean;
  /**
   * - `claimed`         → newly bound to this task.
   * - `already_claimed` → key was already on this exact task (idempotent retry).
   * - `duplicate`       → another task already owns the key.
   * - `duplicate_race`  → unique-violation race; another task won.
   * - `task_has_different_key` → caller passed a task that already has a *different* key.
   * - `error`           → RPC failure (see `error`).
   */
  reason:
    | "claimed"
    | "already_claimed"
    | "duplicate"
    | "duplicate_race"
    | "task_has_different_key"
    | "error";
  winningTaskId: string | null;
  error?: string;
}

interface RawClaimRow {
  claimed: boolean;
  winning_task_id: string | null;
  reason: string | null;
}

export async function claimIdempotencyKey(
  key: string,
  taskId: string,
): Promise<IdempotencyClaimResult> {
  if (!key || !taskId) {
    return {
      claimed: false,
      reason: "error",
      winningTaskId: null,
      error: "key and taskId are required",
    };
  }

  const { data, error } = await systemClient().rpc("claim_idempotency_key", {
    p_key: key,
    p_task_id: taskId,
  });

  if (error) {
    return {
      claimed: false,
      reason: "error",
      winningTaskId: null,
      error: error.message,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as RawClaimRow | null;
  if (!row) {
    return {
      claimed: false,
      reason: "error",
      winningTaskId: null,
      error: "claim_idempotency_key returned no row",
    };
  }

  return {
    claimed: Boolean(row.claimed),
    reason: (row.reason ?? "error") as IdempotencyClaimResult["reason"],
    winningTaskId: row.winning_task_id ?? null,
  };
}

// ── Lookup ───────────────────────────────────────────────────────────────
export interface ExistingResult {
  taskId: string;
  status: ExecutionTaskStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RawExistingRow {
  task_id: string;
  status: ExecutionTaskStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export async function findExistingResult(
  key: string,
): Promise<{ found: boolean; existing: ExistingResult | null; error?: string }> {
  if (!key) {
    return { found: false, existing: null, error: "key is required" };
  }

  const { data, error } = await systemClient().rpc(
    "find_existing_result_by_idempotency_key",
    { p_key: key },
  );

  if (error) {
    return { found: false, existing: null, error: error.message };
  }

  const row = (Array.isArray(data) ? data[0] : data) as RawExistingRow | null;
  if (!row) {
    return { found: false, existing: null };
  }

  return {
    found: true,
    existing: {
      taskId: row.task_id,
      status: row.status,
      result: row.result,
      error: row.error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  };
}
