/**
 * idempotencyService — Phase-2 task idempotency lookup (task #752 surface).
 *
 * Reads the result of the most recent `succeeded` task that holds a given
 * idempotency_key via `system.find_idempotent_result(key)`. Used by
 * ExecutionOrchestratorV2 to short-circuit BEFORE invoking an adapter so
 * that retries with the same key never produce duplicate side-effects.
 *
 * Claiming the key itself is enforced at insert time by the v2 partial
 * unique index `execution_tasks_idempotency_key_active_uniq` (migration
 * 20260418500000) — there is no separate `claim` RPC because the dispatch
 * RPC already returns the existing in-flight row when the key collides.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";

export interface IdempotencyService {
  findExistingResult(key: string): Promise<Record<string, unknown> | null>;
}

export class PostgresIdempotencyService implements IdempotencyService {
  constructor(private readonly sb: SupabaseClient) {}

  async findExistingResult(key: string): Promise<Record<string, unknown> | null> {
    if (!key || key.trim() === "") return null;
    const { data, error } = await this.sb
      .schema("system")
      .rpc("find_idempotent_result", { p_idempotency_key: key });
    if (error) {
      // Surface as a hard error: the orchestrator must NOT proceed to
      // execute as if there were a clean cache miss — that would risk
      // duplicating side-effects on retry. The orchestrator translates
      // this into IDEMPOTENCY_LOOKUP_FAILED → blocked.
      throw new Error(`idempotency lookup failed: ${error.message}`);
    }
    if (!data || typeof data !== "object") return null;
    return data as Record<string, unknown>;
  }
}

/** In-memory implementation for unit tests. */
export class MemoryIdempotencyService implements IdempotencyService {
  private readonly store = new Map<string, Record<string, unknown>>();

  async findExistingResult(key: string): Promise<Record<string, unknown> | null> {
    return this.store.get(key) ?? null;
  }

  /** Test helper — seed a prior successful result. */
  set(key: string, result: Record<string, unknown>): void {
    this.store.set(key, result);
  }
}
