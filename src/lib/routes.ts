/**
 * Centralized route helpers for Easy-Locs.
 * Use these instead of hardcoding paths in components.
 */
export const routes = {
  // QR
  qr: (code: string) => `/qr/entry/${encodeURIComponent(code)}`,
  qrEntry: (targetCode: string) => `/qr/entry/${encodeURIComponent(targetCode)}`,
  qrGenerate: () => `/admin/qr-generate`,

  // Tracking
  tracking: (orderId: string) => `/tracking/order/${encodeURIComponent(orderId)}`,

  // Driver
  driverMission: (id: string) => `/driver/mission/${encodeURIComponent(id)}`,
  driverEarnings: () => `/driver/earnings`,
  driverMissions: () => `/driver/missions`,

  // Merchant
  merchantDelivery: () => `/merchant/delivery-monitor`,
  merchantPos: () => `/merchant/pos`,
  merchantKitchen: () => `/merchant/kitchen`,
  merchantDashboard: () => `/merchant/dashboard`,
  merchantClaim: () => `/merchant/claim`,
  merchantOnboarding: () => `/merchant/onboarding`,

  // Admin
  walletDiagnostics: () => `/admin/wallet-diagnostics`,
  dispatchDiagnostics: () => `/admin/dispatch-diagnostics`,
  automations: () => `/admin/automations`,
  automationHealth: () => `/admin/automation-health`,
  opsExceptions: () => `/admin/ops-exceptions`,
  reviewQueue: () => `/admin/review-queue`,
  growthDashboard: () => `/admin/growth`,
  growthEngine: () => `/admin/growth-engine`,
  importTestBatches: () => `/admin/import-test-batches`,
  routeAudit: () => `/admin/route-audit`,
  restaurantSeedTest: () => `/admin/test-restaurants`,
  dubaiImport: () => `/admin/dubai-import`,
  alertCenter: () => `/admin/alerts`,
  incidents: () => `/admin/incidents`,
  auditDebug: () => `/admin/audit-debug`,
  opsWallboard: () => `/admin/ops-wallboard`,
  outreach: () => `/admin/outreach`,

  // Orbit
  orbitCallTest: () => `/orbit/call-test`,
  orbitIdentity: () => `/orbit/identity`,

  // Public
  comingSoon: (slug: string) => `/coming-soon/${encodeURIComponent(slug)}`,
  cityMarket: (citySlug: string) => `/city-market/${encodeURIComponent(citySlug)}`,
  cityVertical: (countryCode: string, city: string, vertical: string, locale: string) =>
    `/city/${encodeURIComponent(countryCode)}/${encodeURIComponent(city)}/${encodeURIComponent(vertical)}/${encodeURIComponent(locale)}`,

  // Dashboard
  dashboard: () => `/dashboard`,
  communication: () => `/dashboard/communication`,

  // Wallet
  wallet: () => `/wallet`,
  walletHub: () => `/wallet/hub`,
};
