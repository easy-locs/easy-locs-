/**
 * Audit Trail Engine — Ensures critical business actions are logged in activity_logs.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function runAuditTrailCheck() {
  // Count recent activity logs
  const recentCutoff = new Date(Date.now() - 24 * 3600_000).toISOString();

  const { count: recentLogs } = await db
    .from("activity_logs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", recentCutoff);

  const { count: totalLogs } = await db
    .from("activity_logs")
    .select("id", { count: "exact", head: true });

  // Count recent audit_logs
  const { count: recentAudits } = await db
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", recentCutoff);

  return {
    recentActivityLogs: recentLogs ?? 0,
    totalActivityLogs: totalLogs ?? 0,
    recentAuditLogs: recentAudits ?? 0,
  };
}
