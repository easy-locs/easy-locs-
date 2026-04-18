/**
 * Watchdog client primitives (Task #1017).
 *
 * Thin TypeScript surface over the SQL functions installed by
 * `20260503200000_watchdog_anti_deadlock.sql`. Lets the dispatcher and the
 * admin dashboard validate dependencies, read incident history, and inspect
 * stuck candidates without re-implementing the rules client-side.
 */

import { supabase } from "@/integrations/supabase/client";

const SYSTEM_SCHEMA = "system";

interface SystemRpcClient {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
}

function client(): SystemRpcClient {
  return supabase.schema(SYSTEM_SCHEMA) as unknown as SystemRpcClient;
}

// ── Dependency validation ────────────────────────────────────────────────
export type DependencyValidationReason =
  | "self_dependency"
  | "dependency_unknown"
  | "dependency_not_approved"
  | "dependency_cycle";

export interface DependencyValidationResult {
  ok: boolean;
  reason: DependencyValidationReason | null;
  offendingId: string | null;
  error?: string;
}

interface RawDepRow {
  ok: boolean;
  reason: DependencyValidationReason | null;
  offending_id: string | null;
}

/**
 * Validate a proposed dependency set BEFORE dispatching the task.
 *
 * The same check is enforced by the SQL trigger when explicit edges are
 * inserted into `system.task_dependencies`; calling this client-side gives
 * the dispatcher a chance to reject early with a structured reason that the
 * dashboard can render verbatim.
 */
export async function validateTaskDependencies(
  taskId: string,
  dependsOn: string[],
): Promise<DependencyValidationResult> {
  if (!taskId) {
    return { ok: false, reason: null, offendingId: null, error: "taskId is required" };
  }
  if (!dependsOn || dependsOn.length === 0) {
    return { ok: true, reason: null, offendingId: null };
  }

  const { data, error } = await client().rpc("validate_task_dependencies", {
    p_task_id: taskId,
    p_depends_on: dependsOn,
  });
  if (error) {
    return { ok: false, reason: null, offendingId: null, error: error.message };
  }
  const row = (Array.isArray(data) ? data[0] : data) as RawDepRow | null;
  if (!row) {
    return { ok: false, reason: null, offendingId: null, error: "validate_task_dependencies returned no row" };
  }
  return {
    ok: Boolean(row.ok),
    reason: row.reason,
    offendingId: row.offending_id,
  };
}

// ── Incident log ─────────────────────────────────────────────────────────
export type IncidentSeverity = "info" | "warn" | "error" | "critical";

export interface IncidentRow {
  id: string;
  kind: string;
  severity: IncidentSeverity;
  related_task_id: string | null;
  related_dependency_task_id: string | null;
  actor: string;
  evidence_json: Record<string, unknown>;
  created_at: string;
}

export async function listIncidents(limit = 200): Promise<{
  rows: IncidentRow[];
  error?: string;
}> {
  const { data, error } = await supabase
    .schema(SYSTEM_SCHEMA)
    .from("incident_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(1, Math.floor(limit)), 1000));
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as unknown as IncidentRow[] };
}

// ── Stuck candidates (read-only preview) ─────────────────────────────────
export interface StuckCandidate {
  task_id: string;
  task_type: string;
  domain: string;
  status: string;
  attempt_count: number | null;
  max_attempts: number | null;
  rule: string;
  evidence: Record<string, unknown>;
}

export async function previewStuckTasks(limit = 50): Promise<{
  rows: StuckCandidate[];
  error?: string;
}> {
  // Browser code MUST go through the admin-gated wrapper. The raw
  // `scan_stuck_tasks` RPC is service-role only (it surfaces operational
  // task metadata) — calling it from an authenticated user JWT returns
  // 42501. `admin_preview_stuck_tasks` is SECURITY DEFINER + checks
  // public.has_role(auth.uid(),'admin') in its body before delegating.
  const { data, error } = await client().rpc("admin_preview_stuck_tasks", {
    p_limit: Math.min(Math.max(1, Math.floor(limit)), 500),
  });
  if (error) return { rows: [], error: error.message };
  return { rows: (Array.isArray(data) ? data : []) as StuckCandidate[] };
}

// ── Recent watchdog interventions / timeouts ─────────────────────────────
export interface RecentTimeoutRow {
  id: string;
  type: string;
  domain: string;
  failure_class: string | null;
  error_code: string | null;
  failed_at: string | null;
  attempt_count: number | null;
}

// ── Watchdog loop health (last cron tick) ────────────────────────────────
export interface LoopHealthRow {
  id: string;
  started_at: string;
  finished_at: string | null;
  age_ms: number | null;
  status: string;
  effect_summary: string | null;
  error_message: string | null;
}

export async function listLoopHealth(limit = 20): Promise<{
  rows: LoopHealthRow[];
  error?: string;
}> {
  const { data, error } = await supabase
    .schema(SYSTEM_SCHEMA)
    .from("watchdog_loop_health")
    .select("*")
    .limit(Math.min(Math.max(1, Math.floor(limit)), 50));
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as unknown as LoopHealthRow[] };
}

// ── Manual overrides (super-admin only; SQL enforces) ────────────────────
export async function adminReleaseTaskLock(
  taskId: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!taskId) return { ok: false, error: "taskId is required" };
  const { data, error } = await client().rpc("admin_release_task_lock", {
    p_task_id: taskId,
    p_reason: reason ?? "manual override",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: Boolean(data) };
}

export async function adminForceFailTask(
  taskId: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!taskId) return { ok: false, error: "taskId is required" };
  const { data, error } = await client().rpc("admin_force_fail_task", {
    p_task_id: taskId,
    p_reason: reason ?? "manual override",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: Boolean(data) };
}

export async function listRecentTimeouts(limit = 100): Promise<{
  rows: RecentTimeoutRow[];
  error?: string;
}> {
  const { data, error } = await supabase
    .schema(SYSTEM_SCHEMA)
    .from("execution_tasks")
    .select("id,type,domain,failure_class,error_code,failed_at,attempt_count")
    .eq("status", "failed")
    .not("failure_class", "is", null)
    .order("failed_at", { ascending: false })
    .limit(Math.min(Math.max(1, Math.floor(limit)), 500));
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as unknown as RecentTimeoutRow[] };
}
