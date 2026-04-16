/**
 * lockService — Phase-2 distributed execution lock (task #752 surface).
 *
 * Backed by `system.execution_locks` + `system.try_acquire_execution_lock`
 * / `system.release_execution_lock` (migration 20260418600000). We use a
 * row-based TTL lock instead of `pg_try_advisory_lock` because each PostgREST
 * RPC opens a fresh session, so session-scoped advisory locks would never
 * outlive the call. The TTL also makes orphan locks self-healing.
 *
 * This file does NOT contain a fallback test mode — tests inject a
 * `MemoryLockService` (see test helpers) instead.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";

export interface LockService {
  acquire(lockKey: string, ownerId: string, ttlSeconds: number): Promise<boolean>;
  release(lockKey: string, ownerId: string): Promise<boolean>;
  withLock<T>(
    lockKey: string,
    ownerId: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<{ acquired: true; value: T } | { acquired: false; value: null }>;
}

export class PostgresLockService implements LockService {
  constructor(private readonly sb: SupabaseClient) {}

  async acquire(lockKey: string, ownerId: string, ttlSeconds: number): Promise<boolean> {
    const { data, error } = await this.sb
      .schema("system")
      .rpc("try_acquire_execution_lock", {
        p_lock_key: lockKey,
        p_owner_id: ownerId,
        p_ttl_seconds: ttlSeconds,
      });
    if (error) {
      console.warn("[lockService] acquire error:", error.message);
      return false;
    }
    return data === true;
  }

  async release(lockKey: string, ownerId: string): Promise<boolean> {
    const { data, error } = await this.sb
      .schema("system")
      .rpc("release_execution_lock", {
        p_lock_key: lockKey,
        p_owner_id: ownerId,
      });
    if (error) {
      console.warn("[lockService] release error:", error.message);
      return false;
    }
    return data === true;
  }

  async withLock<T>(
    lockKey: string,
    ownerId: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
  ) {
    const acquired = await this.acquire(lockKey, ownerId, ttlSeconds);
    if (!acquired) return { acquired: false as const, value: null };
    try {
      const value = await fn();
      return { acquired: true as const, value };
    } finally {
      await this.release(lockKey, ownerId);
    }
  }
}

/**
 * In-memory lock service for unit tests. NOT safe across processes.
 */
export class MemoryLockService implements LockService {
  private readonly locks = new Map<string, { owner: string; expiresAt: number }>();

  async acquire(lockKey: string, ownerId: string, ttlSeconds: number): Promise<boolean> {
    const now = Date.now();
    const existing = this.locks.get(lockKey);
    if (existing && existing.expiresAt > now && existing.owner !== ownerId) {
      return false;
    }
    this.locks.set(lockKey, { owner: ownerId, expiresAt: now + ttlSeconds * 1000 });
    return true;
  }

  async release(lockKey: string, ownerId: string): Promise<boolean> {
    const existing = this.locks.get(lockKey);
    if (!existing || existing.owner !== ownerId) return false;
    this.locks.delete(lockKey);
    return true;
  }

  async withLock<T>(
    lockKey: string,
    ownerId: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
  ) {
    const ok = await this.acquire(lockKey, ownerId, ttlSeconds);
    if (!ok) return { acquired: false as const, value: null };
    try {
      const value = await fn();
      return { acquired: true as const, value };
    } finally {
      await this.release(lockKey, ownerId);
    }
  }

  /** Test helper. */
  has(lockKey: string): boolean {
    const e = this.locks.get(lockKey);
    return !!e && e.expiresAt > Date.now();
  }
}
