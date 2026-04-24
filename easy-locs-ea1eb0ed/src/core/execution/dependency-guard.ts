/**
 * Dependency guard — client-side helpers for the agent watchdog hardening
 * (task #1016).
 *
 * The actual enforcement lives in SQL (`system.validate_task_dependency`,
 * `system.add_task_dependency`, `system.run_agent_watchdog`). This module
 * only exists so the dispatcher and dashboard can talk to those RPCs
 * through a typed surface, and so the rules ("a dependency may only point
 * at a task in approved/queued/running/succeeded state") are documented in
 * one place that is mirrored by the unit tests.
 */

import { db } from "@/services/db";
import type { ExecutionTaskStatus } from "./types";

/** States that a *blocker* may legally be in. */
export const ALLOWED_DEPENDENCY_STATES: readonly ExecutionTaskStatus[] = [
  "approved",
  "queued",
  "running",
  "succeeded",
] as const;

/** Reason codes mirrored from `system.validate_task_dependency`. */
export type DependencyRejectionCode =
  | "DEPENDENCY_NULL"
  | "DEPENDENCY_NOT_FOUND"
  | "DEPENDENCY_NOT_APPROVED"
  | "DEPENDENCY_SELF_REFERENCE";

export interface DependencyCheckResult {
  ok: boolean;
  reasonCode?: DependencyRejectionCode;
  dependsOn?: string;
  dependsOnStatus?: ExecutionTaskStatus;
}

/**
 * Pure, in-memory mirror of `system.validate_task_dependency`. The SQL
 * implementation is the source of truth; this function exists so the
 * dispatcher can short-circuit at the boundary AND so the unit tests can
 * verify both sides agree without hitting the database.
 */
export function checkDependency(
  dependsOn: string | null | undefined,
  upstreamStatus: ExecutionTaskStatus | null | undefined,
): DependencyCheckResult {
  if (!dependsOn) {
    return { ok: false, reasonCode: "DEPENDENCY_NULL" };
  }
  if (upstreamStatus == null) {
    return { ok: false, reasonCode: "DEPENDENCY_NOT_FOUND", dependsOn };
  }
  if (!ALLOWED_DEPENDENCY_STATES.includes(upstreamStatus)) {
    return {
      ok: false,
      reasonCode: "DEPENDENCY_NOT_APPROVED",
      dependsOn,
      dependsOnStatus: upstreamStatus,
    };
  }
  return { ok: true, dependsOn, dependsOnStatus: upstreamStatus };
}

interface SystemRpcClient {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
}

function systemClient(): SystemRpcClient {
  return db.schema("system") as unknown as SystemRpcClient;
}

/**
 * Server-side dependency check. Returns the same shape as
 * `checkDependency` so call sites can treat the two interchangeably.
 * Any RPC error surfaces as `DEPENDENCY_NOT_FOUND` to fail closed.
 */
export async function validateDependency(
  dependsOn: string,
): Promise<DependencyCheckResult> {
  const { data, error } = await systemClient().rpc(
    "validate_task_dependency",
    { p_depends_on: dependsOn },
  );
  if (error) {
    return { ok: false, reasonCode: "DEPENDENCY_NOT_FOUND", dependsOn };
  }
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    ok: r.ok === true,
    reasonCode: (r.reason_code as DependencyRejectionCode | undefined) ??
      undefined,
    dependsOn: (r.depends_on as string | undefined) ?? dependsOn,
    dependsOnStatus:
      (r.depends_on_status as ExecutionTaskStatus | undefined) ?? undefined,
  };
}

/**
 * Persist a dependency edge. Throws on rejection so the caller can surface
 * the failure to the operator. Every rejection is also recorded in
 * `system.agent_incident_log` by the SQL function.
 */
export async function addTaskDependency(args: {
  taskId: string;
  dependsOn: string;
  actor?: string;
}): Promise<void> {
  const { error } = await systemClient().rpc("add_task_dependency", {
    p_task_id: args.taskId,
    p_depends_on: args.dependsOn,
    p_actor: args.actor ?? "system",
  });
  if (error) {
    throw new Error(
      `add_task_dependency rejected: ${error.message}`,
    );
  }
}

export interface WatchdogHealth {
  healthy: boolean;
  lastRunAt: string | null;
  silenceSeconds: number | null;
  maxSilenceSeconds: number | null;
  openIncidents24h: number;
  reason?: string;
}

export async function fetchWatchdogHealth(): Promise<WatchdogHealth> {
  const { data, error } = await systemClient().rpc(
    "agent_watchdog_health",
    {},
  );
  if (error) {
    return {
      healthy: false,
      lastRunAt: null,
      silenceSeconds: null,
      maxSilenceSeconds: null,
      openIncidents24h: 0,
      reason: error.message,
    };
  }
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    healthy: r.healthy === true,
    lastRunAt: (r.last_run_at as string | null) ?? null,
    silenceSeconds: (r.silence_seconds as number | null) ?? null,
    maxSilenceSeconds: (r.max_silence_seconds as number | null) ?? null,
    openIncidents24h: (r.open_incidents_24h as number | undefined) ?? 0,
    reason: (r.reason as string | undefined) ?? undefined,
  };
}
