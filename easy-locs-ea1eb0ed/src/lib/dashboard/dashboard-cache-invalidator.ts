/**
 * dashboard-cache-invalidator — Atomic unit: invalidate dashboard caches on events.
 * Uses canonical APP_EVENTS.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

let queryClientRef: any = null;

const DASHBOARD_QUERY_KEYS = [
  "dashboard-kpis", "dashboard-orders", "dashboard-revenue",
  "dashboard-counters", "seller-analytics-v2",
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
    platformBus.on(APP_EVENTS.DASHBOARD_REFRESH as any, () => invalidateDashboardCaches()),
    platformBus.on(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH as any, () => invalidateDashboardCaches()),
    platformBus.on(APP_EVENTS.STOREFRONT_ORDER_PLACED as any, () => invalidateDashboardCaches()),
    platformBus.on(APP_EVENTS.STOREFRONT_ORDER_COMPLETED as any, () => invalidateDashboardCaches()),
    platformBus.on(APP_EVENTS.ORDER_COMPLETED as any, () => invalidateDashboardCaches()),
    platformBus.on(APP_EVENTS.WALLET_PAYMENT_SUCCESS as any, () => invalidateDashboardCaches()),
    platformBus.on(APP_EVENTS.RENTAL_RENT_CALL_PAID as any, () => invalidateDashboardCaches()),
    platformBus.on(APP_EVENTS.DELIVERY_COMPLETED as any, () => invalidateDashboardCaches()),
  ];
  return () => unsubs.forEach(u => u());
}
