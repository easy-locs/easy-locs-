import { domainDb, db } from "@/services/db";

export {
  fetchUserOrg,
  fetchOrgMembers,
  fetchBuildings,
  upsertBuilding,
  deleteBuilding,
} from "@/repositories/dashboard.repository";

export const dashboardRepo = {
  async fetchSystemStatus() {
    const { data } = await domainDb.system
      .from("engine_supervisor")
      .select("*")
      .order("updated_at", { ascending: false });
    return data ?? [];
  },

  async fetchEngineRunLogs(limit = 50) {
    const { data } = await domainDb.system
      .from("engine_run_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  },

  async fetchWorkerHealth() {
    const { data } = await domainDb.system
      .from("worker_health_snapshots")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    return data ?? [];
  },

  async fetchSupportTickets(orgId: string) {
    const { data } = await domainDb.support
      .from("support_tickets")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    return data ?? [];
  },

  async fetchAutonomySystemStatus() {
    const { data } = await db.from("autonomy_system_status").select("*").order("system_name");
    return data ?? [];
  },

  async countDlq(status: string) {
    const { count } = await db.from("dead_letter_queue").select("id", { count: "exact", head: true }).eq("status", status);
    return count ?? 0;
  },

  async countJobQueue(status: string) {
    const { count } = await db.from("job_queue").select("id", { count: "exact", head: true }).eq("status", status);
    return count ?? 0;
  },

  async fetchUptimeHistory(limit = 20) {
    const { data } = await db.from("system_uptime_log").select("status, total_ms, consecutive_failures, created_at").order("created_at", { ascending: false }).limit(limit);
    return data ?? [];
  },

  async triggerAdminFunction(target: string, payload: Record<string, unknown>) {
    await db.functions.invoke("admin-trigger", {
      body: { target, payload },
    });
  },

  /**
   * Autonomous Execution Layer (task #710) — admin-visible task feed.
   * Reads system.execution_tasks via the schema-scoped client. RLS already
   * restricts SELECT to admins, so non-admin callers naturally get an empty
   * list. Filters are optional and are applied server-side when provided.
   */
  async fetchExecutionTasks(opts?: {
    status?: string;
    riskLevel?: string;
    limit?: number;
  }) {
    const limit = opts?.limit ?? 50;
    let query = domainDb.system
      .from("execution_tasks")
      .select(
        "id, type, domain, risk_level, status, requested_by, blocked_reason, approved_by, idempotency_key, attempt_count, max_attempts, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (opts?.status) query = query.eq("status", opts.status);
    if (opts?.riskLevel) query = query.eq("risk_level", opts.riskLevel);

    const { data, error } = await query;
    if (error) throw new Error(`fetchExecutionTasks failed: ${error.message}`);
    return data ?? [];
  },

  /**
   * Full-row variant of fetchExecutionTasks for the live execution panel
   * (task #712). Includes payload, result and error so the dashboard can
   * render structured logs, return values and error details inline.
   */
  async fetchExecutionTasksFull(opts?: {
    status?: string;
    riskLevel?: string;
    limit?: number;
  }) {
    const limit = opts?.limit ?? 50;
    let query = domainDb.system
      .from("execution_tasks")
      .select(
        "id, type, domain, risk_level, status, payload, result, error, requested_by, parent_task_id, blocked_reason, approved_by, approved_at, idempotency_key, attempt_count, max_attempts, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (opts?.status) query = query.eq("status", opts.status);
    if (opts?.riskLevel) query = query.eq("risk_level", opts.riskLevel);

    const { data, error } = await query;
    if (error) throw new Error(`fetchExecutionTasksFull failed: ${error.message}`);
    return data ?? [];
  },

  async fetchExecutionTaskById(id: string) {
    const { data, error } = await domainDb.system
      .from("execution_tasks")
      .select(
        "id, type, domain, risk_level, status, payload, result, error, requested_by, parent_task_id, blocked_reason, approved_by, approved_at, idempotency_key, attempt_count, max_attempts, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`fetchExecutionTaskById failed: ${error.message}`);
    return data ?? null;
  },

  async countExecutionTasks(filters: { status?: string; riskLevel?: string }) {
    let query = domainDb.system
      .from("execution_tasks")
      .select("id", { count: "exact", head: true });
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.riskLevel) query = query.eq("risk_level", filters.riskLevel);
    const { count } = await query;
    return count ?? 0;
  },
};
