/**
 * Generic per-row content adapter (task #945).
 *
 * Domain  : `content.row`
 * TaskType: `NON_CRITICAL_DATA_FIX` (MEDIUM, no approval required by policy)
 *
 * One adapter handles insert/update/upsert/delete on any table that lives
 * in the `CONTENT_WRITE_TABLE_ALLOWLIST`. Snapshot is the full pre-mutation
 * row (fetched via `repo.readById`) so rollback can restore arbitrary
 * columns or re-delete a freshly-inserted row.
 *
 * Verification re-reads the row and asserts:
 *   - insert / upsert: row exists post-write
 *   - update         : every key in `values` matches the observed row
 *                      (when `strict_verify` is true; otherwise row exists)
 *   - delete         : row no longer exists
 */

import type {
  AdapterResult,
  DomainAdapter,
  ExecutionContext,
  ExecutionTask,
  RollbackContext,
  RollbackInvocation,
  RollbackResult,
} from "../../types.ts";
import {
  CONTENT_DOMAINS,
  CONTENT_ERROR_CODES,
  CONTENT_TASK_TYPES,
  validateRowWritePayload,
  type ContentRowSnapshot,
  type ContentRowWritePayload,
} from "./types.ts";
import {
  contentRowIdempotencyKey,
  contentRowLockKey,
  hashContentPayload,
} from "./policy.ts";
import type { ContentRowRepository } from "./row-repository.ts";

export interface ContentRowAdapterDeps {
  repo: ContentRowRepository;
  now?: () => Date;
}

function emptySnapshot(table: string, id: string): ContentRowSnapshot {
  return { table, id, row: null };
}

function targetIdFromPayload(p: ContentRowWritePayload): string | null {
  if (p.id) return p.id;
  const v = p.values;
  if (v && typeof v.id === "string" && v.id.trim() !== "") return v.id.trim();
  return null;
}

export function createContentRowAdapter(
  deps: ContentRowAdapterDeps,
): DomainAdapter<ContentRowSnapshot, Record<string, unknown>> {
  const now = deps.now ?? (() => new Date());
  const ts = () => now().toISOString();

  return {
    domain: CONTENT_DOMAINS.ROW,
    taskType: CONTENT_TASK_TYPES.ROW_WRITE,
    agent: {
      slug: "content.row",
      version: "1.0.0",
      kind: "business.adapter",
      displayName: "Content Row Writer",
      ownerTeam: "content",
      policyProfile: "medium-default",
      quotas: { max_runs_per_min: 600, max_runs_per_day: 200_000 },
      metadata: {
        description:
          "Generic per-row write adapter for storefront/content tables. " +
          "Replaces direct .insert/.update/.upsert/.delete usage from the " +
          "P4 dispatch-allowlist entries.",
        rollback_strategy: "auto",
        verifier: "content.row",
        canonical_task_type: CONTENT_TASK_TYPES.ROW_WRITE,
      },
    },
    rollback_strategy: "auto",

    getLockKey(task: ExecutionTask): string {
      const v = validateRowWritePayload(task.payload);
      const table = v.data?.table ?? task.entity_type ?? "unknown";
      const id = v.data ? targetIdFromPayload(v.data) ?? task.entity_id ?? "unknown"
        : task.entity_id ?? "unknown";
      return contentRowLockKey(table, id);
    },

    getIdempotencyKey(task: ExecutionTask): string | null {
      const fromTask = (task.idempotency_key ?? "").trim();
      if (fromTask) return fromTask;
      const v = validateRowWritePayload(task.payload);
      if (!v.ok || !v.data) return null;
      const id = targetIdFromPayload(v.data) ?? task.entity_id ?? "";
      if (!id) return null;
      const hash = v.data.payload_hash && v.data.payload_hash.trim() !== ""
        ? v.data.payload_hash
        : hashContentPayload(task.payload ?? {});
      return contentRowIdempotencyKey(v.data.table, v.data.op, id, hash);
    },

    async snapshotProvider(ctx: ExecutionContext): Promise<ContentRowSnapshot | null> {
      const v = validateRowWritePayload(ctx.task.payload);
      if (!v.ok || !v.data) return null;
      const id = targetIdFromPayload(v.data);
      if (!id) return emptySnapshot(v.data.table, "");
      try {
        const row = await deps.repo.readById(v.data.table, id);
        return { table: v.data.table, id, row };
      } catch {
        return emptySnapshot(v.data.table, id);
      }
    },

    async rollback(
      _ctx: RollbackContext,
      invocation: RollbackInvocation<ContentRowSnapshot, Record<string, unknown>>,
    ): Promise<RollbackResult> {
      const snap = invocation.previousState
        ?? (invocation.output?.previous_state as ContentRowSnapshot | undefined)
        ?? null;
      if (!snap) {
        return {
          success: false,
          errorCode: CONTENT_ERROR_CODES.MUTATION_FAILED,
          errorMessage: "rollback: no snapshot available",
          logs: [`[${ts()}] rollback.no_snapshot`],
        };
      }
      try {
        await deps.repo.restore(snap);
        return {
          success: true,
          output: { restored: snap, trigger: invocation.trigger },
          logs: [`[${ts()}] rollback.ok ${snap.table}/${snap.id}`],
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return {
          success: false,
          errorCode: CONTENT_ERROR_CODES.MUTATION_FAILED,
          errorMessage: `rollback failed: ${message}`,
          logs: [`[${ts()}] rollback.threw ${message}`],
        };
      }
    },

    async execute(ctx: ExecutionContext): Promise<AdapterResult> {
      const logs: string[] = [];
      const actionsTaken: string[] = [];

      const v = validateRowWritePayload(ctx.task.payload);
      if (!v.ok || !v.data) {
        return {
          success: false,
          errorCode: CONTENT_ERROR_CODES.INVALID_PAYLOAD,
          errorMessage: v.reason ?? "payload validation failed",
          logs: [`[${ts()}] validate.failed: ${v.reason}`],
        };
      }
      const p = v.data;
      logs.push(`[${ts()}] validate.ok table=${p.table} op=${p.op}`);

      // Snapshot pre-mutation row for rollback. Failures here are logged but
      // do not abort — the orchestrator already snapshotted via
      // snapshotProvider(); this is a belt-and-suspenders capture.
      let prior: Record<string, unknown> | null = null;
      const targetId = targetIdFromPayload(p);
      if (targetId) {
        try {
          prior = await deps.repo.readById(p.table, targetId);
        } catch (e) {
          logs.push(`[${ts()}] snapshot.read_failed ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      const previous_state: ContentRowSnapshot = {
        table: p.table,
        id: targetId ?? "",
        row: prior,
      };
      actionsTaken.push("snapshot_previous_state");

      // Mutate.
      let resultRow: Record<string, unknown> | null = null;
      try {
        if (p.op === "insert") resultRow = await deps.repo.insert(p.table, p.values ?? {});
        else if (p.op === "update") resultRow = await deps.repo.update(p.table, p.id!, p.values ?? {});
        else if (p.op === "upsert") resultRow = await deps.repo.upsert(p.table, p.values ?? {});
        else if (p.op === "delete") {
          await deps.repo.delete(p.table, p.id!);
          resultRow = null;
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return {
          success: false,
          errorCode: CONTENT_ERROR_CODES.MUTATION_FAILED,
          errorMessage: message,
          output: { previous_state },
          logs: [...logs, `[${ts()}] mutate.failed: ${message}`],
        };
      }
      actionsTaken.push(`mutate:${p.op}`);
      logs.push(`[${ts()}] mutate.ok`);

      // Adapter-side verification (registry verifier runs again afterwards).
      const observedId = resultRow && typeof resultRow.id === "string"
        ? (resultRow.id as string)
        : targetId;
      let observed: Record<string, unknown> | null = null;
      if (p.op !== "delete" && observedId) {
        try {
          observed = await deps.repo.readById(p.table, observedId);
        } catch (e) {
          return {
            success: false,
            errorCode: CONTENT_ERROR_CODES.VERIFICATION_LOOKUP_FAILED,
            errorMessage: e instanceof Error ? e.message : String(e),
            output: { previous_state },
            logs: [...logs, `[${ts()}] verify.read_failed`],
          };
        }
        if (!observed) {
          return {
            success: false,
            errorCode: CONTENT_ERROR_CODES.VERIFICATION_MISMATCH,
            errorMessage: `row ${p.table}/${observedId} not found post-mutation`,
            output: { previous_state },
            logs: [...logs, `[${ts()}] verify.missing_row`],
          };
        }
        if (p.strict_verify && p.values) {
          for (const [k, v] of Object.entries(p.values)) {
            if (k === "id") continue;
            if (JSON.stringify(observed[k]) !== JSON.stringify(v)) {
              return {
                success: false,
                errorCode: CONTENT_ERROR_CODES.VERIFICATION_MISMATCH,
                errorMessage: `field "${k}" diverged post-mutation`,
                output: {
                  previous_state,
                  observed,
                  diff: [{ field: k, expected: v, observed: observed[k] }],
                },
                logs: [...logs, `[${ts()}] verify.field_diff ${k}`],
              };
            }
          }
        }
      } else if (p.op === "delete" && targetId) {
        try {
          const post = await deps.repo.readById(p.table, targetId);
          if (post) {
            return {
              success: false,
              errorCode: CONTENT_ERROR_CODES.VERIFICATION_MISMATCH,
              errorMessage: `row ${p.table}/${targetId} still present after delete`,
              output: { previous_state },
              logs: [...logs, `[${ts()}] verify.delete_still_present`],
            };
          }
        } catch (e) {
          return {
            success: false,
            errorCode: CONTENT_ERROR_CODES.VERIFICATION_LOOKUP_FAILED,
            errorMessage: e instanceof Error ? e.message : String(e),
            output: { previous_state },
            logs: [...logs, `[${ts()}] verify.delete_read_failed`],
          };
        }
      }
      logs.push(`[${ts()}] verify.ok`);

      return {
        success: true,
        output: {
          table: p.table,
          op: p.op,
          id: observedId ?? targetId ?? null,
          previous_state,
          observed,
        },
        logs,
        actionsTaken,
      };
    },
  };
}
