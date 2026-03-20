/**
 * Centralized route helpers for Easy-Locs.
 * Use these instead of hardcoding paths in components.
 */
export const routes = {
  home: () => `/`,
  notFound: () => `/404`,

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
  dinoAudit: () => `/admin/dino`,
  dinoControl: () => `/admin/dino-control`,
  seedTools: () => `/admin/seed-tools`,
  favorites: () => `/favorites`,
  searchResults: () => `/search-results`,
  adminContentOps: () => `/admin/content-ops`,
  reorder: (orderId: string) => `/order/reorder/${encodeURIComponent(orderId)}`,
  merchantOrderBoard: (merchantId: string) => `/merchant/orders/${encodeURIComponent(merchantId)}`,
  adminAnalyticsOps: () => `/admin/analytics-ops`,
  customerProfile: () => `/me`,
  notificationPreferences: () => `/settings/notification-preferences`,
  adminQualityOps: () => `/admin/quality-ops`,
  merchantReviewReplies: (merchantId: string) => `/merchant/reviews/${encodeURIComponent(merchantId)}`,
  adminCrmOps: () => `/admin/crm-ops`,
  adminHomeEngine: () => `/admin/home-engine`,
  adminMapEngine: () => `/admin/map-engine`,
  adminNotificationEngine: () => `/admin/notification-engine`,
  merchantInventory: (merchantId: string) => `/merchant/inventory/${encodeURIComponent(merchantId)}`,
  merchantLiveControl: (merchantId: string) => `/merchant/live/${encodeURIComponent(merchantId)}`,
  merchantCoupons: (merchantId: string) => `/merchant/coupons/${encodeURIComponent(merchantId)}`,
  adminGrowthOps: () => `/admin/growth-ops`,
  notifications: () => `/notifications`,
  adminRetentionOps: () => `/admin/retention-ops`,
  driverEarningsV2: () => `/driver/earnings-v2`,
  orderReceipt: (orderId: string) => `/order/receipt/${encodeURIComponent(orderId)}`,
  merchantAnalytics: (merchantId: string) => `/merchant/analytics/${encodeURIComponent(merchantId)}`,
  adminOperationsLaunchpad: () => `/admin/operations-launchpad`,
  merchantCustomers: (merchantId: string) => `/merchant/customers/${encodeURIComponent(merchantId)}`,
  adminMerchantHealth: () => `/admin/merchant-health`,
  walletTopUp: () => `/wallet/top-up`,
  walletTransfer: () => `/wallet/transfer`,
  orderRefundRequest: (orderId: string) => `/order/refund/${encodeURIComponent(orderId)}`,
  merchantBannerEditor: (merchantId: string) => `/merchant/banner-editor/${encodeURIComponent(merchantId)}`,
  adminDriverMonitor: () => `/admin/driver-monitor`,
  adminUserLookup: () => `/admin/user-lookup`,
  adminNotificationOps: () => `/admin/notification-ops`,
  adminFinanceSummary: () => `/admin/finance-summary`,
  customerSpendingInsights: () => `/me/spending-insights`,
  adminPlatformAlerts: () => `/admin/platform-alerts`,

  // Orbit
  orbitCallTest: () => `/orbit/call-test`,
  orbitIdentity: () => `/orbit/identity`,

  // Food flow
  food: () => `/food`,
  foodType: (type: string) => `/food/${encodeURIComponent(type)}`,
  foodCuisine: (type: string, cuisine: string) => `/food/${encodeURIComponent(type)}/${encodeURIComponent(cuisine)}`,
  foodRestaurant: (id: string) => `/food/restaurant/${encodeURIComponent(id)}`,

  // Settings
  settings: () => `/settings`,
  settingsAccount: () => `/settings/account`,
  settingsOrbit: () => `/settings/orbit`,
  settingsBusiness: () => `/settings/business`,
  settingsWallet: () => `/settings/wallet`,
  settingsAddresses: () => `/settings/addresses`,
  settingsNotifications: () => `/settings/notifications`,
  settingsSecurity: () => `/settings/security`,
  settingsPreferences: () => `/settings/preferences`,

  // Ghost V2/V3
  ghost: () => `/ghost`,
  ghostInbox: () => `/ghost/inbox`,
  ghostThread: (threadId: string) => `/ghost/thread/${encodeURIComponent(threadId)}`,
  ghostCall: (callId: string) => `/ghost/call/${encodeURIComponent(callId)}`,
  ghostSettings: () => `/ghost/settings`,
  ghostContacts: () => `/ghost/contacts`,

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

  // Map / Radar
  map: () => `/map`,
  superMap: () => `/super-map`,
  radar: () => `/radar`,

  // Ride
  ride: () => `/ride`,
  rideSearch: () => `/ride/search`,

  // Cart / Checkout / Orders / Tracking
  checkout: () => `/checkout`,
  orders: () => `/orders`,
  orderDetail: (id: string) => `/order/${encodeURIComponent(id)}`,
  trackingOrder: (id: string) => `/tracking/${encodeURIComponent(id)}`,
};

export type AppRouteKey = keyof typeof routes;

export const ROUTE_REGISTRY = [
  { group: "public", label: "Home", path: "/" },
  { group: "public", label: "404", path: "/404" },

  { group: "qr", label: "QR Entry", path: "/qr/entry/:targetCode" },
  { group: "admin", label: "QR Generate", path: "/admin/qr-generate" },

  { group: "public", label: "Tracking", path: "/tracking/order/:orderId" },

  { group: "driver", label: "Driver Missions", path: "/driver/missions" },
  { group: "driver", label: "Driver Mission", path: "/driver/mission/:dispatchJobId" },
  { group: "driver", label: "Driver Earnings", path: "/driver/earnings" },

  { group: "merchant", label: "Merchant POS", path: "/merchant/pos" },
  { group: "merchant", label: "Merchant Kitchen", path: "/merchant/kitchen" },
  { group: "merchant", label: "Merchant Delivery Monitor", path: "/merchant/delivery-monitor" },
  { group: "merchant", label: "Merchant Dashboard", path: "/merchant/dashboard" },
  { group: "merchant", label: "Merchant Claim", path: "/merchant/claim" },
  { group: "merchant", label: "Merchant Onboarding", path: "/merchant/onboarding" },

  { group: "admin", label: "Wallet Diagnostics", path: "/admin/wallet-diagnostics" },
  { group: "admin", label: "Dispatch Diagnostics", path: "/admin/dispatch-diagnostics" },
  { group: "admin", label: "Automations", path: "/admin/automations" },
  { group: "admin", label: "Automation Health", path: "/admin/automation-health" },
  { group: "admin", label: "Ops Exceptions", path: "/admin/ops-exceptions" },
  { group: "admin", label: "Review Queue", path: "/admin/review-queue" },
  { group: "admin", label: "Growth Dashboard", path: "/admin/growth" },
  { group: "admin", label: "Growth Engine", path: "/admin/growth-engine" },
  { group: "admin", label: "Route Audit", path: "/admin/route-audit" },
  { group: "admin", label: "Restaurant Seed Test", path: "/admin/test-restaurants" },
  { group: "admin", label: "Alert Center", path: "/admin/alerts" },
  { group: "admin", label: "Orbit Call Test", path: "/orbit/call-test" },
  { group: "admin", label: "Runtime Audit", path: "/admin/runtime-audit" },
  { group: "admin", label: "Runtime Quick Links", path: "/admin/runtime-links" },
  { group: "admin", label: "Analytics Ops", path: "/admin/analytics-ops" },
  { group: "admin", label: "Content Ops", path: "/admin/content-ops" },
  { group: "merchant", label: "Merchant Order Board", path: "/merchant/orders/:merchantId" },
  { group: "public", label: "Customer Profile", path: "/me" },
  { group: "settings", label: "Notification Preferences", path: "/settings/notification-preferences" },
  { group: "admin", label: "Quality Ops", path: "/admin/quality-ops" },
  { group: "merchant", label: "Merchant Review Replies", path: "/merchant/reviews/:merchantId" },
  { group: "admin", label: "CRM Ops", path: "/admin/crm-ops" },
  { group: "admin", label: "Home Engine", path: "/admin/home-engine" },
  { group: "admin", label: "Map Engine", path: "/admin/map-engine" },
  { group: "admin", label: "Notification Engine", path: "/admin/notification-engine" },
  { group: "merchant", label: "Merchant Inventory", path: "/merchant/inventory/:merchantId" },
  { group: "merchant", label: "Merchant Live Control", path: "/merchant/live/:merchantId" },
  { group: "merchant", label: "Merchant Coupons", path: "/merchant/coupons/:merchantId" },
  { group: "admin", label: "Growth Ops", path: "/admin/growth-ops" },
  { group: "public", label: "Notifications", path: "/notifications" },
  { group: "admin", label: "Retention Ops", path: "/admin/retention-ops" },
  { group: "driver", label: "Driver Earnings V2", path: "/driver/earnings-v2" },
  { group: "public", label: "Order Receipt", path: "/order/receipt/:orderId" },
  { group: "merchant", label: "Merchant Analytics", path: "/merchant/analytics/:merchantId" },
  { group: "admin", label: "Operations Launchpad", path: "/admin/operations-launchpad" },
  { group: "merchant", label: "Merchant Customers", path: "/merchant/customers/:merchantId" },
  { group: "admin", label: "Merchant Health", path: "/admin/merchant-health" },
  { group: "wallet", label: "Wallet Top Up", path: "/wallet/top-up" },
  { group: "wallet", label: "Wallet Transfer", path: "/wallet/transfer" },
  { group: "public", label: "Order Refund Request", path: "/order/refund/:orderId" },
  { group: "merchant", label: "Merchant Banner Editor", path: "/merchant/banner-editor/:merchantId" },
  { group: "admin", label: "Driver Monitor", path: "/admin/driver-monitor" },
  { group: "admin", label: "User Lookup", path: "/admin/user-lookup" },
  { group: "admin", label: "Notification Ops", path: "/admin/notification-ops" },

  { group: "public", label: "Coming Soon", path: "/coming-soon/:slug" },
  { group: "public", label: "City Market", path: "/city-market/:citySlug" },
  { group: "public", label: "City Vertical", path: "/city/:countryCode/:city/:vertical/:locale" },
] as const;
