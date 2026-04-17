/**
 * In-memory test fakes for ExecutionOrchestratorV2 + Phase-2 adapters.
 *
 * Centralised so tests across blocks share the same fakes instead of each
 * one re-implementing them with subtle behavioural drift.
 */

import type { TaskRepository } from "./persistence.ts";
import type {
  ExecutionTask,
  ExecutionTaskStatus,
} from "./types.ts";
import type { ListingRecord, ListingRepository } from "./adapters/marketplace/listing-repository.ts";

const TRANSITIONS: Record<ExecutionTaskStatus, ExecutionTaskStatus[]> = {
  draft: ["pending_review", "approved", "queued", "cancelled"],
  pending_review: ["approved", "rejected", "cancelled"],
  approved: ["queued", "cancelled"],
  rejected: ["draft", "cancelled"],
  queued: ["running", "blocked", "cancelled"],
  running: ["succeeded", "failed", "blocked"],
  succeeded: ["rolling_back", "rolled_back"],
  failed: ["queued", "blocked", "rolling_back", "rolled_back", "cancelled"],
  blocked: ["queued", "cancelled"],
  rolling_back: ["rolled_back", "rollback_failed"],
  rollback_failed: ["rolling_back", "blocked", "cancelled"],
  rolled_back: [],
  cancelled: [],
};

export class MemoryTaskRepository implements TaskRepository {
  private readonly rows = new Map<string, ExecutionTask & { execution_result?: unknown; error_code?: string | null; blocked_reason?: string | null }>();
  /** Audit trail of every transition for assertions. */
  public readonly history: Array<{ taskId: string; from: ExecutionTaskStatus; to: ExecutionTaskStatus; patch?: Record<string, unknown> }> = [];

  upsert(row: ExecutionTask): void {
    this.rows.set(row.id, { ...row });
  }

  async loadTask(taskId: string): Promise<ExecutionTask | null> {
    const r = this.rows.get(taskId);
    return r ? { ...r } : null;
  }

  async transition(
    taskId: string,
    fromStatus: ExecutionTaskStatus,
    toStatus: ExecutionTaskStatus,
    patch: Record<string, unknown> = {},
  ): Promise<boolean> {
    const r = this.rows.get(taskId);
    if (!r) return false;
    if (r.status !== fromStatus) return false;
    if (fromStatus !== toStatus && !TRANSITIONS[fromStatus]?.includes(toStatus)) {
      throw new Error(`illegal transition ${fromStatus} → ${toStatus}`);
    }
    Object.assign(r, patch, { status: toStatus });
    this.history.push({ taskId, from: fromStatus, to: toStatus, patch });
    return true;
  }

  snapshot(taskId: string) {
    const r = this.rows.get(taskId);
    return r ? { ...r } : null;
  }
}

export class MemoryListingRepository implements ListingRepository {
  private readonly rows = new Map<string, ListingRecord>();
  /** Counts every successful setStatus call — used to prove no double-mutation. */
  public mutations = 0;

  seed(record: ListingRecord): void {
    this.rows.set(record.id, { ...record });
  }

  async findById(id: string): Promise<ListingRecord | null> {
    const r = this.rows.get(id);
    return r ? { ...r } : null;
  }

  async setStatus(
    id: string,
    nextStatus: "active" | "paused",
    extra: Record<string, unknown> = {},
  ): Promise<ListingRecord | null> {
    const r = this.rows.get(id);
    if (!r) return null;
    const updated: ListingRecord = {
      ...r,
      status: nextStatus,
      is_published: nextStatus === "active",
      ...extra,
    };
    this.rows.set(id, updated);
    this.mutations++;
    return { ...updated };
  }

  async restoreSnapshot(snapshot: ListingRecord): Promise<ListingRecord | null> {
    const r = this.rows.get(snapshot.id);
    if (!r) return null;
    const restored: ListingRecord = {
      id: snapshot.id,
      status: snapshot.status,
      is_published: snapshot.is_published,
      visibility_mode: snapshot.visibility_mode,
    };
    this.rows.set(snapshot.id, restored);
    this.mutations++;
    return { ...restored };
  }

  raw(id: string): ListingRecord | null {
    const r = this.rows.get(id);
    return r ? { ...r } : null;
  }
}

export function makeTask(overrides: Partial<ExecutionTask> = {}): ExecutionTask {
  return {
    id: overrides.id ?? `task-${Math.random().toString(36).slice(2, 10)}`,
    type: overrides.type ?? "MARKETPLACE.LISTING.PUBLISH",
    domain: overrides.domain ?? "marketplace",
    risk_level: overrides.risk_level ?? "MEDIUM",
    status: overrides.status ?? "queued",
    payload: overrides.payload ?? {},
    approved_by: overrides.approved_by ?? "admin-1",
    attempt_count: overrides.attempt_count ?? 0,
    max_attempts: overrides.max_attempts ?? 3,
    parent_task_id: overrides.parent_task_id ?? null,
    requested_by: overrides.requested_by ?? "system",
    idempotency_key: overrides.idempotency_key ?? null,
    lock_key: overrides.lock_key ?? null,
    entity_type: overrides.entity_type ?? "listing",
    entity_id: overrides.entity_id ?? null,
    correlation_id: overrides.correlation_id ?? null,
    root_task_id: overrides.root_task_id ?? null,
    requires_approval: overrides.requires_approval ?? false,
    approval_policy: overrides.approval_policy ?? "none",
    previous_state: overrides.previous_state ?? null,
    rollback_result: overrides.rollback_result ?? null,
    rollback_reason: overrides.rollback_reason ?? null,
    rollback_strategy: overrides.rollback_strategy ?? "manual",
  };
}
