/**
 * TaskDispatcher — entrypoint for the Autonomous Execution Layer (task #710).
 *
 * Receives structured task requests, classifies risk, validates payload,
 * inserts the row into `system.execution_tasks`, and logs every step to
 * `system.engine_run_logs`.
 *
 * Phase-1 safety:
 *   - CRITICAL tasks without an `approved_by` are inserted as BLOCKED, never RUNNING.
 *   - Unknown task types are auto-classified CRITICAL (deny-by-default).
 */

import { supabase } from "@/integrations/supabase/client";
import { logEngineRun } from "@/lib/engines/engine-logger";
import { classifyTaskType, type RiskLevel } from "./risk-classification";
import { validationEngine } from "./validation-engine";
import { validateTaskDependencies } from "./watchdog";
import type {
  DispatchFailureClass,
  DispatchResult,
  DispatchTaskRequest,
  ExecutionTaskRow,
  ExecutionTaskStatus,
} from "./types";

interface SystemRpcClient {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => {
    insert: (rows: Record<string, unknown>[]) => Promise<{ error: { message: string } | null }>;
    update: (patch: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
    };
  };
}

export class TaskDispatcher {
  /**
   * Dispatch a structured task. Returns the inserted row + classification + validation outcome.
   * Never throws on validation failures — instead inserts a BLOCKED row so the audit trail is complete.
   */
  async dispatch(request: DispatchTaskRequest): Promise<DispatchResult> {
    const riskLevel: RiskLevel = classifyTaskType(request.type);
    const validation = validationEngine.validate({ request, riskLevel });

    // ── Pre-insert dependency validation (task #1017) ─────────────────────
    // When the caller declares explicit upstream dependencies, run the SQL
    // topology check BEFORE we persist anything so we can reject with a
    // structured reason and never create a partially-wired row. The DB
    // trigger on `system.task_dependencies` re-runs the same check at the
    // boundary as defense-in-depth.
    const dependsOn = (request.dependsOn ?? []).filter((d) => typeof d === "string" && d.length > 0);
    if (dependsOn.length > 0) {
      // Use a probe UUID that does NOT yet exist; validate_task_dependencies
      // only inspects the proposed edges + upstream states.
      const probeId = crypto.randomUUID();
      const depCheck = await validateTaskDependencies(probeId, dependsOn);
      if (!depCheck.ok) {
        return {
          ok: false,
          task: null,
          riskLevel,
          validation,
          error:
            depCheck.error ??
            `dependency_validation_failed: reason=${depCheck.reason} offending=${depCheck.offendingId}`,
          failureClass: "validation_failed",
        };
      }
    }

    // v2 status model (task #750): blocked rows are recorded for audit;
    // approval-gated rows enter pending_review (the dispatch RPC overrides
    // when requires_approval is set), everything else is queued for the
    // orchestrator. The legacy uppercase values are gone.
    const status: ExecutionTaskStatus = validation.blocked
      ? "blocked"
      : request.requiresApproval
        ? "pending_review"
        : "queued";
    const requestedBy = (request.requestedBy ?? "system").trim() || "system";
    // Persist `approved_by` for any non-blocked task that carries a real
    // (non-system) approver — applies to both CRITICAL and approval-gated
    // MEDIUM types per `MEDIUM_TASK_APPROVAL_POLICY`. The server-side RPC
    // re-applies its own CRITICAL gate as defense in depth.
    const rawApprover = (request.approvedBy ?? "").trim();
    const approvedBy =
      !validation.blocked && rawApprover && rawApprover !== "system"
        ? rawApprover
        : null;

    let insertedRow: ExecutionTaskRow | null = null;
    let dbError: string | undefined;
    // Structured failure class for observability — surfaced in
    // engine_run_logs.metadata so the dashboard can render explicit error
    // states (no silent failures).
    let failureClass: DispatchFailureClass = validation.blocked
      ? "blocked"
      : "ok";

    const idempotencyKey = (request.idempotencyKey ?? "").trim() || null;

    const runResult = await logEngineRun({
      engineName: "task-dispatcher",
      category: "execution-layer",
      fn: async () => {
        // Insert via the SECURITY DEFINER admin-gated RPC. The RPC enforces
        // an `admin` role check on auth.uid(); non-admin callers are rejected
        // at the database boundary. The RPC also re-applies the CRITICAL gate
        // server-side — clients cannot self-approve by passing approved_by.
        // The dispatch RPC lives in the `system` schema, so we must call it
        // through a schema-scoped client. The default `db.rpc(...)` resolves
        // against `public` and would 404 the function.
        // IMPORTANT: do NOT detach `.rpc` from the schema-scoped client —
        // PostgREST's `rpc` is an instance method that depends on `this`.
        // Detaching it (`const r = client.rpc; r(...)`) loses binding and
        // throws at runtime. Always invoke it as a method.
        const systemClient = supabase.schema("system") as unknown as SystemRpcClient;
        const { data, error } = await systemClient.rpc(
          "dispatch_execution_task",
          {
            p_type: request.type,
            p_domain: request.domain,
            p_risk_level: riskLevel,
            p_status: status,
            p_payload: request.payload ?? {},
            p_requested_by: requestedBy,
            p_parent_task_id: request.parentTaskId ?? null,
            p_max_attempts: request.maxAttempts ?? 3,
            p_approved_by: approvedBy,
            p_blocked_reason: validation.blockedReason,
            p_idempotency_key: idempotencyKey,
            // v2 governance / traceability fields (task #750). All optional
            // — the SQL function defaults each to NULL / 'none' / FALSE so
            // legacy callers (no v2 fields supplied) keep working unchanged.
            p_root_task_id: request.rootTaskId ?? null,
            p_correlation_id: request.correlationId ?? null,
            p_entity_type: request.entityType ?? null,
            p_entity_id: request.entityId ?? null,
            p_approval_policy: request.approvalPolicy ?? "none",
            p_requires_approval: request.requiresApproval ?? false,
            p_retry_policy: request.retryPolicy ?? null,
          },
        );

        if (error) {
          dbError = error.message;
          failureClass = "rpc_failed";
          throw new Error(`execution_tasks dispatch RPC failed: ${error.message}`);
        }

        insertedRow = (Array.isArray(data) ? data[0] : data) as ExecutionTaskRow;
        if (!insertedRow) {
          dbError = "rpc returned no row";
          failureClass = "insert_failed";
          throw new Error("execution_tasks dispatch RPC returned no row");
        }

        // ── Post-insert: persist watchdog contract fields & dep edges ────
        // The dispatch RPC doesn't accept these v3 fields yet (its signature
        // is locked across many call-sites), so we patch them in the same
        // engine_run for atomic observability. The DB trigger on
        // `task_dependencies` enforces DAG/cycle/state safety as a backstop.
        const watchdogPatch: Record<string, unknown> = {};
        if (typeof request.maxDurationMs === "number" && request.maxDurationMs > 0) {
          watchdogPatch.max_duration_ms = request.maxDurationMs;
        }
        if (typeof request.stuckThresholdMs === "number" && request.stuckThresholdMs > 0) {
          watchdogPatch.stuck_threshold_ms = request.stuckThresholdMs;
        }
        if (Object.keys(watchdogPatch).length > 0 && insertedRow.id) {
          const { error: patchErr } = await systemClient
            .from("execution_tasks")
            .update(watchdogPatch)
            .eq("id", insertedRow.id);
          if (patchErr) {
            // Non-fatal: defaults from `task_verb_defaults` still apply.
            // Surfaced via failure_class so the dashboard sees the partial.
            dbError = `watchdog_contract_patch_failed: ${patchErr.message}`;
          }
        }
        if (dependsOn.length > 0 && insertedRow.id && !validation.blocked) {
          // Atomic: the SQL wrapper attaches all edges inside a savepoint
          // and, on rejection, compensates by marking the just-inserted
          // task `blocked` + writes an immutable incident_log row in the
          // same transaction. Guarantees no orphan task ever runs without
          // its declared dependencies (closes the dispatch-vs-edges race).
          const { data: attachData, error: attachErr } = await systemClient.rpc(
            "attach_task_dependencies",
            { p_task_id: insertedRow.id, p_depends_on: dependsOn },
          );
          if (attachErr) {
            dbError = `attach_task_dependencies_failed: ${attachErr.message}`;
            failureClass = "validation_failed";
            throw new Error(dbError);
          }
          const attachRow = (Array.isArray(attachData) ? attachData[0] : attachData) as
            | { ok?: boolean; error?: string }
            | null;
          if (attachRow && attachRow.ok === false) {
            // The SQL wrapper already wrote an incident and forced the
            // task to `blocked`. Surface a structured failure to callers.
            insertedRow = { ...insertedRow, status: "blocked" } as ExecutionTaskRow;
            dbError = `dependency_rejected: ${attachRow.error ?? "unknown"}`;
            failureClass = "validation_failed";
            throw new Error(dbError);
          }
        }

        if (validation.blocked) {
          failureClass = "validation_failed";
        } else if (insertedRow.status === "blocked") {
          // Server-side gate (e.g. PHASE1_CRITICAL_FORBIDDEN, RISK_MISMATCH)
          // blocked the task even though client-side validation passed.
          failureClass = "blocked";
        } else {
          failureClass = "ok";
        }

        return {
          summary:
            `dispatched type=${request.type} domain=${request.domain} ` +
            `risk=${riskLevel} status=${insertedRow.status} ` +
            `failure_class=${failureClass}` +
            (insertedRow.blocked_reason ? ` blocked_reason=${insertedRow.blocked_reason}` : ""),
          rowsAffected: 1,
          metadata: {
            taskId: insertedRow.id,
            type: request.type,
            domain: request.domain,
            riskLevel,
            serverRiskLevel: insertedRow.risk_level,
            status: insertedRow.status,
            requestedBy,
            blockedReason: insertedRow.blocked_reason,
            warnings: validation.warnings,
            idempotencyKey,
            failureClass,
          },
        };
      },
    });

    // Fail-closed: `ok` is true only when validation passed AND a row was
    // actually persisted AND no DB error / engine-run error was recorded.
    // Without this, an RPC throw inside `logEngineRun` (which catches and
    // returns) would silently produce `ok: true` with no inserted row.
    const runError =
      runResult.status === "error" ? (runResult.errorMessage ?? "engine_run_failed") : undefined;
    const finalError = dbError ?? runError;
    const persistedOk = insertedRow !== null;
    const serverBlocked = insertedRow?.status === "blocked";

    return {
      ok:
        !validation.blocked &&
        !finalError &&
        persistedOk &&
        !serverBlocked,
      task: insertedRow,
      riskLevel,
      validation,
      error: finalError,
      failureClass,
    };
  }
}

export const taskDispatcher = new TaskDispatcher();
