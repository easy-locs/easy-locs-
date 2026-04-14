/**
 * cron-monitor — Client-side monitor for cron job execution status.
 *
 * Tracks pg_cron job execution history, alerts on failures, provides
 * status dashboard data. Queries cron_execution_log table for insights.
 */

import { db } from "@/services/db";

export interface CronJobStatus {
  jobName: string;
  lastRunAt: string | null;
  lastStatus: "success" | "failure" | "running" | "unknown";
  lastDurationMs: number | null;
  failureCount24h: number;
  successCount24h: number;
  nextExpectedRun: string | null;
}

export interface CronExecutionLog {
  id: string;
  job_name: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  duration_ms: number | null;
  error_message: string | null;
  rows_affected: number | null;
}

const KNOWN_CRON_JOBS = [
  { name: "cleanup-orphan-media", schedule: "0 3 * * *", description: "Remove orphaned media assets" },
  { name: "prune-expired-sessions", schedule: "*/30 * * * *", description: "Clean expired auth sessions" },
  { name: "refresh-fx-rates", schedule: "*/15 * * * *", description: "Update foreign exchange rates" },
  { name: "aggregate-analytics", schedule: "0 */6 * * *", description: "Aggregate analytics data" },
  { name: "health-snapshot", schedule: "*/5 * * * *", description: "Worker health snapshot" },
] as const;

export async function getCronJobStatuses(): Promise<CronJobStatus[]> {
  const statuses: CronJobStatus[] = [];
  const cutoff24h = new Date(Date.now() - 86_400_000).toISOString();

  for (const job of KNOWN_CRON_JOBS) {
    try {
      const { data: recent } = await db("cron_execution_log")
        .select("*")
        .eq("job_name", job.name)
        .gte("started_at", cutoff24h)
        .order("started_at", { ascending: false })
        .limit(50);

      const logs = (recent ?? []) as CronExecutionLog[];
      const last = logs[0] ?? null;

      statuses.push({
        jobName: job.name,
        lastRunAt: last?.started_at ?? null,
        lastStatus: last ? (last.status as CronJobStatus["lastStatus"]) : "unknown",
        lastDurationMs: last?.duration_ms ?? null,
        failureCount24h: logs.filter((l) => l.status === "failure").length,
        successCount24h: logs.filter((l) => l.status === "success").length,
        nextExpectedRun: null,
      });
    } catch {
      statuses.push({
        jobName: job.name,
        lastRunAt: null,
        lastStatus: "unknown",
        lastDurationMs: null,
        failureCount24h: 0,
        successCount24h: 0,
        nextExpectedRun: null,
      });
    }
  }

  return statuses;
}

export async function getRecentCronLogs(
  jobName?: string,
  limit = 20,
): Promise<CronExecutionLog[]> {
  let query = db("cron_execution_log")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (jobName) {
    query = query.eq("job_name", jobName);
  }

  const { data } = await query;
  return (data ?? []) as CronExecutionLog[];
}

export async function getCronHealthSummary(): Promise<{
  totalJobs: number;
  healthy: number;
  failing: number;
  unknown: number;
  overallStatus: "healthy" | "degraded" | "critical";
}> {
  const statuses = await getCronJobStatuses();
  const healthy = statuses.filter((s) => s.lastStatus === "success" && s.failureCount24h === 0).length;
  const failing = statuses.filter((s) => s.lastStatus === "failure" || s.failureCount24h > 2).length;
  const unknown = statuses.filter((s) => s.lastStatus === "unknown").length;

  return {
    totalJobs: statuses.length,
    healthy,
    failing,
    unknown,
    overallStatus: failing > 0 ? "critical" : unknown > 1 ? "degraded" : "healthy",
  };
}

export function getKnownCronJobs() {
  return KNOWN_CRON_JOBS;
}
