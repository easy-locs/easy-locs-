/**
 * Persistence helpers for ExecutionOrchestratorV2 (task #752).
 *
 * The orchestrator never mutates `system.execution_tasks.status` directly
 * via raw SQL — every transition goes through Postgres' state-machine
 * trigger (block 1, migration 20260418500000), which refuses any illegal
 * step. We model the helpers here as guarded UPDATEs that *also* assert
 * the expected `from` status as an extra layer of optimistic concurrency.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import type { ExecutionTask, ExecutionTaskStatus } from "./types.ts";

const TASK_COLUMNS =
  "id,type,domain,risk_level,status,payload,approved_by,attempt_count,max_attempts," +
  "parent_task_id,requested_by,idempotency_key,lock_key,entity_type,entity_id," +
  "correlation_id,root_task_id,requires_approval,approval_policy," +
  "previous_state,rollback_result,rollback_reason,rollback_strategy," +
  "pre_rollback_status,error_code,execution_result";

/**
 * Repository contract used by ExecutionOrchestratorV2.
 *
 * Result data is persisted via the `patch` field on `transition()` (e.g.
 * `{ execution_result }`) so a single guarded UPDATE flips status and
 * stores the payload atomically; we deliberately do NOT expose a separate
 * `persistResult()` method to avoid drift between status and result.
 */
export interface TaskRepository {
  loadTask(taskId: string): Promise<ExecutionTask | null>;
  transition(
    taskId: string,
    fromStatus: ExecutionTaskStatus,
    toStatus: ExecutionTaskStatus,
    patch?: Record<string, unknown>,
  ): Promise<boolean>;
}

export function toExecutionTask(row: Record<string, unknown>): ExecutionTask {
  return {
    id: String(row.id),
    type: String(row.type),
    domain: String(row.domain),
    risk_level: row.risk_level as ExecutionTask["risk_level"],
    status: row.status as ExecutionTaskStatus,
    payload: (row.payload as Record<string, unknown>) ?? {},
    approved_by: (row.approved_by as string | null) ?? null,
    attempt_count: Number(row.attempt_count ?? 0),
    max_attempts: Number(row.max_attempts ?? 3),
    parent_task_id: (row.parent_task_id as string | null) ?? null,
    requested_by: String(row.requested_by ?? "system"),
    idempotency_key: (row.idempotency_key as string | null) ?? null,
    lock_key: (row.lock_key as string | null) ?? null,
    entity_type: (row.entity_type as string | null) ?? null,
    entity_id: (row.entity_id as string | null) ?? null,
    correlation_id: (row.correlation_id as string | null) ?? null,
    root_task_id: (row.root_task_id as string | null) ?? null,
    requires_approval: Boolean(row.requires_approval ?? false),
    approval_policy: String(row.approval_policy ?? "none"),
    previous_state: (row.previous_state as Record<string, unknown> | null) ?? null,
    rollback_result: (row.rollback_result as Record<string, unknown> | null) ?? null,
    rollback_reason: (row.rollback_reason as string | null) ?? null,
    // L3: default to 'none' (fail-closed). Adapters that want rollback
    // MUST opt in via their declared `rollback_strategy` and that posture
    // is mirrored onto the row at dispatch time.
    rollback_strategy:
      (row.rollback_strategy as ExecutionTask["rollback_strategy"]) ?? "none",
    // L3 contract guard inputs — MUST be hydrated so `runRollback()` can
    // refuse a succeeded-origin rollback for adapters that haven't opted
    // into `allow_rollback_after_success`. Missing this mapping silently
    // bypasses the guard in production.
    pre_rollback_status:
      (row.pre_rollback_status as ExecutionTaskStatus | null) ?? null,
    error_code: (row.error_code as string | null) ?? null,
    execution_result:
      (row.execution_result as Record<string, unknown> | null) ?? null,
  };
}

export class SupabaseTaskRepository implements TaskRepository {
  constructor(private readonly sb: SupabaseClient) {}

  private tasks() {
    return this.sb.schema("system").from("execution_tasks");
  }

  async loadTask(taskId: string): Promise<ExecutionTask | null> {
    const { data, error } = await this.tasks()
      .select(TASK_COLUMNS)
      .eq("id", taskId)
      .maybeSingle();
    if (error) {
      console.warn("[persistence] loadTask error:", error.message);
      return null;
    }
    return data ? toExecutionTask(data as Record<string, unknown>) : null;
  }

  async transition(
    taskId: string,
    fromStatus: ExecutionTaskStatus,
    toStatus: ExecutionTaskStatus,
    patch: Record<string, unknown> = {},
  ): Promise<boolean> {
    const { data, error } = await this.tasks()
      .update({ ...patch, status: toStatus })
      .eq("id", taskId)
      .eq("status", fromStatus)
      .select("id")
      .maybeSingle();
    if (error) {
      console.warn("[persistence] transition error:", error.message);
      return false;
    }
    return !!data;
  }

}

/**
 * L3 (#811) — Default pre-execute entity snapshotter. Returns a function
 * suitable for `OrchestratorDeps.defaultSnapshotter`. The convention is
 * that `task.entity_type` carries `<schema>.<table>` (matching the
 * domain-schema architecture introduced in migration #56) and
 * `task.entity_id` is the row PK. Both must be present for a snapshot to
 * be attempted. Any missing component, or a row-not-found, returns
 * `null` — the orchestrator falls back to the structural identity
 * envelope which still provides actionable rollback context.
 *
 * The snapshot is intentionally a `SELECT *` — the orchestrator stores
 * the full row in `previous_state` so an adapter's rollback handler (or
 * a generic `restoreSnapshot` helper) can restore the row by spreading
 * the stored columns back over an `UPDATE`. RLS is bypassed because the
 * execution-loop runs under the service-role JWT.
 */
export function createSupabaseDefaultSnapshotter(
  sb: SupabaseClient,
): (task: ExecutionTask) => Promise<Record<string, unknown> | null> {
  return async (task) => {
    const entityType = task.entity_type;
    const entityId = task.entity_id;
    if (!entityType || !entityId) return null;
    const dot = entityType.indexOf(".");
    if (dot <= 0 || dot === entityType.length - 1) return null;
    const schema = entityType.slice(0, dot);
    const table = entityType.slice(dot + 1);
    // Belt-and-braces: refuse anything that isn't a plain identifier so we
    // never end up interpolating something exotic into the PostgREST path.
    const ident = /^[a-z_][a-z0-9_]*$/i;
    if (!ident.test(schema) || !ident.test(table)) return null;
    try {
      // The table identifier is dynamic by design (we do not know which
      // domain table will be touched at compile time), but we have
      // already restricted it to a plain identifier above. Use a typed
      // helper that narrows the supabase-js generic to a generic record
      // shape, so we get types without a blanket `any` cast.
      const fromTable = (
        sb.schema(schema) as unknown as {
          from(name: string): {
            select(cols: string): {
              eq(col: string, val: string): {
                maybeSingle(): Promise<{
                  data: Record<string, unknown> | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        }
      ).from(table);
      const { data, error } = await fromTable
        .select("*")
        .eq("id", entityId)
        .maybeSingle();
      if (error) {
        console.warn(
          `[default-snapshotter] ${schema}.${table}#${entityId} select error:`,
          error.message,
        );
        return null;
      }
      return (data as Record<string, unknown> | null) ?? null;
    } catch (e) {
      console.warn(
        "[default-snapshotter] threw:",
        e instanceof Error ? e.message : String(e),
      );
      return null;
    }
  };
}
