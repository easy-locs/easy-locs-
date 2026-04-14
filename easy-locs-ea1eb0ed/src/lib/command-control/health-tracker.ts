import { db } from "@/services/db";
import type { HealthStatus, SystemHealthSnapshot } from "./types";

export async function recordSystemHealth(params: {
  component: string;
  status: HealthStatus;
  response_time_ms?: number;
  details?: Record<string, unknown>;
}): Promise<void> {
  await db("system_health_snapshots").insert({
    component: params.component,
    status: params.status,
    response_time_ms: params.response_time_ms || null,
    details: params.details || {},
  });
}

export async function getSystemHealthSummary(): Promise<{
  components: SystemHealthSnapshot[];
  overallStatus: HealthStatus;
}> {
  const { data } = await db("system_health_snapshots")
    .select("*")
    .order("checked_at", { ascending: false });

  const latestByComponent = new Map<string, SystemHealthSnapshot>();
  for (const snap of (data || []) as SystemHealthSnapshot[]) {
    if (!latestByComponent.has(snap.component)) {
      latestByComponent.set(snap.component, snap);
    }
  }

  const components = [...latestByComponent.values()];

  let overallStatus: HealthStatus = "healthy";
  if (components.some((c) => c.status === "down")) overallStatus = "down";
  else if (components.some((c) => c.status === "degraded")) overallStatus = "degraded";
  else if (components.some((c) => c.status === "unknown")) overallStatus = "unknown";

  return { components, overallStatus };
}
