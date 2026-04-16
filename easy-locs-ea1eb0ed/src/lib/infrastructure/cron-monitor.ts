/**
 * cron-monitor — Cron job execution monitoring via admin-scoped queries.
 *
 * Queries cron_execution_log table (admin RLS policy) for pg_cron job health.
 * Provides status dashboard data, failure alerts, and health summaries.
 * Only admin users can access this data via the is_admin() RLS check.
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
  { name: "cleanup-expired-cache", schedule: "*/30 * * * *", description: "Remove expired server cache entries" },
  { name: "cleanup-rate-limits", schedule: "*/5 * * * *", description: "Clean expired rate limit windows" },
  { name: "cleanup-uptime-logs", schedule: "0 3 * * *", description: "Prune old uptime log entries" },
  { name: "cleanup-server-events", schedule: "0 * * * *", description: "Clean old server event records" },
  { name: "prune-cron-execution-log", schedule: "0 4 * * *", description: "Prune cron logs older than 30 days" },
  { name: "prune-completed-jobs", schedule: "0 5 * * *", description: "Prune completed/dead jobs older than 7 days" },
  { name: "cleanup-orphan-media", schedule: "0 */6 * * *", description: "Remove orphaned media assets" },
  { name: "autonomous-cron-dispatcher", schedule: "*/5 * * * *", description: "Core autonomous server-side dispatcher" },
  { name: "cron-response-reconcile", schedule: "*/2 * * * *", description: "Reconcile pg_net dispatch responses for all cron jobs" },
  { name: "prayer-push-cron", schedule: "* * * * *", description: "Prayer push notification dispatcher" },
  { name: "process-job-queue", schedule: "* * * * *", description: "Job queue processor via job-runner edge function" },
  { name: "dlq-processor", schedule: "*/2 * * * *", description: "Dead letter queue retry processor" },
  { name: "watchdog-ping", schedule: "* * * * *", description: "System health check and agent watchdog" },
  { name: "email-queue-process", schedule: "*/2 * * * *", description: "Email queue processor" },
  { name: "expire-pending-referrals", schedule: "0 2 * * *", description: "Expire pending referral codes" },
  { name: "job-queue-worker", schedule: "* * * * *", description: "Job queue worker edge function" },
  { name: "cache-manager-refresh", schedule: "*/5 * * * *", description: "Server-side cache refresh" },
  { name: "backup-storage-nightly", schedule: "0 3 * * *", description: "Nightly storage manifest backup" },
  { name: "external-health-check", schedule: "* * * * *", description: "External public health check" },
  { name: "integration-health-cron", schedule: "*/5 * * * *", description: "Automated integration health checks (Plaid, LiveKit, Meilisearch)" },
  { name: "prune-integration-health-log", schedule: "0 2 * * 0", description: "Prune integration health logs older than 90 days" },
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
