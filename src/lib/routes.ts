/**
 * Centralized route helpers for Easy-Locs.
 * Use these instead of hardcoding paths in components.
 */
export const routes = {
  qr: (code: string) => `/qr/entry/${encodeURIComponent(code)}`,
  tracking: (orderId: string) => `/tracking/order/${encodeURIComponent(orderId)}`,
  driverMission: (id: string) => `/driver/mission/${encodeURIComponent(id)}`,
  merchantDelivery: () => `/merchant/delivery-monitor`,
  merchantPos: () => `/merchant/pos`,
  merchantKitchen: () => `/merchant/kitchen`,
  walletDiagnostics: () => `/admin/wallet-diagnostics`,
  dispatchDiagnostics: () => `/admin/dispatch-diagnostics`,
  automations: () => `/admin/automations`,
  automationHealth: () => `/admin/automation-health`,
  opsExceptions: () => `/admin/ops-exceptions`,
  reviewQueue: () => `/admin/review-queue`,
  growthDashboard: () => `/admin/growth`,
  growthEngine: () => `/admin/growth-engine`,
  driverEarnings: () => `/driver/earnings`,
  driverMissions: () => `/driver/missions`,
  comingSoon: (slug: string) => `/coming-soon/${encodeURIComponent(slug)}`,
  cityMarket: (citySlug: string) => `/city-market/${encodeURIComponent(citySlug)}`,
  cityVertical: (countryCode: string, city: string, vertical: string, locale: string) =>
    `/city/${encodeURIComponent(countryCode)}/${encodeURIComponent(city)}/${encodeURIComponent(vertical)}/${encodeURIComponent(locale)}`,
  importTestBatches: () => `/admin/import-test-batches`,
  qrEntry: (targetCode: string) => `/qr/entry/${encodeURIComponent(targetCode)}`,
};
