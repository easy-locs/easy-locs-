/**
 * AdapterRegistry — Phase-2 routing table (task #752, extended L1 task #808).
 *
 * Maps a (domain, task_type) pair to a single DomainAdapter. The registry is
 * intentionally strict:
 *   - Only one adapter per (domain, task_type).
 *   - Re-registration overwrites only when explicitly allowed.
 *   - Unknown lookups return null — the orchestrator translates that into a
 *     `blocked` task with `error_code = NO_ADAPTER`.
 *
 * Sovereign Agent Control (L1, task #808):
 *   - Every adapter SHOULD declare an `agent` reference (slug + version)
 *     bound to a row in `system.agents`. The registry validates the shape
 *     and, when strict mode is enabled, refuses adapters without one.
 *   - `setStrictAgentRegistration(true)` flips that behaviour on. L7 will
 *     enable it once every domain has been migrated. Tests can opt in
 *     locally without affecting other suites.
 *   - `reconcileWithDatabase(sb)` upserts the in-process registry into
 *     `system.agents` / `system.agent_capabilities` so the platform DB and
 *     the running adapters stay in lock-step.
 *
 * No adapters are registered in this file. Adapter blocks (Marketplace,
 * Verification, etc.) register themselves via `register()` at module load.
 */

import type { DomainAdapter, ExecutionTask } from "./types.ts";

export interface AgentManifest {
  slug: string;
  display_name: string;
  agent_kind: string;
  version: string;
  owner_team: string | null;
  policy_profile: string | null;
  quotas: Record<string, unknown>;
  metadata: Record<string, unknown>;
  capabilities: Array<{ domain: string; task_type: string }>;
}

let STRICT_AGENT_REGISTRATION = false;

export function setStrictAgentRegistration(strict: boolean): void {
  STRICT_AGENT_REGISTRATION = strict;
}

export function isStrictAgentRegistration(): boolean {
  return STRICT_AGENT_REGISTRATION;
}

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
    if (adapter.agent) {
      const a = adapter.agent;
      if (!a.slug || typeof a.slug !== "string") {
        throw new Error(
          `AdapterRegistry: adapter for ${adapter.domain}.${adapter.taskType} ` +
            `declares an invalid agent.slug`,
        );
      }
      if (!a.version || typeof a.version !== "string") {
        throw new Error(
          `AdapterRegistry: adapter ${a.slug} must declare a non-empty agent.version`,
        );
      }
      if (!a.kind || typeof a.kind !== "string") {
        throw new Error(
          `AdapterRegistry: adapter ${a.slug} must declare an agent.kind ` +
            `(e.g. "business.adapter", "ai.router", "dev.builder")`,
        );
      }
    } else if (STRICT_AGENT_REGISTRATION) {
      throw new Error(
        `AdapterRegistry: strict mode requires adapter for ` +
          `${adapter.domain}.${adapter.taskType} to declare an "agent" ref`,
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

  getAgentForTask(
    domain: string,
    taskType: string,
  ): DomainAdapter["agent"] | null {
    const a = this.get(domain, taskType);
    return a?.agent ?? null;
  }

  /**
   * Aggregate the in-process adapters into a list of agent records (one per
   * unique slug) plus their capabilities. Used by reconcileWithDatabase.
   */
  toAgentManifest(): AgentManifest[] {
    const bySlug = new Map<string, AgentManifest>();
    for (const adapter of this.adapters.values()) {
      const a = adapter.agent;
      if (!a) continue;
      const existing = bySlug.get(a.slug);
      const cap = { domain: adapter.domain, task_type: adapter.taskType };
      if (existing) {
        if (!existing.capabilities.some(
          (c) => c.domain === cap.domain && c.task_type === cap.task_type,
        )) {
          existing.capabilities.push(cap);
        }
      } else {
        bySlug.set(a.slug, {
          slug: a.slug,
          display_name: a.displayName ?? a.slug,
          agent_kind: a.kind,
          version: a.version,
          owner_team: a.ownerTeam ?? null,
          policy_profile: a.policyProfile ?? null,
          quotas: a.quotas ?? {},
          metadata: a.metadata ?? {},
          capabilities: [cap],
        });
      }
    }
    return Array.from(bySlug.values());
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
