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
import type {
  DispatchFailureClass,
  DispatchResult,
  DispatchTaskRequest,
  ExecutionTaskRow,
  ExecutionTaskStatus,
} from "./types";

export class TaskDispatcher {
  /**
   * Dispatch a structured task. Returns the inserted row + classification + validation outcome.
   * Never throws on validation failures — instead inserts a BLOCKED row so the audit trail is complete.
   */
  async dispatch(request: DispatchTaskRequest): Promise<DispatchResult> {
    const riskLevel: RiskLevel = classifyTaskType(request.type);
    const validation = validationEngine.validate({ request, riskLevel });

    const status: ExecutionTaskStatus = validation.blocked ? "BLOCKED" : "PENDING";
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
        const systemClient = supabase.schema("system") as unknown as {
          rpc: (
            fn: string,
            args: Record<string, unknown>,
          ) => Promise<{ data: unknown; error: { message: string } | null }>;
        };
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
        if (validation.blocked) {
          failureClass = "validation_failed";
        } else if (insertedRow.status === "BLOCKED") {
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
    const serverBlocked = insertedRow?.status === "BLOCKED";

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
