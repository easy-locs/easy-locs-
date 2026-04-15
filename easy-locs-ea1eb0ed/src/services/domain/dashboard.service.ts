import { dashboardRepo } from "@/repositories/domain/dashboard.repo";
import { loadCardsFromServer, type DashboardCard } from "@/lib/runtime/read-models";
import { db } from "@/services/db";
import {
  getAnomalyEvents,
  getAllDomainMetrics,
  type AnomalyEvent,
} from "@/lib/runtime/anomaly-detection";
import { getDbHealthSummary } from "@/lib/runtime/db-observability";

export interface AutonomySystem {
  system_name: string;
  display_name: string;
  status: "green" | "yellow" | "red" | "unknown";
  last_run_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  success_count_24h: number;
  fail_count_24h: number;
  last_error_message: string | null;
  metadata_json: Record<string, unknown>;
  updated_at: string;
}

export interface DlqStats {
  pending: number;
  retrying: number;
  dead: number;
  resolved: number;
}

export interface JobQueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface UptimeEntry {
  status: string;
  total_ms: number;
  consecutive_failures: number;
  created_at: string;
}

export interface AutonomyDashboardData {
  systems: AutonomySystem[];
  dlqStats: DlqStats;
  jobStats: JobQueueStats;
  uptimeHistory: UptimeEntry[];
  readModelCards: DashboardCard[];
  anomalyEvents: AnomalyEvent[];
  domainMetrics: Record<string, unknown>;
  dbHealth: ReturnType<typeof getDbHealthSummary> | null;
}

export async function fetchAutonomyDashboardData(): Promise<AutonomyDashboardData> {
  const [
    systems,
    dlqPending,
    dlqRetrying,
    dlqDead,
    dlqResolved,
    jobPending,
    jobProcessing,
    jobCompleted,
    jobFailed,
    uptimeHistory,
  ] = await Promise.all([
    dashboardRepo.fetchAutonomySystemStatus(),
    dashboardRepo.countDlq("pending"),
    dashboardRepo.countDlq("retrying"),
    dashboardRepo.countDlq("dead"),
    dashboardRepo.countDlq("resolved"),
    dashboardRepo.countJobQueue("pending"),
    dashboardRepo.countJobQueue("processing"),
    dashboardRepo.countJobQueue("completed"),
    dashboardRepo.countJobQueue("failed"),
    dashboardRepo.fetchUptimeHistory(),
  ]);

  const readModelCards = await loadCardsFromServer(db).catch(() => [] as DashboardCard[]);
  const anomalyEvents = getAnomalyEvents(undefined, 20);
  const domainMetrics = getAllDomainMetrics();
  const dbHealthResult = getDbHealthSummary();

  return {
    systems: systems as AutonomySystem[],
    dlqStats: {
      pending: dlqPending,
      retrying: dlqRetrying,
      dead: dlqDead,
      resolved: dlqResolved,
    },
    jobStats: {
      pending: jobPending,
      processing: jobProcessing,
      completed: jobCompleted,
      failed: jobFailed,
    },
    uptimeHistory: uptimeHistory as UptimeEntry[],
    readModelCards,
    anomalyEvents,
    domainMetrics,
    dbHealth: dbHealthResult,
  };
}

export async function triggerAutonomySystem(systemName: string) {
  const targetMap: Record<string, string> = {
    pg_cron_dispatcher: "autonomous-cron-dispatcher",
    dead_letter_queue: "dlq-processor",
    uptime_watchdog: "watchdog-ping",
    job_queue: "job-queue-worker",
    state_cache: "cache-manager",
    storage_backup: "backup-storage",
  };

  const target = targetMap[systemName];
  if (!target) return;

  const payloadMap: Record<string, Record<string, unknown>> = {
    "cache-manager": { action: "refresh_all" },
  };

  await dashboardRepo.triggerAdminFunction(target, payloadMap[target] ?? {});
}
