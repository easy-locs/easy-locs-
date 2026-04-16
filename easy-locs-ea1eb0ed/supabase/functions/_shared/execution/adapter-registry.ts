/**
 * AdapterRegistry — Phase-2 routing table (task #752).
 *
 * Maps a (domain, task_type) pair to a single DomainAdapter. The registry is
 * intentionally strict:
 *   - Only one adapter per (domain, task_type).
 *   - Re-registration overwrites only when explicitly allowed.
 *   - Unknown lookups return null — the orchestrator translates that into a
 *     `blocked` task with `error_code = NO_ADAPTER`.
 *
 * No adapters are registered in this task. Adapter blocks (Marketplace,
 * Verification, etc.) register themselves via `register()` at module load.
 */

import type { DomainAdapter, ExecutionTask } from "./types.ts";

export class AdapterRegistry {
  private readonly adapters = new Map<string, DomainAdapter>();

  private static keyOf(domain: string, taskType: string): string {
    return `${domain.toLowerCase()}::${taskType.toUpperCase()}`;
  }

  register(adapter: DomainAdapter, opts?: { overwrite?: boolean }): void {
    if (!adapter.domain || !adapter.taskType) {
      throw new Error(
        "AdapterRegistry.register: adapter must declare both `domain` and `taskType`",
      );
    }
    const key = AdapterRegistry.keyOf(adapter.domain, adapter.taskType);
    if (this.adapters.has(key) && !opts?.overwrite) {
      throw new Error(
        `AdapterRegistry: adapter already registered for ${key}. ` +
          `Pass { overwrite: true } if this is intentional.`,
      );
    }
    this.adapters.set(key, adapter);
  }

  get(domain: string, taskType: string): DomainAdapter | null {
    return this.adapters.get(AdapterRegistry.keyOf(domain, taskType)) ?? null;
  }

  has(domain: string, taskType: string): boolean {
    return this.adapters.has(AdapterRegistry.keyOf(domain, taskType));
  }

  size(): number {
    return this.adapters.size;
  }

  list(): Array<{ domain: string; taskType: string }> {
    return Array.from(this.adapters.values()).map((a) => ({
      domain: a.domain,
      taskType: a.taskType,
    }));
  }

  clear(): void {
    this.adapters.clear();
  }
}

/**
 * Default deterministic lock-key derivation used when an adapter does not
 * override `getLockKey`. The contract is documented in the locks/idempotency
 * block task: `<domain>:<entity_type>:<entity_id>` for entity mutations,
 * `<domain>:<task_type>` for global operations.
 */
export function defaultLockKey(task: ExecutionTask): string {
  const dom = task.domain.toLowerCase();
  if (task.entity_type && task.entity_id) {
    return `${dom}:${task.entity_type}:${task.entity_id}`;
  }
  return `${dom}:${task.type.toUpperCase()}`;
}

/**
 * Default idempotency key. We honour `task.idempotency_key` when the
 * dispatcher set it (preferred path); otherwise return null and let the
 * orchestrator skip the idempotency lookup. We never invent keys server-side
 * because that would silently coalesce semantically distinct tasks.
 */
export function defaultIdempotencyKey(task: ExecutionTask): string | null {
  const k = (task.idempotency_key ?? "").trim();
  return k === "" ? null : k;
}

/** Process-wide singleton — adapters auto-register against this instance. */
export const globalAdapterRegistry = new AdapterRegistry();
