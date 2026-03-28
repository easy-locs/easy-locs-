/**
 * dashboard-cache-invalidator — Atomic unit: invalidate dashboard caches on events.
 * Single responsibility: cache sync for dashboard domain.
 */
import { platformBus } from "@/lib/shared/platform-bus";

let queryClientRef: any = null;

const DASHBOARD_QUERY_KEYS = [
  "dashboard-kpis",
  "dashboard-orders",
  "dashboard-revenue",
  "dashboard-counters",
  "seller-analytics-v2",
] as const;

export function registerDashboardQueryClient(qc: any) {
  queryClientRef = qc;
}

export function invalidateDashboardCaches() {
  if (!queryClientRef) return;
  for (const key of DASHBOARD_QUERY_KEYS) {
    queryClientRef.invalidateQueries({ queryKey: [key] });
  }
}

export function installDashboardCacheListener(): () => void {
  const unsubs = [
    platformBus.on("dashboard:refresh" as any, () => invalidateDashboardCaches()),
    platformBus.on("dashboard:counters_refresh" as any, () => invalidateDashboardCaches()),
    platformBus.on("storefront:order_placed" as any, () => invalidateDashboardCaches()),
    platformBus.on("storefront:order_completed" as any, () => invalidateDashboardCaches()),
  ];
  return () => unsubs.forEach(u => u());
}
