import { db } from "@/services/db";
import { getDispatchMetrics } from "./dispatch-learning-engine";
import { computeZoneHeatMap } from "./smart-zone-manager";
import { platformBus } from "@/lib/shared/platform-bus";

export interface DispatchHealthReport {
  status: "healthy" | "degraded" | "critical";
  activeJobs: number;
  pendingOffers: number;
  onlineRiders: number;
  availableRiders: number;
  avgMatchTimeMs: number;
  successRate: number;
  hotZones: number;
  surgeZones: number;
  failedJobsLastHour: number;
  metrics: ReturnType<typeof getDispatchMetrics>;
  timestamp: string;
}

export async function getDispatchHealth(): Promise<DispatchHealthReport> {
  const [
    { data: activeJobs },
    { data: pendingOffers },
    { data: onlineRiders },
    { data: failedJobs },
  ] = await Promise.all([
    db
      .from("mobility_jobs")
      .select("id", { count: "exact", head: true })
      .in("status", ["searching", "offered", "accepted", "rider_arriving_pickup", "picked_up", "in_progress"]),
    db
      .from("mobility_job_offers")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    db
      .from("rider_presence")
      .select("user_id, is_available", { count: "exact" })
      .eq("is_online", true),
    db
      .from("mobility_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed_no_rider")
      .gte("created_at", new Date(Date.now() - 3600000).toISOString()),
  ]);

  const metrics = getDispatchMetrics();
  const heatMap = await computeZoneHeatMap();

  const activeCount = (activeJobs as any)?.length ?? 0;
  const pendingCount = (pendingOffers as any)?.length ?? 0;
  const onlineCount = (onlineRiders as any)?.length ?? 0;
  const availableCount = Array.isArray(onlineRiders)
    ? onlineRiders.filter((r: any) => r.is_available).length
    : 0;
  const failedCount = (failedJobs as any)?.length ?? 0;
  const hotZones = heatMap.zones.filter((z) => z.label === "hot").length;
  const surgeZones = heatMap.zones.filter((z) => z.label === "surge").length;

  let status: "healthy" | "degraded" | "critical" = "healthy";

  if (metrics.avgMatchTimeMs > 3000 || metrics.successRate < 50) {
    status = "critical";
  } else if (metrics.avgMatchTimeMs > 1500 || metrics.successRate < 70 || failedCount > 10) {
    status = "degraded";
  }

  return {
    status,
    activeJobs: activeCount,
    pendingOffers: pendingCount,
    onlineRiders: onlineCount,
    availableRiders: availableCount,
    avgMatchTimeMs: metrics.avgMatchTimeMs,
    successRate: metrics.successRate,
    hotZones,
    surgeZones,
    failedJobsLastHour: failedCount,
    metrics,
    timestamp: new Date().toISOString(),
  };
}

let monitorInterval: ReturnType<typeof setInterval> | null = null;

export function startDispatchMonitor(intervalMs = 30_000) {
  if (monitorInterval) return;

  monitorInterval = setInterval(async () => {
    try {
      const health = await getDispatchHealth();

      if (health.status === "critical") {
        platformBus.emit("dispatch:health_alert", {
          status: "critical",
          avgMatchTimeMs: health.avgMatchTimeMs,
          successRate: health.successRate,
          failedJobs: health.failedJobsLastHour,
        }, "system");
      }
    } catch {
    }
  }, intervalMs);
}

export function stopDispatchMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}
