/**
 * lockService — Phase 2 execution lock primitives (task #751).
 *
 * Backed by `system.execution_locks` and the SECURITY DEFINER RPCs in
 * supabase/migrations/20260418500000_execution_locks_idempotency.sql.
 *
 * ## Why a table, not pg_advisory_lock?
 * Postgres advisory locks are session-scoped. Supabase routes RPC calls
 * through PgBouncer / short-lived HTTP connections, so an advisory lock
 * acquired in one RPC call would not survive into the next call from the
 * same logical actor. A table-backed lock with explicit ownership + TTL
 * gives us cross-call durability, observable state, and orphan recovery
 * without depending on session affinity. A cron job (every minute) purges
 * any orphan whose TTL elapsed without an explicit release.
 *
 * ## Contract
 * Every Phase-2 adapter that mutates an entity MUST:
 *   1. Compute a deterministic lock key via `getTaskLockKey(...)`.
 *   2. Wrap its mutation in `withExecutionLock(lockKey, ownerId, fn)` so the
 *      release is guaranteed even on throw.
 *   3. Treat `{ ok: false, reason: "lock_busy" }` as a clean retry signal —
 *      never silently fall through.
 */

import { supabase } from "@/integrations/supabase/client";

const DEFAULT_TTL_SECONDS = 60;
const SYSTEM_SCHEMA = "system";

interface SystemRpcClient {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
}

function systemClient(): SystemRpcClient {
  // Schema-scoped client — the RPCs live in the `system` schema; calling
  // through the default `public`-bound client would 404. We must invoke
  // `rpc` as a method on the schema client (PostgREST loses `this` when
  // detached).
  return supabase.schema(SYSTEM_SCHEMA) as unknown as SystemRpcClient;
}

// ── Key derivation ────────────────────────────────────────────────────────
export type TaskLockTarget =
  | {
      kind: "entity";
      domain: string;
      entityType: string;
      entityId: string;
    }
  | {
      kind: "global";
      domain: string;
      taskType: string;
    };

/**
 * Deterministic lock key for an execution task.
 *
 *   entity mutation → `<domain>:<entity_type>:<entity_id>`
 *   global op       → `<domain>:<task_type>`
 *
 * Both segments are lowercased and trimmed so casing differences cannot
 * spawn parallel locks for the same logical target.
 */
export function getTaskLockKey(target: TaskLockTarget): string {
  const norm = (s: string) => s.trim().toLowerCase();
  if (target.kind === "entity") {
    if (!target.domain || !target.entityType || !target.entityId) {
      throw new Error(
        "getTaskLockKey: entity target requires domain, entityType, entityId",
      );
    }
    return `${norm(target.domain)}:${norm(target.entityType)}:${target.entityId.trim()}`;
  }
  if (!target.domain || !target.taskType) {
    throw new Error("getTaskLockKey: global target requires domain, taskType");
  }
  return `${norm(target.domain)}:${norm(target.taskType)}`;
}

// ── Acquire / release ────────────────────────────────────────────────────
export interface LockHandle {
  lockKey: string;
  ownerId: string;
  expiresAt: Date;
  reason: string;
}

export interface LockAcquireResult {
  acquired: boolean;
  handle: LockHandle | null;
  /**
   * Reason returned by the RPC: `acquired`, `acquired_after_release`,
   * `orphan_recovered`, `reentrant_refresh`, `busy`, `race_lost`.
   * `error` is reserved for unexpected RPC failures.
   */
  reason:
    | "acquired"
    | "acquired_after_release"
    | "orphan_recovered"
    | "reentrant_refresh"
    | "busy"
    | "race_lost"
    | "error";
  currentOwnerId?: string | null;
  currentExpiresAt?: Date | null;
  error?: string;
}

interface RawAcquireRow {
  acquired: boolean;
  lock_key: string | null;
  owner_id: string | null;
  expires_at: string | null;
  reason: string | null;
}

export async function acquireExecutionLock(
  lockKey: string,
  ownerId: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<LockAcquireResult> {
  if (!lockKey || !ownerId) {
    return {
      acquired: false,
      handle: null,
      reason: "error",
      error: "lockKey and ownerId are required",
    };
  }

  const { data, error } = await systemClient().rpc(
    "try_acquire_execution_lock",
    {
      p_lock_key: lockKey,
      p_owner_id: ownerId,
      p_ttl_seconds: Math.max(1, Math.floor(ttlSeconds)),
    },
  );

  if (error) {
    return {
      acquired: false,
      handle: null,
      reason: "error",
      error: error.message,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | RawAcquireRow
    | null;
  if (!row) {
    return {
      acquired: false,
      handle: null,
      reason: "error",
      error: "try_acquire_execution_lock returned no row",
    };
  }

  const reason = (row.reason ?? "error") as LockAcquireResult["reason"];
  if (row.acquired && row.expires_at) {
    return {
      acquired: true,
      handle: {
        lockKey: row.lock_key ?? lockKey,
        ownerId: row.owner_id ?? ownerId,
        expiresAt: new Date(row.expires_at),
        reason,
      },
      reason,
    };
  }

  return {
    acquired: false,
    handle: null,
    reason,
    currentOwnerId: row.owner_id ?? null,
    currentExpiresAt: row.expires_at ? new Date(row.expires_at) : null,
  };
}

export async function releaseExecutionLock(
  lockKey: string,
  ownerId: string,
): Promise<{ released: boolean; error?: string }> {
  if (!lockKey || !ownerId) {
    return { released: false, error: "lockKey and ownerId are required" };
  }

  const { data, error } = await systemClient().rpc("release_execution_lock", {
    p_lock_key: lockKey,
    p_owner_id: ownerId,
  });

  if (error) {
    return { released: false, error: error.message };
  }
  return { released: Boolean(data) };
}

// ── withExecutionLock ────────────────────────────────────────────────────
export type WithExecutionLockResult<T> =
  | { ok: true; data: T; lock: LockHandle; released: boolean }
  | {
      ok: false;
      reason: "lock_busy" | "lock_error" | "fn_threw";
      error?: string;
      currentOwnerId?: string | null;
      currentExpiresAt?: Date | null;
    };

export interface WithExecutionLockOptions {
  ttlSeconds?: number;
}

/**
 * Acquire a lock, run `fn`, then release the lock — release is guaranteed
 * via try/finally and is gated by ownership at the RPC layer (a third party
 * cannot "steal" the release call).
 *
 * If the lock cannot be acquired, `fn` is NOT invoked and the result carries
 * `reason: "lock_busy"`. If `fn` throws, we still release and surface the
 * error as `reason: "fn_threw"`.
 */
export async function withExecutionLock<T>(
  lockKey: string,
  ownerId: string,
  fn: (handle: LockHandle) => Promise<T>,
  options: WithExecutionLockOptions = {},
): Promise<WithExecutionLockResult<T>> {
  const ttl = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const acquired = await acquireExecutionLock(lockKey, ownerId, ttl);

  if (!acquired.acquired || !acquired.handle) {
    if (acquired.reason === "error") {
      return {
        ok: false,
        reason: "lock_error",
        error: acquired.error,
      };
    }
    return {
      ok: false,
      reason: "lock_busy",
      currentOwnerId: acquired.currentOwnerId ?? null,
      currentExpiresAt: acquired.currentExpiresAt ?? null,
    };
  }

  const handle = acquired.handle;
  let released = false;
  try {
    const data = await fn(handle);
    const r = await releaseExecutionLock(lockKey, ownerId);
    released = r.released;
    return { ok: true, data, lock: handle, released };
  } catch (err) {
    // Best-effort release on failure — do not let a release error mask the
    // original throw.
    try {
      const r = await releaseExecutionLock(lockKey, ownerId);
      released = r.released;
    } catch {
      // swallow — release is best-effort here; cron will reclaim via TTL.
    }
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: "fn_threw", error: message };
  }
}
