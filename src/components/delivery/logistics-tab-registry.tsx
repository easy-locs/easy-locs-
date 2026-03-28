/**
 * logistics-tab-registry — Declarative tab→component mapping for SellerLogisticsPanel.
 * Single responsibility: maps filter keys to lazy-loaded components.
 */
import { lazy, type ComponentType } from "react";

const DeliveryAnalyticsDashboard = lazy(() => import("@/components/delivery/DeliveryAnalyticsDashboard"));
const DeliveryDisputeFlow = lazy(() => import("@/components/delivery/DeliveryDisputeFlow"));
const BatchDispatchPanel = lazy(() => import("@/components/delivery/BatchDispatchPanel"));
const ScheduledDeliveryPanel = lazy(() => import("@/components/delivery/ScheduledDeliveryPanel"));
const DeliveryHistoryExport = lazy(() => import("@/components/delivery/DeliveryHistoryExport"));
const DriverOnboardingFlow = lazy(() => import("@/components/delivery/DriverOnboardingFlow"));
const MultiStopRoutePanel = lazy(() => import("@/components/delivery/MultiStopRoutePanel"));
const SellerAnalyticsDashboard = lazy(() => import("@/components/delivery/SellerAnalyticsDashboard"));
const DriverWalletPanel = lazy(() => import("@/components/delivery/DriverWalletPanel"));
const GeofencingPanel = lazy(() => import("@/components/delivery/GeofencingPanel"));
const AdminFleetDashboard = lazy(() => import("@/components/delivery/AdminFleetDashboard"));
const DriverReputationPanel = lazy(() => import("@/components/delivery/DriverReputationPanel"));
const RouteOptimizationEngine = lazy(() => import("@/components/delivery/RouteOptimizationEngine"));
const BuyerDeliveryDashboard = lazy(() => import("@/components/delivery/BuyerDeliveryDashboard"));
const DeliveryInvoicePanel = lazy(() => import("@/components/delivery/DeliveryInvoicePanel"));
const DeliverySLAPanel = lazy(() => import("@/components/delivery/DeliverySLAPanel"));
const MultiDropBatchPanel = lazy(() => import("@/components/delivery/MultiDropBatchPanel"));
const DriverOnboardingWizard = lazy(() => import("@/components/delivery/DriverOnboardingWizard"));
const DeliveryAnalyticsReports = lazy(() => import("@/components/delivery/DeliveryAnalyticsReports"));
const FleetManagementDashboard = lazy(() => import("@/components/delivery/FleetManagementDashboard"));
const AutomatedDispatchRules = lazy(() => import("@/components/delivery/AutomatedDispatchRules"));
const CustomerTrackingPage = lazy(() => import("@/components/delivery/CustomerTrackingPage"));
const DriverEarningsPayroll = lazy(() => import("@/components/delivery/DriverEarningsPayroll"));
const DynamicPricingSurge = lazy(() => import("@/components/delivery/DynamicPricingSurge"));
const DriverShiftScheduling = lazy(() => import("@/components/delivery/DriverShiftScheduling"));
const AdminModerationPanel = lazy(() => import("@/components/delivery/AdminModerationPanel"));
const DeliveryEventNotifications = lazy(() => import("@/components/delivery/DeliveryEventNotifications"));
const MultiCurrencyDelivery = lazy(() => import("@/components/delivery/MultiCurrencyDelivery"));
const RouteOptimizationPanel = lazy(() => import("@/components/delivery/RouteOptimizationPanel"));
const DeliveryInsurancePanel = lazy(() => import("@/components/delivery/DeliveryInsurancePanel"));
const DeliveryAdvancedAnalytics = lazy(() => import("@/components/delivery/DeliveryAdvancedAnalytics"));
const DriverReferralProgram = lazy(() => import("@/components/delivery/DriverReferralProgram"));
const DeliverySupportBot = lazy(() => import("@/components/delivery/DeliverySupportBot"));
const ReturnsReverseLogistics = lazy(() => import("@/components/delivery/ReturnsReverseLogistics"));
const DeliverySlotBooking = lazy(() => import("@/components/delivery/DeliverySlotBooking"));
const FleetManagementHub = lazy(() => import("@/components/delivery/FleetManagementHub"));
const DeliveryGamification = lazy(() => import("@/components/delivery/DeliveryGamification"));
const SmartNotificationsEngine = lazy(() => import("@/components/delivery/SmartNotificationsEngine"));
const DeliveryAPIWebhooks = lazy(() => import("@/components/delivery/DeliveryAPIWebhooks"));
const ZoneBasedPricing = lazy(() => import("@/components/delivery/ZoneBasedPricing"));
const CustomerWalletLoyalty = lazy(() => import("@/components/delivery/CustomerWalletLoyalty"));
const ComplianceDashboard = lazy(() => import("@/components/delivery/ComplianceDashboard"));
const AIPredictivePlanning = lazy(() => import("@/components/delivery/AIPredictivePlanning"));
const MultiStopRoutePlanner = lazy(() => import("@/components/delivery/MultiStopRoutePlanner"));
const ReturnsManagement = lazy(() => import("@/components/delivery/ReturnsManagement"));
const DeliverySchedulingCalendar = lazy(() => import("@/components/delivery/DeliverySchedulingCalendar"));
const DriverOnboardingPortal = lazy(() => import("@/components/delivery/DriverOnboardingPortal"));
const PromoCouponsEngine = lazy(() => import("@/components/delivery/PromoCouponsEngine"));
const LiveDeliveryChat = lazy(() => import("@/components/delivery/LiveDeliveryChat"));
const WarehouseManagement = lazy(() => import("@/components/delivery/WarehouseManagement"));
const GreenDeliveryDashboard = lazy(() => import("@/components/delivery/GreenDeliveryDashboard"));
const FleetManagementSystem = lazy(() => import("@/components/delivery/FleetManagementSystem"));
const OrderBundlingEngine = lazy(() => import("@/components/delivery/OrderBundlingEngine"));
const CustomerTrackingPortal = lazy(() => import("@/components/delivery/CustomerTrackingPortal"));
const SellerRatingSystem = lazy(() => import("@/components/delivery/SellerRatingSystem"));
const AddressBookManager = lazy(() => import("@/components/delivery/AddressBookManager"));
const DeliveryKPIDashboard = lazy(() => import("@/components/delivery/DeliveryKPIDashboard"));
const MaintenanceScheduler = lazy(() => import("@/components/delivery/MaintenanceScheduler"));
const DriverOnboardingComplete = lazy(() => import("@/components/delivery/DriverOnboardingComplete"));
const DeliveryNotificationCenter = lazy(() => import("@/components/delivery/DeliveryNotificationCenter"));
const SellerPayoutReports = lazy(() => import("@/components/delivery/SellerPayoutReports"));
const DeliveryZonesManager = lazy(() => import("@/components/delivery/DeliveryZonesManager"));
const ProofOfDeliveryPlus = lazy(() => import("@/components/delivery/ProofOfDeliveryPlus"));
const DriverAnalyticsDashboard = lazy(() => import("@/components/delivery/DriverAnalyticsDashboard"));
const SLAAlertSystem = lazy(() => import("@/components/delivery/SLAAlertSystem"));
const DriverJobMarketplace = lazy(() => import("@/components/delivery/DriverJobMarketplace"));
const FleetGPSTracker = lazy(() => import("@/components/delivery/FleetGPSTracker"));
const DeliveryInsuranceClaims = lazy(() => import("@/components/delivery/DeliveryInsuranceClaims"));
const DriverShiftScheduler = lazy(() => import("@/components/delivery/DriverShiftScheduler"));
const CustomerLiveTracking = lazy(() => import("@/components/delivery/CustomerLiveTracking"));
const AdminCommandCenter = lazy(() => import("@/components/delivery/AdminCommandCenter"));
const AutomatedInvoicingEngine = lazy(() => import("@/components/delivery/AutomatedInvoicingEngine"));
const CustomerRewardsProgram = lazy(() => import("@/components/delivery/CustomerRewardsProgram"));
const MultiChannelDriverComms = lazy(() => import("@/components/delivery/MultiChannelDriverComms"));
const DeliveryBIDashboard = lazy(() => import("@/components/delivery/DeliveryBIDashboard"));
const DriverOnboardingRegistration = lazy(() => import("@/components/delivery/DriverOnboardingRegistration"));
const SLAPerformanceMonitor = lazy(() => import("@/components/delivery/SLAPerformanceMonitor"));
const DeliveryNotificationHub = lazy(() => import("@/components/delivery/DeliveryNotificationHub"));
const AdvancedReturnsHub = lazy(() => import("@/components/delivery/AdvancedReturnsHub"));
const FinancialControlCenter = lazy(() => import("@/components/delivery/FinancialControlCenter"));
const IncidentManagement = lazy(() => import("@/components/delivery/IncidentManagement"));
const SellerPartnerPortal = lazy(() => import("@/components/delivery/SellerPartnerPortal"));
const SmartCapacityPlanning = lazy(() => import("@/components/delivery/SmartCapacityPlanning"));
const MultiVendorMarketplace = lazy(() => import("@/components/delivery/MultiVendorMarketplace"));
const QualityAssuranceSystem = lazy(() => import("@/components/delivery/QualityAssuranceSystem"));
const CustomerExperienceHub = lazy(() => import("@/components/delivery/CustomerExperienceHub"));
const EVFleetIntelligence = lazy(() => import("@/components/delivery/EVFleetIntelligence"));
const FranchiseManagement = lazy(() => import("@/components/delivery/FranchiseManagement"));
const CrossBorderLogistics = lazy(() => import("@/components/delivery/CrossBorderLogistics"));
const RealTimeDataHub = lazy(() => import("@/components/delivery/RealTimeDataHub"));
const AIDispatchBrain = lazy(() => import("@/components/delivery/AIDispatchBrain"));
const InsuranceClaims = lazy(() => import("@/components/delivery/InsuranceClaims"));
const FleetMaintenanceAI = lazy(() => import("@/components/delivery/FleetMaintenanceAI"));
const RegulatoryCompliance = lazy(() => import("@/components/delivery/RegulatoryCompliance"));
const DroneDelivery = lazy(() => import("@/components/delivery/DroneDelivery"));
const BlockchainTraceability = lazy(() => import("@/components/delivery/BlockchainTraceability"));
const DriverTrainingAcademy = lazy(() => import("@/components/delivery/DriverTrainingAcademy"));
const CrowdDeliveryNetwork = lazy(() => import("@/components/delivery/CrowdDeliveryNetwork"));
const SmartLockerNetwork = lazy(() => import("@/components/delivery/SmartLockerNetwork"));
const CarbonOffsetEngine = lazy(() => import("@/components/delivery/CarbonOffsetEngine"));
const MultiModalTransport = lazy(() => import("@/components/delivery/MultiModalTransport"));
const DeliveryMarketplace = lazy(() => import("@/components/delivery/DeliveryMarketplace"));

export type LogisticsTabKey = string;

interface TabEntry {
  label: string;
  render: (ctx: { orgId: string; jobs: any[]; loading: boolean; onReset: () => void }) => JSX.Element;
}

// Full registry — orgId-accepting components use ctx.orgId, callback-based use ctx.onReset
export const LOGISTICS_TAB_REGISTRY: Record<string, TabEntry> = {
  "analytics": { label: "📊 Stats", render: (c) => <DeliveryAnalyticsDashboard orgId={c.orgId} /> },
  "seller-stats": { label: "📈 Perf.", render: (c) => <SellerAnalyticsDashboard orgId={c.orgId} /> },
  "multistop": { label: "🗺️ Multi", render: (c) => <MultiStopRoutePanel orgId={c.orgId} /> },
  "onboarding": { label: "🚗 Livreur", render: (c) => <DriverOnboardingFlow onComplete={c.onReset} /> },
  "disputes": { label: "⚠️ Litiges", render: (c) => <DeliveryDisputeFlow orgId={c.orgId} /> },
  "batch": { label: "⚡ Batch", render: (c) => <BatchDispatchPanel jobs={c.jobs} onDone={c.onReset} /> },
  "scheduled": { label: "📅 Planif.", render: (c) => <ScheduledDeliveryPanel onDone={c.onReset} /> },
  "history": { label: "📋 Histo.", render: (c) => <DeliveryHistoryExport jobs={c.jobs} loading={c.loading} /> },
  "wallet": { label: "💰 Wallet", render: () => <DriverWalletPanel /> },
  "geofence": { label: "🛡️ Zones", render: () => <GeofencingPanel /> },
  "fleet": { label: "🏢 Flotte", render: (c) => <AdminFleetDashboard orgId={c.orgId} /> },
  "reputation": { label: "🏆 Réputation", render: () => <DriverReputationPanel /> },
  "optimize": { label: "⚡ Optim.", render: (c) => <RouteOptimizationEngine orgId={c.orgId} /> },
  "buyer": { label: "👤 Client", render: () => <BuyerDeliveryDashboard /> },
  "invoices": { label: "🧾 Factures", render: (c) => <DeliveryInvoicePanel orgId={c.orgId} /> },
  "sla": { label: "⏱️ SLA", render: (c) => <DeliverySLAPanel orgId={c.orgId} /> },
  "multi-drop": { label: "📦 Multi-Drop", render: (c) => <MultiDropBatchPanel orgId={c.orgId} /> },
  "driver-reg": { label: "📝 Inscription", render: (c) => <DriverOnboardingWizard onComplete={c.onReset} /> },
  "reports": { label: "📈 Rapports", render: (c) => <DeliveryAnalyticsReports orgId={c.orgId} /> },
  "fleet-mgmt": { label: "🗺️ Fleet", render: (c) => <FleetManagementDashboard orgId={c.orgId} /> },
  "dispatch-rules": { label: "⚙️ Dispatch", render: (c) => <AutomatedDispatchRules orgId={c.orgId} /> },
  "customer-track": { label: "📲 Suivi client", render: () => <CustomerTrackingPage /> },
  "payroll": { label: "💶 Paie", render: () => <DriverEarningsPayroll /> },
  "surge": { label: "💹 Surge", render: (c) => <DynamicPricingSurge orgId={c.orgId} /> },
  "shifts": { label: "📅 Shifts", render: (c) => <DriverShiftScheduling orgId={c.orgId} /> },
  "moderation": { label: "🛡️ Modération", render: (c) => <AdminModerationPanel orgId={c.orgId} /> },
  "notif-rules": { label: "🔔 Notifs", render: (c) => <DeliveryEventNotifications orgId={c.orgId} /> },
  "multi-currency": { label: "💱 Devises", render: (c) => <MultiCurrencyDelivery orgId={c.orgId} /> },
  "route-optim": { label: "🧭 Routes", render: (c) => <RouteOptimizationPanel orgId={c.orgId} /> },
  "insurance": { label: "🛡️ Assurance", render: (c) => <DeliveryInsurancePanel orgId={c.orgId} /> },
  "adv-analytics": { label: "📊 Analytics+", render: (c) => <DeliveryAdvancedAnalytics orgId={c.orgId} /> },
  "referral": { label: "🎁 Parrainage", render: () => <DriverReferralProgram /> },
  "support-bot": { label: "🤖 Support IA", render: () => <DeliverySupportBot /> },
  "returns": { label: "🔄 Retours", render: (c) => <ReturnsReverseLogistics orgId={c.orgId} /> },
  "slot-booking": { label: "🕐 Créneaux", render: (c) => <DeliverySlotBooking orgId={c.orgId} /> },
  "fleet-hub": { label: "🚐 Fleet Hub", render: (c) => <FleetManagementHub orgId={c.orgId} /> },
  "gamification": { label: "🎮 Gamification", render: () => <DeliveryGamification /> },
  "smart-notifs": { label: "🧠 Smart Notifs", render: (c) => <SmartNotificationsEngine orgId={c.orgId} /> },
  "api-webhooks": { label: "🔌 API", render: (c) => <DeliveryAPIWebhooks orgId={c.orgId} /> },
  "zone-pricing": { label: "📍 Zones Tarif", render: (c) => <ZoneBasedPricing orgId={c.orgId} /> },
  "customer-loyalty": { label: "💳 Fidélité", render: () => <CustomerWalletLoyalty /> },
  "compliance": { label: "🛡️ Compliance", render: (c) => <ComplianceDashboard orgId={c.orgId} /> },
  "ai-planning": { label: "🧠 IA Planning", render: (c) => <AIPredictivePlanning orgId={c.orgId} /> },
  "route-planner": { label: "🗺️ Planner", render: (c) => <MultiStopRoutePlanner orgId={c.orgId} /> },
  "returns-mgmt": { label: "📦 Retours+", render: (c) => <ReturnsManagement orgId={c.orgId} /> },
  "schedule-cal": { label: "📅 Calendrier", render: (c) => <DeliverySchedulingCalendar orgId={c.orgId} /> },
  "driver-portal": { label: "🚀 Onboarding+", render: (c) => <DriverOnboardingPortal onComplete={c.onReset} /> },
  "promo-coupons": { label: "🎟️ Promos", render: (c) => <PromoCouponsEngine orgId={c.orgId} /> },
  "live-chat": { label: "💬 Chat Live", render: (c) => <LiveDeliveryChat onClose={c.onReset} /> },
  "warehouse": { label: "🏭 Entrepôts", render: (c) => <WarehouseManagement orgId={c.orgId} /> },
  "green-delivery": { label: "🌱 Green", render: (c) => <GreenDeliveryDashboard orgId={c.orgId} /> },
  "fleet-system": { label: "🚐 Flotte+", render: (c) => <FleetManagementSystem orgId={c.orgId} /> },
  "order-bundle": { label: "📦 Lots", render: (c) => <OrderBundlingEngine orgId={c.orgId} /> },
  "tracking-portal": { label: "📲 Tracking", render: (c) => <CustomerTrackingPortal orgId={c.orgId} /> },
  "seller-rating": { label: "⭐ Rating", render: (c) => <SellerRatingSystem orgId={c.orgId} /> },
  "address-book": { label: "📍 Adresses", render: (c) => <AddressBookManager orgId={c.orgId} /> },
  "delivery-kpi": { label: "📊 KPIs", render: (c) => <DeliveryKPIDashboard orgId={c.orgId} /> },
  "maint-sched": { label: "🔧 Maintenance", render: (c) => <MaintenanceScheduler orgId={c.orgId} /> },
  "driver-onboard": { label: "🚀 Inscription+", render: (c) => <DriverOnboardingComplete onComplete={c.onReset} /> },
  "notif-center": { label: "🔔 Notifs+", render: (c) => <DeliveryNotificationCenter orgId={c.orgId} /> },
  "payout-reports": { label: "💰 Rapports$", render: (c) => <SellerPayoutReports orgId={c.orgId} /> },
  "zones-mgr": { label: "🗺️ Zones+", render: (c) => <DeliveryZonesManager orgId={c.orgId} /> },
  "proof-delivery": { label: "📸 Preuve+", render: (c) => <ProofOfDeliveryPlus orgId={c.orgId} /> },
  "driver-analytics": { label: "📊 Driver Stats", render: () => <DriverAnalyticsDashboard /> },
  "sla-alerts": { label: "🚨 SLA Alertes", render: (c) => <SLAAlertSystem orgId={c.orgId} /> },
  "job-marketplace": { label: "🏪 Marketplace", render: () => <DriverJobMarketplace /> },
  "fleet-gps": { label: "📡 GPS Fleet", render: (c) => <FleetGPSTracker orgId={c.orgId} /> },
  "insurance-claims": { label: "🛡️ Réclamations", render: (c) => <DeliveryInsuranceClaims orgId={c.orgId} /> },
  "shift-scheduler": { label: "📅 Shifts+", render: (c) => <DriverShiftScheduler orgId={c.orgId} /> },
  "live-tracking": { label: "📲 Live Track", render: () => <CustomerLiveTracking /> },
  "command-center": { label: "🎯 Command", render: (c) => <AdminCommandCenter orgId={c.orgId} /> },
  "auto-invoicing": { label: "🧾 Factures+", render: (c) => <AutomatedInvoicingEngine orgId={c.orgId} /> },
  "rewards": { label: "🏆 Récompenses", render: () => <CustomerRewardsProgram /> },
  "driver-comms": { label: "📡 Comms", render: (c) => <MultiChannelDriverComms orgId={c.orgId} /> },
  "bi-dashboard": { label: "📊 BI", render: (c) => <DeliveryBIDashboard orgId={c.orgId} /> },
  "driver-registration": { label: "📝 Registre", render: (c) => <DriverOnboardingRegistration onComplete={c.onReset} /> },
  "sla-monitor": { label: "⏱️ SLA+", render: (c) => <SLAPerformanceMonitor orgId={c.orgId} /> },
  "notif-hub": { label: "🔔 Hub Notifs", render: (c) => <DeliveryNotificationHub orgId={c.orgId} /> },
  "adv-returns": { label: "🔄 Retours++", render: (c) => <AdvancedReturnsHub orgId={c.orgId} /> },
  "finance-ctrl": { label: "💵 Finance", render: (c) => <FinancialControlCenter orgId={c.orgId} /> },
  "incidents": { label: "🚨 Incidents", render: (c) => <IncidentManagement orgId={c.orgId} /> },
  "seller-portal": { label: "🏪 Partenaires", render: (c) => <SellerPartnerPortal orgId={c.orgId} /> },
  "capacity": { label: "🧠 Capacité", render: (c) => <SmartCapacityPlanning orgId={c.orgId} /> },
  "multi-vendor": { label: "🛒 Multi-vendeur", render: (c) => <MultiVendorMarketplace orgId={c.orgId} /> },
  "quality": { label: "🛡️ Qualité", render: (c) => <QualityAssuranceSystem orgId={c.orgId} /> },
  "cx-hub": { label: "❤️ CX Hub", render: (c) => <CustomerExperienceHub orgId={c.orgId} /> },
  "ev-fleet": { label: "⚡ EV Fleet", render: (c) => <EVFleetIntelligence orgId={c.orgId} /> },
  "franchise": { label: "🏢 Franchises", render: (c) => <FranchiseManagement orgId={c.orgId} /> },
  "cross-border": { label: "🌍 Cross-Border", render: (c) => <CrossBorderLogistics orgId={c.orgId} /> },
  "data-hub": { label: "📡 Data Hub", render: (c) => <RealTimeDataHub orgId={c.orgId} /> },
  "ai-dispatch": { label: "🧠 AI Dispatch", render: (c) => <AIDispatchBrain orgId={c.orgId} /> },
  "insur-claims": { label: "🛡️ Assurance+", render: (c) => <InsuranceClaims orgId={c.orgId} /> },
  "maint-ai": { label: "🔧 Maint. IA", render: (c) => <FleetMaintenanceAI orgId={c.orgId} /> },
  "regulatory": { label: "⚖️ Conformité", render: (c) => <RegulatoryCompliance orgId={c.orgId} /> },
  "drone": { label: "🛩️ Drones", render: (c) => <DroneDelivery orgId={c.orgId} /> },
  "blockchain": { label: "🔗 Blockchain", render: (c) => <BlockchainTraceability orgId={c.orgId} /> },
  "training": { label: "🎓 Formation", render: (c) => <DriverTrainingAcademy orgId={c.orgId} /> },
  "crowd": { label: "👥 Crowd Delivery", render: (c) => <CrowdDeliveryNetwork orgId={c.orgId} /> },
  "smart-lockers": { label: "📦 Casiers", render: (c) => <SmartLockerNetwork orgId={c.orgId} /> },
  "carbon-offset": { label: "🌱 Carbone", render: (c) => <CarbonOffsetEngine orgId={c.orgId} /> },
  "multimodal": { label: "🚊 Multimodal", render: (c) => <MultiModalTransport orgId={c.orgId} /> },
  "delivery-mkt": { label: "🏪 Marché Livr.", render: (c) => <DeliveryMarketplace orgId={c.orgId} /> },
};

export const TAB_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(LOGISTICS_TAB_REGISTRY).map(([k, v]) => [k, v.label])
);

export const CORE_TABS = ["all", "active", "completed"] as const;
export const CORE_TAB_LABELS: Record<string, string> = {
  all: "Tout", active: "Actives", completed: "Terminées",
};
