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
};
