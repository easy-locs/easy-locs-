import { db } from "@/services/db";

export async function listKpiSnapshots(_workspaceId: string) {
  const { data: healthSnaps } = await db("worker_health_snapshots")
    .select("snapshot_at, total_engines, healthy_count, error_count, avg_success_rate, total_runs_last_hour")
    .order("snapshot_at", { ascending: false })
    .limit(7);

  if (healthSnaps && healthSnaps.length > 0) {
    return healthSnaps.map((s: Record<string, unknown>) => ({
      snapshot_date: String(s.snapshot_at ?? "").slice(0, 10),
      orders_count: Number(s.total_runs_last_hour ?? 0),
      gross_revenue: 0,
      active_drivers: Number(s.healthy_count ?? 0),
      active_merchants: Number(s.total_engines ?? 0),
    }));
  }

  const { data: logs } = await db("engine_run_logs")
    .select("started_at, status")
    .order("started_at", { ascending: false })
    .limit(50);

  if (!logs || logs.length === 0) return [];

  const byDate = new Map<string, { total: number; success: number }>();
  for (const l of logs) {
    const d = String(l.started_at ?? "").slice(0, 10);
    if (!d) continue;
    const entry = byDate.get(d) ?? { total: 0, success: 0 };
    entry.total++;
    if (l.status === "success") entry.success++;
    byDate.set(d, entry);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({
      snapshot_date: date,
      orders_count: stats.total,
      gross_revenue: 0,
      active_drivers: stats.success,
      active_merchants: stats.total,
    }));
}
