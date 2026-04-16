/**
 * OrchestratorAdapter — bridges the in-app TaskDispatcher to the existing
 * GitHub-driven orchestrator service.
 *
 * Responsibilities:
 *   - Pull PENDING tasks from `system.execution_tasks` (only after validation passed)
 *   - Hard-reject any CRITICAL task lacking `approved_by` (defense in depth)
 *   - Send the task to the orchestrator with structured context
 *   - Update status to RUNNING on dispatch, then SUCCESS / FAILED on response
 *   - Log every transition to `system.engine_run_logs`
 *
 * Phase-1 boundary: this adapter never *executes* the task itself — it only
 * forwards to the orchestrator (or, if no orchestrator endpoint is configured,
 * marks the task as PENDING with a clear reason and lets the server-side loop
 * built in task #711 pick it up).
 */

import { domainDb } from "@/services/db";
import { logEngineRun } from "@/lib/engines/engine-logger";
import { validationEngine } from "./validation-engine";
import { classifyTaskType } from "./risk-classification";
import type {
  ExecutionTaskRow,
  ExecutionTaskStatus,
} from "./types";

export interface OrchestratorResponse {
  status: "SUCCESS" | "FAILED" | "PENDING";
  result?: Record<string, unknown>;
  error?: string;
}

export interface OrchestratorTransport {
  /**
   * Send a task to the orchestrator and return its structured response.
   * Implementations should be side-effect free w.r.t. the DB row — this adapter
   * owns all status transitions.
   *
   * A transport may flag itself as a "pending handoff" by setting
   * `isPendingHandoff = true` — in that case the adapter will leave the row
   * in PENDING (rather than transitioning RUNNING→FAILED) so the server-side
   * loop in task #711 can consume it without races or false failures.
   */
  send(task: ExecutionTaskRow): Promise<OrchestratorResponse>;
  readonly isPendingHandoff?: boolean;
}

/**
 * Backwards-compatible export — `NullOrchestratorTransport` is now an alias
 * for `PendingHandoffTransport` so the adapter never strands a task as FAILED
 * when no transport is configured.
 */
export { PendingHandoffTransport as NullOrchestratorTransport, getDefaultTransport, HttpOrchestratorTransport, PendingHandoffTransport } from "./orchestrator-transport";

import { getDefaultTransport } from "./orchestrator-transport";

export class OrchestratorAdapter {
  constructor(private readonly transport: OrchestratorTransport = getDefaultTransport()) {}

  /**
   * Fetch up to `limit` PENDING tasks ready for execution.
   */
  async fetchPending(limit = 25): Promise<ExecutionTaskRow[]> {
    const { data, error } = await domainDb.system
      .from("execution_tasks")
      .select("*")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`OrchestratorAdapter.fetchPending failed: ${error.message}`);
    }
    return (data ?? []) as unknown as ExecutionTaskRow[];
  }

  /**
   * Dispatch a single task to the orchestrator. Enforces the CRITICAL gate
   * even though the dispatcher already did — defense in depth.
   */
  async dispatch(task: ExecutionTaskRow): Promise<OrchestratorResponse> {
    // Defense-in-depth #1: re-classify the task type from the canonical
    // risk-classification module. If the stored risk_level disagrees with the
    // classifier (e.g. row inserted directly by an authenticated client with
    // a stale/forged risk_level), promote to the stricter of the two and
    // refuse to dispatch.
    const classifiedRisk = classifyTaskType(task.type);
    if (classifiedRisk !== task.risk_level) {
      const stricter =
        classifiedRisk === "CRITICAL" || task.risk_level === "CRITICAL"
          ? "CRITICAL"
          : classifiedRisk === "MEDIUM" || task.risk_level === "MEDIUM"
            ? "MEDIUM"
            : "SAFE";
      const reason =
        `ADAPTER_RISK_MISMATCH: stored risk_level=${task.risk_level} but classifier=${classifiedRisk} for type=${task.type} — promoting to ${stricter} and blocking`;
      await this.transition(task.id, "BLOCKED", {
        blocked_reason: reason,
        risk_level: stricter,
      } as never);
      await this.log(task, "blocked", reason, 0);
      return { status: "FAILED", error: reason };
    }

    // Defense-in-depth #2: re-run the full ValidationEngine on the row before
    // any transition or transport call. Catches malformed/unknown/storm-blocked
    // tasks that may have been inserted directly via an authenticated client
    // bypassing the dispatcher.
    const revalidation = validationEngine.validate({
      request: {
        type: task.type,
        domain: task.domain,
        payload: task.payload,
        requestedBy: task.requested_by,
        approvedBy: task.approved_by ?? undefined,
      },
      riskLevel: task.risk_level,
    });
    if (revalidation.blocked) {
      const reason = `ADAPTER_REVALIDATION_FAILED: ${revalidation.blockedReason}`;
      await this.transition(task.id, "BLOCKED", { blocked_reason: reason });
      await this.log(task, "blocked", reason, 0);
      return { status: "FAILED", error: reason };
    }

    // Defense-in-depth #3: explicit CRITICAL gate.
    if (task.risk_level === "CRITICAL" && !task.approved_by) {
      const reason =
        `ADAPTER_REJECTED_CRITICAL: task ${task.id} (${task.type}) is CRITICAL without approved_by`;
      await this.transition(task.id, "BLOCKED", { blocked_reason: reason });
      await this.log(task, "blocked", reason, 0);
      return { status: "FAILED", error: reason };
    }

    // Soft handoff: if no real transport is wired, leave the row PENDING so
    // the server-side execution loop (task #711) can consume it. We do NOT
    // transition to RUNNING / FAILED in that case — that would strand the
    // task in a terminal failure state and break the handoff contract.
    if (this.transport.isPendingHandoff) {
      await this.log(
        task,
        "pending_handoff",
        "no orchestrator transport configured — left PENDING for server loop",
        0,
      );
      // Return PENDING (not FAILED) so callers and metrics distinguish a
      // deliberate soft handoff from an actual orchestrator failure. The DB
      // row remains in PENDING state for the server-side loop to consume.
      return {
        status: "PENDING",
        error: "PENDING_HANDOFF: task left in PENDING for server-side execution loop",
      };
    }

    await this.transition(task.id, "RUNNING", {
      attempt_count: task.attempt_count + 1,
    });

    const start = Date.now();
    let response: OrchestratorResponse;
    try {
      response = await this.transport.send(task);
    } catch (e) {
      response = {
        status: "FAILED",
        error: e instanceof Error ? e.message : String(e),
      };
    }
    const durationMs = Date.now() - start;

    if (response.status === "SUCCESS") {
      await this.transition(task.id, "SUCCESS", {
        result: response.result ?? {},
        error: null,
      });
    } else {
      await this.transition(task.id, "FAILED", {
        error: response.error ?? "unknown orchestrator failure",
      });
    }

    await this.log(task, response.status.toLowerCase(), response.error ?? "ok", durationMs);
    return response;
  }

  private async transition(
    id: string,
    status: ExecutionTaskStatus,
    extra: Partial<ExecutionTaskRow> = {},
  ): Promise<void> {
    // Fail-fast on DB errors. Supabase returns `{ error }` on update without
    // throwing, so we must inspect the result explicitly — silently swallowing
    // a failed transition would corrupt the audit trail and leave tasks
    // stranded in an inconsistent state.
    const { error } = await domainDb.system
      .from("execution_tasks")
      .update({ status, ...extra } as never)
      .eq("id", id);
    if (error) {
      throw new Error(
        `execution_tasks transition failed for id=${id} status=${status}: ${error.message}`,
      );
    }
  }

  private async log(
    task: ExecutionTaskRow,
    outcome: string,
    detail: string,
    durationMs: number,
  ): Promise<void> {
    await logEngineRun({
      engineName: "orchestrator-adapter",
      category: "execution-layer",
      fn: async () => ({
        summary:
          `task=${task.id} type=${task.type} domain=${task.domain} ` +
          `risk=${task.risk_level} outcome=${outcome} detail=${detail} duration_ms=${durationMs}`,
        rowsAffected: 1,
        metadata: {
          taskId: task.id,
          type: task.type,
          domain: task.domain,
          riskLevel: task.risk_level,
          outcome,
          detail,
          durationMs,
        },
      }),
    }).catch(() => {});
  }
}

export const orchestratorAdapter = new OrchestratorAdapter();
