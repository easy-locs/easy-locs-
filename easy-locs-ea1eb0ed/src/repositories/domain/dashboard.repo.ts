import { domainDb, db } from "@/services/db";
import { supabase } from "@/integrations/supabase/client";

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
   * (task #712). Includes payload, execution_result and error_code so the
   * dashboard can render structured logs, return values and error details
   * inline. Reads only the canonical V2 columns — the legacy
   * `result`/`error` pair was retired in task #851.
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
        // Task #850 — switched from legacy `result`/`error` to the V2
        // `execution_result`/`error_code` columns. The GitHub-runner
        // callback (#848) no longer writes the legacy columns, and task
        // #851 dropped them entirely, so the admin Execution Tasks panel
        // must read the canonical V2 shape to surface logs, github_status,
        // and error details.
        "id, type, domain, risk_level, status, payload, execution_result, error_code, requested_by, parent_task_id, blocked_reason, approved_by, approved_at, idempotency_key, attempt_count, max_attempts, runner, external_run_url, pr_url, created_at, updated_at",
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
        // LB1 #834 — `execution_result` is the canonical post-execute
        // payload (includes verifier output, tool calls, generated
        // response). The decision drawer surfaces those AI fields, so
        // we MUST select the column or the inbox shows blank metadata.
        // Legacy `result`/`error` columns were retired in task #851.
        "id, type, domain, risk_level, status, payload, previous_state, execution_result, error_code, requested_by, parent_task_id, blocked_reason, approved_by, approved_at, agent_id, idempotency_key, attempt_count, max_attempts, created_at, updated_at",
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

  // ── Sovereign Agent Control · L5 (#812) ─────────────────────────────
  /**
   * Returns the open approvals queue — every execution_task currently in
   * `pending_review`, ordered oldest-first so reviewers attack the
   * back-log FIFO. Selected fields stay in sync with the
   * AdminApprovalsPage table; if the admin needs the raw payload they
   * open the decision drawer which calls fetchExecutionTaskById.
   */
  async fetchPendingApprovals(opts?: { limit?: number }) {
    const limit = opts?.limit ?? 100;
    const { data, error } = await domainDb.system
      .from("execution_tasks")
      .select(
        "id, type, domain, risk_level, status, requested_by, agent_id, blocked_reason, approval_policy, created_at, updated_at",
      )
      .eq("status", "pending_review")
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error)
      throw new Error(`fetchPendingApprovals failed: ${error.message}`);
    return data ?? [];
  },

  /**
   * LC7 (#874) — fetch every execution_task currently halted by the
   * drift detector. These rows live at `status = 'blocked'` with the
   * sentinel `blocked_reason = 'BLOCKED_BY_DRIFT'` and carry a
   * `drift_report` JSONB describing the file/line conflict.
   */
  async fetchDriftBlockedTasks(opts?: { limit?: number }) {
    const limit = opts?.limit ?? 100;
    const { data, error } = await domainDb.system
      .from("execution_tasks")
      .select(
        "id, type, domain, risk_level, status, requested_by, agent_id, blocked_reason, drift_report, created_at, updated_at",
      )
      .eq("status", "blocked")
      .eq("blocked_reason", "BLOCKED_BY_DRIFT")
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error)
      throw new Error(`fetchDriftBlockedTasks failed: ${error.message}`);
    return data ?? [];
  },

  /**
   * LC7 (#874) — operator "Replan" action. Stamps a
   * `replan_requested_at` marker into the existing drift_report so an
   * LC3 planner trigger downstream can pick it up. NEVER calls LC4
   * builder directly. Read-only on every other table.
   */
  async requestDriftReplan(taskId: string) {
    // Control-plane invariant (#812): mutations on `system.execution_tasks`
    // are RPC-only — `INSERT/UPDATE/DELETE` is REVOKED from `authenticated`
    // (see migration 20260418300000_execution_tasks.sql). The Replan
    // marker therefore goes through `system.request_drift_replan`, a
    // SECURITY DEFINER RPC that asserts admin role, validates the
    // BLOCKED_BY_DRIFT precondition, and stamps the marker into the
    // existing `drift_report` JSONB. The RPC returns the updated
    // drift_report so the UI can show "Replan requested at …" without
    // a follow-up read.
    const { data, error } = await (
      supabase.schema("system") as unknown as {
        rpc: (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      }
    ).rpc("request_drift_replan", { p_task_id: taskId });
    if (error) throw new Error(`requestDriftReplan failed: ${error.message}`);
    return { ok: true, drift_report: (data as Record<string, unknown> | null) ?? null } as const;
  },

  /**
   * Decisions log for a single task. Powers the “Decisions” tab on
   * ExecutionTaskPanel and the strip at the top of the decision drawer
   * (so an admin sees prior comments / changes_requested before voting).
   *
   * IMPORTANT — read path is RPC-only (#812 control-plane invariant).
   * Direct SELECT on `system.task_approvals` is REVOKED for the
   * `authenticated` role; the only way to observe the audit trail is
   * `system.list_task_approvals(p_task_id)`, which checks the admin
   * role and returns rows ordered by `decided_at ASC`.
   */
  async fetchTaskApprovals(taskId: string) {
    const { data, error } = await (
      supabase.schema("system") as unknown as {
        rpc: (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{
          data: Array<Record<string, unknown>> | null;
          error: { message: string } | null;
        }>;
      }
    ).rpc("list_task_approvals", { p_task_id: taskId });
    if (error) throw new Error(`fetchTaskApprovals failed: ${error.message}`);
    return data ?? [];
  },

  /**
   * Idempotent wrapper over `system.decide_task_approval`. The DB RPC
   * enforces the legal state machine (pending_review → approved /
   * rejected / changes_requested) and rejects illegal transitions with
   * `invalid_state` so the UI can surface a precise error. Passing the
   * same `clientRequestId` twice returns the original audit row instead
   * of duplicating the decision — safe to retry.
   */
  async decideTaskApproval(input: {
    taskId: string;
    decision: "approved" | "rejected" | "changes_requested" | "comment";
    reason?: string | null;
    commentMd?: string | null;
    clientRequestId?: string | null;
  }) {
    const { data, error } = await (
      supabase.schema("system") as unknown as {
        rpc: (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      }
    ).rpc("decide_task_approval", {
      p_task_id: input.taskId,
      p_decision: input.decision,
      p_reason: input.reason ?? null,
      p_comment_md: input.commentMd ?? null,
      p_client_request_id: input.clientRequestId ?? null,
    });
    if (error) throw new Error(`decideTaskApproval failed: ${error.message}`);
    return data;
  },
};
