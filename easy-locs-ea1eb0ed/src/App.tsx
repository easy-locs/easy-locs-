// ═══════════════════════════════════════════════════════════════════
// App.tsx — Super-App v3 · 5 Pillars: Dashboard · Radar · Orbit · Wallet · Me
// ═══════════════════════════════════════════════════════════════════

// ── React & routing ──
import { Suspense, lazy, useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

// ── Auth & providers ──
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/lib/i18n";
import ProtectedRoute from "@/components/auth/ProtectedRoute";


// ── Deferred providers (eagerly mount context, defer internals) ──
import { CallProvider } from "@/components/call/CallProvider";
import { UnifiedPaymentProvider } from "@/payments/UnifiedPaymentSystem";

// ── Shell & system (critical — loaded eagerly for app tree) ──
import ErrorBoundary from "@/components/ErrorBoundary";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { AppCrashBoundary } from "@/components/system/AppCrashBoundary";
import ChunkRecoveryBoundary from "@/components/system/ChunkRecoveryBoundary";
import AppLockGuard from "@/components/security/AppLockGuard";

// ── UI chrome (critical) ──
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import MainBottomNav from "@/components/navigation/MainBottomNav";
import SwipeableMain from "@/components/navigation/SwipeableMain";
import { HomeRouter, MarketplaceHomeRouter } from "@/components/app/AppRouters";

// ── Deferred shell (lazy-loaded — not needed for first paint) ──
const SmartInstallBanner = lazy(() => import("@/components/pwa/SmartInstallBanner"));
const SmartCloseFlowSheet = lazy(() => import("@/components/close-flow/SmartCloseFlowSheet"));
const FloatingCTAButton = lazy(() => import("@/components/engine/FloatingCTAButton").then(m => ({ default: m.FloatingCTAButton })));
const OrbitPromptOverlay = lazy(() => import("@/components/engine/OrbitPromptOverlay").then(m => ({ default: m.OrbitPromptOverlay })));
const GlobalOverlayRenderer = lazy(() => import("@/components/overlays/GlobalOverlayRenderer").then(m => ({ default: m.GlobalOverlayRenderer })));
const IntentNavigateProvider = lazy(() => import("@/components/app/IntentNavigateProvider"));
import SmartCoreTracker from "@/components/system/SmartCoreTracker";
import { initQualityGates } from "@/lib/quality-gates";

initQualityGates();

// ── Deferred boot guards — loaded 3s after first paint ──
function DeferredBootGuards() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 3000);
    return () => clearTimeout(t);
  }, []);
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <DeferredGuardsInner />
    </Suspense>
  );
}

const DeferredGuardsInner = lazy(async () => {
  const [
    { AppInit },
    { CanonicalShellRuntime },
    { GeoBoot },
    { PermissionBootstrap },
    { OrbitSessionGuard, RealtimeHubGuard, NotificationsRealtimeGuard },
    { GlobalExperienceInit },
    { UiQualityInit },
    { BrowserTelemetryInit },
  ] = await Promise.all([
    import("@/components/system/AppInit"),
    import("@/components/app/CanonicalShellRuntime"),
    import("@/lib/geo/GeoBoot"),
    import("@/components/boot/PermissionBootstrap"),
    import("@/components/app/AppGuards"),
    import("@/providers/GlobalExperienceProvider"),
    import("@/providers/UiQualityProvider"),
    import("@/components/system/BrowserTelemetryProvider"),
  ]);

  const AppBootstrapGuardDirect = lazy(() => import("@/components/app/AppBootstrapGuard"));
  const BrandSuccessFlash = lazy(() => import("@/components/brand/BrandSuccessFlash"));
  const UpdateNotification = lazy(() => import("@/components/UpdateNotification"));

  return {
    default: () => (
      <>
        <GlobalExperienceInit />
        <BrowserTelemetryInit />
        <UiQualityInit />
        <Suspense fallback={null}><BrandSuccessFlash /></Suspense>
        <OrbitSessionGuard />
        <RealtimeHubGuard />
        <NotificationsRealtimeGuard />
        <Suspense fallback={null}><UpdateNotification /></Suspense>
        <AppInit />
        <CanonicalShellRuntime />
        <GeoBoot />
        <PermissionBootstrap />
        <Suspense fallback={null}><AppBootstrapGuardDirect /></Suspense>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium">Skip to main content</a>
      </>
    ),
  };
});

// ── Page registry (all lazy-loaded) ──
import * as Pages from "@/app/app-route-registry";

const {
  // Auth
  Index, Login, Signup, ForgotPassword, ResetPassword, VerifyEmail, Onboarding, AuthCallbackPage,

  // Dashboard (Pillar 1)
  Dashboard, AddProperty, PropertyDetailHub, CreateListing,
  Receipts, Reminders, Documents, AIAssistant, Leases, Company, Billing, Settings,
  Tenants, RentalManagement, Finances, Interventions, Tasks,
  ChargesRegularization, FiscalReport, Expenses, Candidates, SeasonalRentals, PaymentNotices,
  DunningLetters, FurnitureInventory, Buildings, Vault, DataImport, CVGenerator,
  CategorySubscriptions, ChannelManager, Accounting, LandlordRentDashboard, AccountingEntries,
  ReportingDashboard, DynamicPricing, PropertyCalendar, RealEstateListings, LandlordProfile,
  Referrals, Collaboration, DeveloperPortal, AuditTrail, CountryWorkspace, ServiceTrackingPage,
  RealEstateModulePage, REPropertiesPage, REUnitsPage, RETenantsPage, RELeasesPage,
  REPaymentsPage, REDocumentsPage, REPropertyDetailPage, RELeaseDetailPage,

  // Radar (Pillar 2)
  HyperRadarPage, ExplorePage,
  DiscoverPage, BrowseVerticalPage, RetailIndexPage, RetailCategoryPage, RetailMallPage, RetailStorePage,
  PropertyHubPage, FoodTypePage, CuisineListPage, FoodRestaurantPage,
  TravelHub, TravelFlights, TravelStays, TravelHotelDetail, HotelCheckout, TravelStayDetail, TravelFlightDetail,
  FlightSearchPage, FlightResultsPage, FlightDetailPage, FlightPassengerPage, FlightPaymentPage, FlightConfirmationPage,
  PropertySearchPage, PropertyResultsPage, PropertyDetailPage, PropertyBookingPage, PropertyPaymentPage, PropertyConfirmationPage,
  MobilityHubPage, MobilityTaxiPage, MobilityDeliveryPage, DeliveryBringPage, DeliveryParcelPage, DeliveryGiftPage,
  DeliveryErrandPage, RiderLivePage, TrackRidePage, CallDriverPage,
  PublicListing, PublicServiceBooking, PublicRealEstateListing, LocalServices,
  RentalCatalog, HostCatalog, ActivitiesMarketplace, GuestPortal, ProviderStorefront,
  StorePage, ShopPage, ShopCategoryPage, PropertiesShowcase, AccountShowcase, PropertyManagementHub,
  ConciergeServicesPage, SearchResultsPage, CityMarketplacePage,
  DemandHeatmapPage,

  // Orbit (Pillar 3)
  CommunicationCenter, OrbitContactsPage, OrbitIdentityPage, OrbitAddContactPage,

  // Wallet (Pillar 4)
  WalletHubPage, WalletTopUpPage, WalletTransferPage, WalletRequestPage, WalletTransactionDetailPage,
  PayRidePage, DriverPayoutPage, PaymentLinkResolverPage, PaymentConfirmPage, PaymentPage,
  StripeElementsPage, CheckoutPage, FoodOrderCheckoutPage, GuestCheckoutPage,
  MyOrdersPage, UnifiedOrderDetailPage, TrackingPage, DeliveryProofPage,
  OrderReceiptPage, OrderRefundRequestPage, ReorderPage, StripeCheckoutHandlerPage,
  POSPage, LoyaltyRedeemPage, LiveTrackingPageNew,
  CustomerGroupOrderPage, CustomerOrderGiftsPage, CustomerSplitBillPage,
  CustomerSavedCartsPage2, CustomerAutoRepeatPage, CustomerPartyOrderPage,
  CustomerRewardRedemptionPage, CustomerShareCartPage, CustomerAddressSelectorPage,

  // Me (Pillar 5)
  MeCommandCenter, FavoritesPage, NotificationCenterPage, Install,
  SettingsAccountPage, SettingsOrbitPage, SettingsBusinessPage, SettingsWalletPage,
  SettingsAddressesPage, SettingsNotificationsPage, SettingsSecurityPage, SettingsPreferencesPage,
  SettingsSupportPage,
  CustomerSpendingInsightsPage, EditProfilePage, CustomerAddressBookPage, CustomerLoyaltyHistoryPage,
  CustomerActiveOrdersPage, CustomerOrderArchivePage, CustomerReorderPage,
  CustomerLiveLocationPage, CustomerSavedCardsPage, CustomerDeliveryNotesPage,
  CustomerPaymentActivityPage, CustomerOrderReceiptsPage,
  MerchantOnboardingPage, MerchantClaimPage, MerchantDashboardPage, MerchantFinancePage,
  MerchantPosPage, MerchantKitchenPage, MerchantOrdersPage, ShopQrCenterPage, ShopOrderPage,
  MerchantMenuPageNew, MerchantStoreSettingsPage, MerchantPromoManagerPage, MerchantOrderBoardPage,
  MerchantInventoryPage, MerchantLiveControlPage, MerchantCouponManagerPage, MerchantBasicAnalyticsPage,
  MerchantCustomersPage, MerchantPromoBannerEditorPage, MerchantBusinessSummaryPage, MerchantClosingModePage,
  MerchantCustomerInsightsPage, MerchantProductPerformancePage, MerchantAutoAcceptSettingsPage,
  MerchantInventoryAlertsPage, MerchantStaffAccessPage, MerchantDailySalesPage, MerchantReviewRepliesPage,
  MerchantRefundRequestsPage, MerchantMenuBulkEditPage, MerchantDeliveryZonesPage,
  MerchantKitchenDisplayPage, MerchantBusinessHoursPage, MerchantMenuCategoryManagerPage,
  DriverDashboardPageNew, DriverLivePage,
  DriverEarningsPageNew, DriverMissionsPage, DriverMissionDetailPage,
  DriverProofPage, DriverEarningsSummaryPage, DriverActiveMissionsPage, DriverShiftPage,
  DriverAvailabilityZonesPage, DriverCompletedDeliveriesPage, DriverLiveMissionsPage,
  DriverFuelCostsPage, DriverBreaksPage,
  SellerDashboardPage, BoostDashboardPage,
  MyShopsPage, MyBusinessHub, OpsCenter,
  RefundRequestPage, CustomerProfilePage,
  SupportTicketsPage, SupportTicketDetailPage, PermissionCenterPage,
  TeamCommandCenterPage, TeamPermissionsPage,

  // Admin
  AdminDashboard, AIQualityDashboard, AdminDisputesPage, AdminFraudPage,
  AdminLiveOpsPage, AdminSLAPage, AdminTrustGraphPage, ExecutiveKPIBoardPage,
  AIOpsChatPage, FinancialReconPage, ReconAlertsPage, ExecutiveDashboard,
  ConciergeOperations, WorkspaceBootstrapPage, MerchantOnboardingAdminPage,
  MenuAdminPage, SupportInboxPage, KpiChartsPage,
  AdminRealtimeControlPage, DeploymentChecklistPage, AdminAlertCenterPage,
  AdminOutreachPage, AdminWalletDiagnosticsPage, ExecutionProofPage,
  AdminReviewQueuePage, RouteAuditPage, AdminRestaurantTestSeederPage,
  AdminRuntimeAuditPage, AdminRuntimeQuickLinksPage, AdminMasterDebugPage,
  AdminUiEnginePage, AdminMarketplaceOpsPage, AdminOpsDashboardPage, AdminOrchestrationPage,
  AdminPipelinePage, AdminEnginesDashboardPage, QualityEnginesDashboardPage, AdminBackendTruthPage, AdminGaragePage,
  AdminSupportOpsPage, AdminDeliveryOpsPage, AdminMerchantAutofillPage, AdminBulkSeedPage,
  AdminSuperDashboardPage, AdminPaymentsOpsPage, AdminBulkMerchantImportPage,
  AdminSeedToolsPage, AdminContentOpsPage, AdminAnalyticsOpsPage, AdminQualityOpsPage,
  AdminUaeOpsDashboard, AdminCrmOpsPage, AdminHomeEnginePage, AdminMapEnginePage,
  AdminNotificationEnginePage, OwnerCockpitPage, OnboardingQualityDashboardPage,
  UnifiedGlobalEnginePage, AIDecisionsDashboardPage, UrlImportPage,
  AdminGrowthOpsPage, AdminRetentionOpsPage, AdminMerchantHealthPage,
  AdminPlatformRecoveryPage, AdminShopImportPage, AdminVisualQualityPage,
  AdminRankingControlPage, AdminShopQualityPage, AdminCoherenceControlPage, AdminSourceAuditPage,
  AdminDriverMonitorPage, AdminUserLookupPage, AdminNotificationOpsPage, AdminFinanceSummaryPage,
  AdminPlatformAlertsPage, AdminOrderWatchPage, AdminSearchWatchPage, AdminMerchantPromoWatchPage,
  AdminRefundWatchPage, AdminDriverHeatmapPage, AdminWalletWatchPage, AdminSystemHealthPage,
  AdminFraudDetectionPage, AdminOrderTimelinePage, AdminMerchantApprovalQueuePage,
  AdminFailedPaymentsPage, AdminSupportSlaPage, AdminDeliveryIncidentsPage,
  AdminGrowthDashboardPage, AdminGrowthEnginePage, AdminCouponOversightPage,
  AdminActiveSessionsPage, AdminFraudMonitorPage, AdminCoreEnginePage, AdminOrderAuditPage,
  AdminRefundQueuePage, AdminPlatformHealthPage, AdminRuntimeCockpitPage,
  AdminSystemLivePanelPage, AdminRestaurantFillPage, AdminMasterControlPage,
  AdminQaCommandPage, AdminMenuQualityControlPage, AdminUxLiveTestPage, AdminEngineCockpit,
  AdminAIControlCenter, AdminMonetizationDashboard,
  AdminBrowserRepairPage, AdminCentralControlPanelPage,
  RiderPrioritySubscriptionPage,

  // Deep-link
  UserProfilePage, ProductPage, LivePage, PayPage, QrPayResolver, QrResolvePage, PayRequestPage,
  GuestPaymentSuccess, AddContactPage,

  // QR
  QrScannerPage, QrEntryPage, QrTrackingPage, QrPickupPage, QrGeneratePage,

  // SEO
  MarketplaceServicesPage, ActivitiesPage, SeasonalRentalsPage, SEOCatchAll,
  LongTermRentalsPage, ServiceCitySEOPage, ActivityCitySEOPage,
  CoreSEOPages, PropertyManagementPlatformPage, RentalManagementSoftwarePage,
  LocationsPage, CountryHubPage, CityHubPage, DynamicCityCategoryPage,
  MarketplaceHubPage, MarketplaceCityPage, MarketplaceServiceCityPage,
  ServiceCategoryPage, ServiceCityPage, ProviderSEOPage,
  SlugResolver, SlugCategoryResolver,

  // Legal
  TermsPage, PrivacyPage, CookiePage, LegalNoticePage, AboutPage, ContactPage, HelpPage, PlatformVision,

  // Misc
  ClaimPage, ClaimShopPage, AppNotFoundPage,
} = Pages;

// City sub-page wrappers
const CityServicesPage = () => <CityHubPage subPage="services" />;
const CityActivitiesPage = () => <CityHubPage subPage="activities" />;
const CityConciergePage = () => <CityHubPage subPage="concierge" />;

function StorefrontSlugRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/shop/store/${slug || ""}`} replace />;
}

function DashboardCommRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/orbit${search}`} replace />;
}

// ── Runtime bootstrap ──
import { queryClient } from "@/lib/query-client";
import { setActionQueryClient } from "@/lib/run-action";
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__REACT_QUERY_CLIENT__ = queryClient;
}
setActionQueryClient(queryClient);
setTimeout(() => {
  import("@/lib/smart-prefetch").then((m) => m.prefetchCriticalRoutes()).catch((e) => console.warn("[boot] prefetch failed", e));
}, 2000);
setTimeout(() => {
  import("@/lib/super-app-bridge").then((m) => m.installSuperAppBridge()).catch((e) => console.warn("[boot] super-app-bridge failed", e));
}, 5000);

const PageLoader = () => (
  <div className="app-mobile-page bg-background min-h-[60dvh] px-4 pt-5">
    <div className="h-5 w-28 rounded-lg skeleton-premium mb-4" />
    <div className="h-32 w-full rounded-2xl skeleton-premium mb-4" />
    <div className="flex gap-2 mb-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-10 flex-1 rounded-xl skeleton-premium" />)}
    </div>
    <div className="grid grid-cols-5 gap-2 mb-4">
      {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl skeleton-premium" />)}
    </div>
    <div className="space-y-3">
      <div className="h-4 w-2/3 rounded skeleton-premium" />
      <div className="h-4 w-1/2 rounded skeleton-premium" />
    </div>
  </div>
);

const App = () => (
  <AppCrashBoundary>
  <ChunkRecoveryBoundary>
  <ErrorBoundary>
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false} storageKey="easylocs-theme">
  <QueryClientProvider client={queryClient}>
  <I18nProvider>
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <AuthProvider>
    <CallProvider>
    <UnifiedPaymentProvider>
    <AppLockGuard>
      <Suspense fallback={null}>
        <IntentNavigateProvider />
      </Suspense>
      <DeferredBootGuards />
      <SmartCoreTracker />
      <Suspense fallback={<PageLoader />}>
        <SwipeableMain className="pb-[calc(72px+env(safe-area-inset-bottom,0px)+16px)]">
          <Routes>

                  {/* ═══════════════════════════════════════════════ */}
                  {/*  AUTH                                          */}
                  {/* ═══════════════════════════════════════════════ */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                  <Route path="/install" element={<Install />} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/*  PILLAR 1 · DASHBOARD                         */}
                  {/* ═══════════════════════════════════════════════ */}
                  <Route path="/" element={<FeatureErrorBoundary featureName="Dashboard"><HomeRouter /></FeatureErrorBoundary>} />
                  <Route path="/home" element={<MarketplaceHomeRouter />} />
                  <Route path="/pricing" element={<Navigate to="/#pricing" replace />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/dashboard/property/add" element={<ProtectedRoute><AddProperty /></ProtectedRoute>} />
                  <Route path="/dashboard/property/:id" element={<ProtectedRoute><PropertyDetailHub /></ProtectedRoute>} />
                  <Route path="/dashboard/create-listing" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
                  <Route path="/dashboard/receipts" element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
                  <Route path="/dashboard/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
                  <Route path="/dashboard/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
                  <Route path="/dashboard/ai" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
                  <Route path="/dashboard/leases" element={<ProtectedRoute><Leases /></ProtectedRoute>} />
                  <Route path="/dashboard/company" element={<ProtectedRoute><Company /></ProtectedRoute>} />
                  <Route path="/dashboard/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
                  <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/dashboard/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
                  <Route path="/dashboard/rental-management" element={<ProtectedRoute><RentalManagement /></ProtectedRoute>} />
                  <Route path="/dashboard/finances" element={<ProtectedRoute><Finances /></ProtectedRoute>} />
                  <Route path="/dashboard/interventions" element={<ProtectedRoute><Interventions /></ProtectedRoute>} />
                  <Route path="/dashboard/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
                  <Route path="/dashboard/messages" element={<Navigate to="/orbit" replace />} />
                  <Route path="/dashboard/activities" element={<Navigate to="/activities" replace />} />
                  <Route path="/dashboard/communication" element={<DashboardCommRedirect />} />
                  <Route path="/dashboard/charges-regularization" element={<ProtectedRoute><ChargesRegularization /></ProtectedRoute>} />
                  <Route path="/dashboard/fiscal-report" element={<ProtectedRoute><FiscalReport /></ProtectedRoute>} />
                  <Route path="/dashboard/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
                  <Route path="/dashboard/candidates" element={<ProtectedRoute><Candidates /></ProtectedRoute>} />
                  <Route path="/dashboard/seasonal-rentals" element={<ProtectedRoute><SeasonalRentals /></ProtectedRoute>} />
                  <Route path="/dashboard/payment-notices" element={<ProtectedRoute><PaymentNotices /></ProtectedRoute>} />
                  <Route path="/dashboard/dunning-letters" element={<ProtectedRoute><DunningLetters /></ProtectedRoute>} />
                  <Route path="/dashboard/furniture-inventory" element={<ProtectedRoute><FurnitureInventory /></ProtectedRoute>} />
                  <Route path="/dashboard/buildings" element={<ProtectedRoute><Buildings /></ProtectedRoute>} />
                  <Route path="/dashboard/vault" element={<ProtectedRoute><Vault /></ProtectedRoute>} />
                  <Route path="/dashboard/import" element={<ProtectedRoute><DataImport /></ProtectedRoute>} />
                  <Route path="/dashboard/cv-generator" element={<ProtectedRoute><CVGenerator /></ProtectedRoute>} />
                  <Route path="/dashboard/subscriptions" element={<ProtectedRoute><CategorySubscriptions /></ProtectedRoute>} />
                  <Route path="/dashboard/channels" element={<ProtectedRoute><ChannelManager /></ProtectedRoute>} />
                  <Route path="/dashboard/accounting" element={<ProtectedRoute><Accounting /></ProtectedRoute>} />
                  <Route path="/dashboard/rent-cockpit" element={<ProtectedRoute><LandlordRentDashboard /></ProtectedRoute>} />
                  <Route path="/dashboard/accounting-entries" element={<ProtectedRoute><AccountingEntries /></ProtectedRoute>} />
                  <Route path="/dashboard/reporting" element={<ProtectedRoute><ReportingDashboard /></ProtectedRoute>} />
                  <Route path="/dashboard/dynamic-pricing" element={<ProtectedRoute><DynamicPricing /></ProtectedRoute>} />
                  <Route path="/dashboard/calendar" element={<ProtectedRoute><PropertyCalendar /></ProtectedRoute>} />
                  <Route path="/dashboard/real-estate" element={<ProtectedRoute><RealEstateListings /></ProtectedRoute>} />
                  <Route path="/dashboard/profile" element={<ProtectedRoute><LandlordProfile /></ProtectedRoute>} />
                  <Route path="/dashboard/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
                  <Route path="/dashboard/collaboration" element={<ProtectedRoute><Collaboration /></ProtectedRoute>} />
                  <Route path="/dashboard/developer" element={<ProtectedRoute><DeveloperPortal /></ProtectedRoute>} />
                  <Route path="/dashboard/audit" element={<ProtectedRoute><AuditTrail /></ProtectedRoute>} />
                  <Route path="/dashboard/wallet" element={<Navigate to="/wallet" replace />} />
                  <Route path="/dashboard/service-tracking" element={<ProtectedRoute><ServiceTrackingPage /></ProtectedRoute>} />
                  <Route path="/dashboard/seller" element={<Navigate to="/seller" replace />} />
                  <Route path="/dashboard/driver" element={<Navigate to="/driver/dashboard" replace />} />
                  <Route path="/dashboard/delivery" element={<Navigate to="/driver/dashboard" replace />} />
                  <Route path="/dashboard/my-shop" element={<Navigate to="/dashboard/my-shops" replace />} />
                  <Route path="/dashboard/my-shops" element={<ProtectedRoute><MyShopsPage /></ProtectedRoute>} />
                  <Route path="/dashboard/ops" element={<ProtectedRoute><OpsCenter /></ProtectedRoute>} />
                  <Route path="/dashboard/country/:countryCode" element={<ProtectedRoute><CountryWorkspace /></ProtectedRoute>} />
                  <Route path="/dashboard/boost" element={<ProtectedRoute><BoostDashboardPage /></ProtectedRoute>} />
                  <Route path="/dashboard/properties" element={<ProtectedRoute><RealEstateModulePage /></ProtectedRoute>}>
                    <Route index element={<REPropertiesPage />} />
                    <Route path="units" element={<REUnitsPage />} />
                    <Route path="tenants" element={<RETenantsPage />} />
                    <Route path="leases" element={<RELeasesPage />} />
                    <Route path="payments" element={<REPaymentsPage />} />
                    <Route path="documents" element={<REDocumentsPage />} />
                  </Route>
                  <Route path="/real-estate/property/:propertyId" element={<REPropertyDetailPage />} />
                  <Route path="/real-estate/lease/:leaseId" element={<RELeaseDetailPage />} />
                  <Route path="/property-management" element={<Navigate to="/dashboard/real-estate" replace />} />
                  <Route path="/rentals" element={<Navigate to="/dashboard/rental-management" replace />} />
                  <Route path="/developer" element={<Navigate to="/dashboard/developer" replace />} />
                  <Route path="/concierge-ops" element={<ProtectedRoute><ConciergeOperations /></ProtectedRoute>} />
                  <Route path="/customer/:customerId" element={<ProtectedRoute><CustomerProfilePage /></ProtectedRoute>} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/*  PILLAR 2 · RADAR (Discover · Browse · Move)   */}
                  {/* ═══════════════════════════════════════════════ */}
                  <Route path="/radar" element={<FeatureErrorBoundary featureName="Radar"><HyperRadarPage /></FeatureErrorBoundary>} />
                  <Route path="/map" element={<Navigate to="/radar" replace />} />
                  <Route path="/discover" element={<Navigate to="/radar" replace />} />
                  <Route path="/search" element={<Navigate to="/radar" replace />} />
                  <Route path="/explore" element={<ExplorePage />} />
                  <Route path="/search-results" element={<SearchResultsPage />} />
                  <Route path="/browse" element={<DiscoverPage />} />
                  <Route path="/browse/:vertical" element={<BrowseVerticalPage />} />
                  <Route path="/food" element={<Navigate to="/browse/food" replace />} />
                  <Route path="/grocery" element={<Navigate to="/browse/grocery" replace />} />
                  <Route path="/services-hub" element={<Navigate to="/browse/services" replace />} />
                  <Route path="/shops" element={<Navigate to="/browse/retail" replace />} />
                  <Route path="/healthcare" element={<Navigate to="/browse/healthcare" replace />} />
                  <Route path="/experiences" element={<Navigate to="/browse/experiences" replace />} />
                  <Route path="/utility" element={<Navigate to="/browse/utility" replace />} />
                  <Route path="/electronics" element={<Navigate to="/browse/shops?sub=electronics" replace />} />
                  <Route path="/gifts" element={<Navigate to="/browse/shops?sub=gifts" replace />} />
                  <Route path="/pets" element={<Navigate to="/browse/services?sub=pet_care" replace />} />
                  <Route path="/food/restaurant/:restaurantId" element={<FoodRestaurantPage />} />
                  <Route path="/food/:type" element={<FoodTypePage />} />
                  <Route path="/food/:type/:cuisine" element={<CuisineListPage />} />
                  <Route path="/shop" element={<RetailIndexPage />} />
                  <Route path="/shop/category/:categorySlug" element={<RetailCategoryPage />} />
                  <Route path="/shop/subcategory/:categorySlug/:subcategorySlug" element={<RetailCategoryPage />} />
                  <Route path="/shop/mall/:mallSlug" element={<RetailMallPage />} />
                  <Route path="/shop/store/:slug" element={<RetailStorePage />} />
                  <Route path="/property" element={<PropertyHubPage />} />
                  <Route path="/real-estate" element={<Pages.RealEstateMarketplace />} />
                  <Route path="/real-estate/buy" element={<Pages.RealEstateMarketplace />} />
                  <Route path="/real-estate/rent" element={<Pages.RealEstateMarketplace />} />
                  <Route path="/real-estate/short-stay" element={<Pages.RealEstateMarketplace />} />
                  <Route path="/real-estate/long-stay" element={<Pages.RealEstateMarketplace />} />
                  <Route path="/real-estate/:listingType/:slug" element={<Pages.RealEstateDetailPage />} />
                  <Route path="/property-hub" element={<PropertyManagementHub />} />
                  <Route path="/travel" element={<TravelHub />} />
                  <Route path="/travel/flights" element={<TravelFlights />} />
                  <Route path="/travel/stays" element={<TravelStays />} />
                  <Route path="/travel/hotels" element={<Navigate to="/travel/stays" replace />} />
                  <Route path="/travel/hotel/:id" element={<TravelHotelDetail />} />
                  <Route path="/travel/hotel-checkout" element={<ProtectedRoute><HotelCheckout /></ProtectedRoute>} />
                  <Route path="/travel/stay/:id" element={<TravelStayDetail />} />
                  <Route path="/travel/flight/:id" element={<TravelFlightDetail />} />
                  <Route path="/travel/flight-search" element={<FlightSearchPage />} />
                  <Route path="/travel/flight-results" element={<FlightResultsPage />} />
                  <Route path="/travel/flight-detail" element={<FlightDetailPage />} />
                  <Route path="/travel/flight-passengers" element={<ProtectedRoute><FlightPassengerPage /></ProtectedRoute>} />
                  <Route path="/travel/flight-payment" element={<ProtectedRoute><FlightPaymentPage /></ProtectedRoute>} />
                  <Route path="/travel/flight-confirmation" element={<ProtectedRoute><FlightConfirmationPage /></ProtectedRoute>} />
                  <Route path="/property/search" element={<PropertySearchPage />} />
                  <Route path="/property/results" element={<PropertyResultsPage />} />
                  <Route path="/property/detail" element={<PropertyDetailPage />} />
                  <Route path="/property/booking" element={<ProtectedRoute><PropertyBookingPage /></ProtectedRoute>} />
                  <Route path="/property/payment" element={<ProtectedRoute><PropertyPaymentPage /></ProtectedRoute>} />
                  <Route path="/property/confirmation" element={<ProtectedRoute><PropertyConfirmationPage /></ProtectedRoute>} />
                  <Route path="/mobility" element={<MobilityHubPage />} />
                  <Route path="/mobility/taxi" element={<MobilityTaxiPage />} />
                  <Route path="/mobility/delivery" element={<MobilityDeliveryPage />} />
                  <Route path="/mobility/delivery/bring" element={<DeliveryBringPage />} />
                  <Route path="/mobility/delivery/parcel" element={<DeliveryParcelPage />} />
                  <Route path="/mobility/delivery/gift" element={<DeliveryGiftPage />} />
                  <Route path="/mobility/delivery/errand" element={<DeliveryErrandPage />} />
                  <Route path="/rider/live" element={<ProtectedRoute><RiderLivePage /></ProtectedRoute>} />
                  <Route path="/ride" element={<Navigate to="/mobility/taxi" replace />} />
                  <Route path="/taxi" element={<Navigate to="/mobility/taxi" replace />} />
                  <Route path="/send" element={<Navigate to="/mobility/delivery" replace />} />
                  <Route path="/send-package" element={<Navigate to="/mobility/delivery" replace />} />
                  <Route path="/delivery" element={<Navigate to="/mobility/delivery" replace />} />
                  <Route path="/track/:rideRequestId" element={<TrackRidePage />} />
                  <Route path="/call/:threadId" element={<ProtectedRoute><CallDriverPage /></ProtectedRoute>} />
                  <Route path="/driver/heatmap" element={<ProtectedRoute><DemandHeatmapPage /></ProtectedRoute>} />
                  <Route path="/subscription/priority" element={<ProtectedRoute><RiderPrioritySubscriptionPage /></ProtectedRoute>} />
                  <Route path="/listing/:id" element={<PublicListing />} />
                  <Route path="/book/:slug" element={<PublicServiceBooking />} />
                  <Route path="/nearby" element={<LocalServices />} />
                  <Route path="/rentals/:country" element={<RentalCatalog />} />
                  <Route path="/rentals/:country/:city" element={<RentalCatalog />} />
                  <Route path="/stay" element={<TravelStays />} />
                  <Route path="/stays" element={<Navigate to="/stay" replace />} />
                  <Route path="/stays/:country" element={<Navigate to="/stay" replace />} />
                  <Route path="/stays/:country/:city" element={<Navigate to="/stay" replace />} />
                  <Route path="/host/:orgId" element={<HostCatalog />} />
                  <Route path="/activities" element={<ActivitiesMarketplace />} />
                  <Route path="/guest/:orgId" element={<GuestPortal />} />
                  <Route path="/provider/:providerId" element={<ProviderStorefront />} />
                  <Route path="/store/:storeId" element={<StorePage />} />
                  <Route path="/s/:slug" element={<ShopPage />} />
                  <Route path="/s/:slug/:categorySlug" element={<ShopCategoryPage />} />
                  <Route path="/saved" element={<Navigate to="/favorites" replace />} />
                  <Route path="/showcase/:orgId" element={<PropertiesShowcase />} />
                  <Route path="/account/:orgId" element={<AccountShowcase />} />
                  <Route path="/properties" element={<PropertiesShowcase />} />
                  <Route path="/top-rated" element={<RealEstateListings />} />
                  <Route path="/trending" element={<RealEstateListings />} />
                  <Route path="/real-estate-listing/:id" element={<PublicRealEstateListing />} />
                  <Route path="/concierge-services" element={<ConciergeServicesPage />} />
                  <Route path="/city-market/:citySlug" element={<CityMarketplacePage />} />
                  <Route path="/menu/:shopSlug" element={<ShopOrderPage />} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/*  PILLAR 3 · ORBIT (Messaging · Contacts)       */}
                  {/* ═══════════════════════════════════════════════ */}
                  <Route path="/orbit" element={<ProtectedRoute><FeatureErrorBoundary featureName="Orbit"><CommunicationCenter /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/orbit/:conversationId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Orbit"><CommunicationCenter /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/orbit/contacts" element={<ProtectedRoute><FeatureErrorBoundary featureName="Orbit"><OrbitContactsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/orbit/add" element={<ProtectedRoute><FeatureErrorBoundary featureName="Orbit"><OrbitAddContactPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/orbit/identity" element={<ProtectedRoute><FeatureErrorBoundary featureName="Orbit"><OrbitIdentityPage /></FeatureErrorBoundary></ProtectedRoute>} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/*  PILLAR 4 · WALLET (Pay · Orders · Checkout)   */}
                  {/* ═══════════════════════════════════════════════ */}
                  <Route path="/wallet" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><WalletHubPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/wallet/hub" element={<Navigate to="/wallet" replace />} />
                  <Route path="/wallet/top-up" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><WalletTopUpPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/wallet/transfer" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><WalletTransferPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/wallet/request" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><WalletRequestPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/wallet/transaction/:txId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><WalletTransactionDetailPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/wallet/pay/:threadId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><PayRidePage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/wallet/property" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><Pages.WalletPropertyHub /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/wallet/property/rents" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><Pages.WalletPropertyHub /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/wallet/property/deposits" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><Pages.WalletPropertyHub /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/wallet/property/payouts" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><Pages.WalletPropertyHub /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/wallet/property/expenses" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><Pages.WalletPropertyHub /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/wallet/accounts" element={<Navigate to="/settings/wallet" replace />} />
                  <Route path="/pos" element={<ProtectedRoute><POSPage /></ProtectedRoute>} />
                  <Route path="/pos/:shopId" element={<ProtectedRoute><POSPage /></ProtectedRoute>} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/checkout/address-selector" element={<ProtectedRoute><CustomerAddressSelectorPage /></ProtectedRoute>} />
                  <Route path="/checkout/group-order" element={<ProtectedRoute><CustomerGroupOrderPage /></ProtectedRoute>} />
                  <Route path="/checkout/gift-order" element={<ProtectedRoute><CustomerOrderGiftsPage /></ProtectedRoute>} />
                  <Route path="/checkout/split-bill" element={<ProtectedRoute><CustomerSplitBillPage /></ProtectedRoute>} />
                  <Route path="/checkout/party-order" element={<ProtectedRoute><CustomerPartyOrderPage /></ProtectedRoute>} />
                  <Route path="/checkout/share-cart" element={<ProtectedRoute><CustomerShareCartPage /></ProtectedRoute>} />
                  <Route path="/orders" element={<Navigate to="/my-orders" replace />} />
                  <Route path="/my-orders" element={<ProtectedRoute><MyOrdersPage /></ProtectedRoute>} />
                  <Route path="/my-orders/active" element={<ProtectedRoute><CustomerActiveOrdersPage /></ProtectedRoute>} />
                  <Route path="/my-orders/archive" element={<ProtectedRoute><CustomerOrderArchivePage /></ProtectedRoute>} />
                  <Route path="/order/:orderId" element={<ProtectedRoute><UnifiedOrderDetailPage /></ProtectedRoute>} />
                  <Route path="/order/receipt/:orderId" element={<ProtectedRoute><OrderReceiptPage /></ProtectedRoute>} />
                  <Route path="/order/refund/:orderId" element={<ProtectedRoute><OrderRefundRequestPage /></ProtectedRoute>} />
                  <Route path="/order/reorder/:orderId" element={<ProtectedRoute><ReorderPage /></ProtectedRoute>} />
                  <Route path="/reorder" element={<ProtectedRoute><CustomerReorderPage /></ProtectedRoute>} />
                  <Route path="/tracking/:orderId" element={<ProtectedRoute><TrackingPage /></ProtectedRoute>} />
                  <Route path="/live-tracking" element={<ProtectedRoute><LiveTrackingPageNew /></ProtectedRoute>} />
                  <Route path="/refund/:rideRequestId" element={<ProtectedRoute><RefundRequestPage /></ProtectedRoute>} />
                  <Route path="/payment/:orderId" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
                  <Route path="/payments/stripe-elements" element={<ProtectedRoute><StripeElementsPage /></ProtectedRoute>} />
                  <Route path="/payments/stripe-handler" element={<ProtectedRoute><StripeCheckoutHandlerPage /></ProtectedRoute>} />
                  <Route path="/guest/checkout/:cartId" element={<GuestCheckoutPage />} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/*  PILLAR 5 · ME (Profile · Settings · Tools)    */}
                  {/* ═══════════════════════════════════════════════ */}
                  <Route path="/me" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><MeCommandCenter /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/edit-profile" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><EditProfilePage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/spending-insights" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerSpendingInsightsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/address-book" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerAddressBookPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/loyalty-history" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerLoyaltyHistoryPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/saved-cards" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerSavedCardsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/saved-carts" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerSavedCartsPage2 /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/delivery-notes" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerDeliveryNotesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/payment-activity" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerPaymentActivityPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/order-receipts" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerOrderReceiptsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/gestion-immo" element={<Navigate to="/me/properties" replace />} />
                  <Route path="/me/gestion-immo/:propertyId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MePropertyDetail /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/tenant-view" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MeTenantView /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/properties" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MePropertyCockpit /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/properties/list" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MePropertyListPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/properties/create" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MePropertyCreatePage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/properties/:propertyId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MePropertyDetail /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/properties/analytics" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MePropertyAnalyticsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/tenants" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MeTenantsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/leases" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MeLeasesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/leases/:leaseId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MeLeasesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/maintenance" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MeMaintenancePage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/maintenance/:ticketId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MeMaintenancePage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/auto-repeat" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerAutoRepeatPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/redeem-rewards" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerRewardRedemptionPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><NotificationCenterPage /></ProtectedRoute>} />
                  <Route path="/location/live" element={<ProtectedRoute><CustomerLiveLocationPage /></ProtectedRoute>} />
                  <Route path="/permissions" element={<ProtectedRoute><PermissionCenterPage /></ProtectedRoute>} />
                  <Route path="/support/tickets" element={<ProtectedRoute><SupportTicketsPage /></ProtectedRoute>} />
                  <Route path="/support/tickets/:ticketId" element={<ProtectedRoute><SupportTicketDetailPage /></ProtectedRoute>} />
                  <Route path="/team/command-center" element={<ProtectedRoute><TeamCommandCenterPage /></ProtectedRoute>} />
                  <Route path="/team/permissions" element={<ProtectedRoute><TeamPermissionsPage /></ProtectedRoute>} />

                  {/* Settings — /settings redirects to /me (unified hub) */}
                  <Route path="/settings" element={<Navigate to="/me" replace />} />
                  <Route path="/settings/account" element={<ProtectedRoute><SettingsAccountPage /></ProtectedRoute>} />
                  <Route path="/settings/orbit" element={<ProtectedRoute><SettingsOrbitPage /></ProtectedRoute>} />
                  <Route path="/settings/business" element={<ProtectedRoute><SettingsBusinessPage /></ProtectedRoute>} />
                  <Route path="/settings/wallet" element={<ProtectedRoute><SettingsWalletPage /></ProtectedRoute>} />
                  <Route path="/settings/addresses" element={<ProtectedRoute><SettingsAddressesPage /></ProtectedRoute>} />
                  <Route path="/settings/notifications" element={<ProtectedRoute><SettingsNotificationsPage /></ProtectedRoute>} />
                  <Route path="/settings/security" element={<ProtectedRoute><SettingsSecurityPage /></ProtectedRoute>} />
                  <Route path="/settings/preferences" element={<ProtectedRoute><SettingsPreferencesPage /></ProtectedRoute>} />
                  <Route path="/settings/support" element={<ProtectedRoute><SettingsSupportPage /></ProtectedRoute>} />
                  <Route path="/settings/payment-methods" element={<Navigate to="/wallet" replace />} />
                  <Route path="/settings/notification-preferences" element={<Navigate to="/settings/notifications" replace />} />

                  {/* Merchant tools */}
                  <Route path="/merchant/claim" element={<MerchantClaimPage />} />
                  <Route path="/merchant/onboarding" element={<MerchantOnboardingPage />} />
                  <Route path="/merchant/dashboard" element={<ProtectedRoute><MerchantDashboardPage /></ProtectedRoute>} />
                  <Route path="/merchant/dashboard/:merchantId" element={<ProtectedRoute><MerchantDashboardPage /></ProtectedRoute>} />
                  <Route path="/merchant/finance" element={<ProtectedRoute><MerchantFinancePage /></ProtectedRoute>} />
                  <Route path="/merchant/pos" element={<ProtectedRoute><MerchantPosPage /></ProtectedRoute>} />
                  <Route path="/merchant/kitchen" element={<ProtectedRoute><MerchantKitchenPage /></ProtectedRoute>} />
                  <Route path="/merchant/orders" element={<ProtectedRoute><MerchantOrdersPage /></ProtectedRoute>} />
                  <Route path="/merchant/orders/:merchantId" element={<ProtectedRoute><MerchantOrderBoardPage /></ProtectedRoute>} />
                  <Route path="/merchant/qr/:shopId" element={<ProtectedRoute><ShopQrCenterPage /></ProtectedRoute>} />
                  <Route path="/merchant/menu" element={<ProtectedRoute><MerchantMenuPageNew /></ProtectedRoute>} />
                  <Route path="/merchant/menu/:merchantId" element={<ProtectedRoute><MerchantMenuPageNew /></ProtectedRoute>} />
                  <Route path="/merchant/menu-bulk/:merchantId" element={<ProtectedRoute><MerchantMenuBulkEditPage /></ProtectedRoute>} />
                  <Route path="/merchant/menu-categories/:merchantId" element={<ProtectedRoute><MerchantMenuCategoryManagerPage /></ProtectedRoute>} />
                  <Route path="/merchant/store-settings/:merchantId" element={<ProtectedRoute><MerchantStoreSettingsPage /></ProtectedRoute>} />
                  <Route path="/merchant/promos/:merchantId" element={<ProtectedRoute><MerchantPromoManagerPage /></ProtectedRoute>} />
                  <Route path="/merchant/banner-editor/:merchantId" element={<ProtectedRoute><MerchantPromoBannerEditorPage /></ProtectedRoute>} />
                  <Route path="/merchant/inventory/:merchantId" element={<ProtectedRoute><MerchantInventoryPage /></ProtectedRoute>} />
                  <Route path="/merchant/inventory-alerts/:merchantId" element={<ProtectedRoute><MerchantInventoryAlertsPage /></ProtectedRoute>} />
                  <Route path="/merchant/live/:merchantId" element={<ProtectedRoute><MerchantLiveControlPage /></ProtectedRoute>} />
                  <Route path="/merchant/coupons/:merchantId" element={<ProtectedRoute><MerchantCouponManagerPage /></ProtectedRoute>} />
                  <Route path="/merchant/analytics/:merchantId" element={<ProtectedRoute><MerchantBasicAnalyticsPage /></ProtectedRoute>} />
                  <Route path="/merchant/customers/:merchantId" element={<ProtectedRoute><MerchantCustomersPage /></ProtectedRoute>} />
                  <Route path="/merchant/customer-insights/:merchantId" element={<ProtectedRoute><MerchantCustomerInsightsPage /></ProtectedRoute>} />
                  <Route path="/merchant/product-performance/:merchantId" element={<ProtectedRoute><MerchantProductPerformancePage /></ProtectedRoute>} />
                  <Route path="/merchant/business-summary/:merchantId" element={<ProtectedRoute><MerchantBusinessSummaryPage /></ProtectedRoute>} />
                  <Route path="/merchant/closing-mode/:merchantId" element={<ProtectedRoute><MerchantClosingModePage /></ProtectedRoute>} />
                  <Route path="/merchant/auto-accept/:merchantId" element={<ProtectedRoute><MerchantAutoAcceptSettingsPage /></ProtectedRoute>} />
                  <Route path="/merchant/staff-access/:merchantId" element={<ProtectedRoute><MerchantStaffAccessPage /></ProtectedRoute>} />
                  <Route path="/merchant/daily-sales/:merchantId" element={<ProtectedRoute><MerchantDailySalesPage /></ProtectedRoute>} />
                  <Route path="/merchant/reviews/:merchantId" element={<ProtectedRoute><MerchantReviewRepliesPage /></ProtectedRoute>} />
                  <Route path="/merchant/refund-requests/:merchantId" element={<ProtectedRoute><MerchantRefundRequestsPage /></ProtectedRoute>} />
                  <Route path="/merchant/delivery-zones/:merchantId" element={<ProtectedRoute><MerchantDeliveryZonesPage /></ProtectedRoute>} />
                  <Route path="/merchant/kitchen-display/:merchantId" element={<ProtectedRoute><MerchantKitchenDisplayPage /></ProtectedRoute>} />
                  <Route path="/merchant/business-hours/:merchantId" element={<ProtectedRoute><MerchantBusinessHoursPage /></ProtectedRoute>} />

                  {/* Driver tools */}
                  <Route path="/driver/dashboard" element={<ProtectedRoute><DriverDashboardPageNew /></ProtectedRoute>} />
                  <Route path="/driver/payout" element={<ProtectedRoute><DriverPayoutPage /></ProtectedRoute>} />
                  <Route path="/driver/earnings" element={<ProtectedRoute><DriverEarningsPageNew /></ProtectedRoute>} />
                  <Route path="/driver/earnings-v2" element={<Navigate to="/driver/earnings" replace />} />
                  <Route path="/driver/earnings-summary" element={<ProtectedRoute><DriverEarningsSummaryPage /></ProtectedRoute>} />
                  <Route path="/driver/missions-board" element={<ProtectedRoute><DriverMissionsPage /></ProtectedRoute>} />
                  <Route path="/driver/missions-board/:orderId" element={<ProtectedRoute><DriverMissionDetailPage /></ProtectedRoute>} />
                  <Route path="/driver/proof/:orderId" element={<ProtectedRoute><DriverProofPage /></ProtectedRoute>} />
                  <Route path="/driver/active-missions" element={<ProtectedRoute><DriverActiveMissionsPage /></ProtectedRoute>} />
                  <Route path="/driver/live-missions" element={<ProtectedRoute><DriverLiveMissionsPage /></ProtectedRoute>} />
                  <Route path="/driver/completed-deliveries" element={<ProtectedRoute><DriverCompletedDeliveriesPage /></ProtectedRoute>} />
                  <Route path="/driver/shift" element={<ProtectedRoute><DriverShiftPage /></ProtectedRoute>} />
                  <Route path="/driver/availability-zones" element={<ProtectedRoute><DriverAvailabilityZonesPage /></ProtectedRoute>} />
                  <Route path="/driver/fuel-costs-v2" element={<ProtectedRoute><DriverFuelCostsPage /></ProtectedRoute>} />
                  <Route path="/driver/breaks" element={<ProtectedRoute><DriverBreaksPage /></ProtectedRoute>} />

                  {/* Seller & Business */}
                  <Route path="/seller" element={<ProtectedRoute><SellerDashboardPage /></ProtectedRoute>} />
                  <Route path="/seller/boost" element={<ProtectedRoute><BoostDashboardPage /></ProtectedRoute>} />
                  <Route path="/business" element={<ProtectedRoute><MyBusinessHub /></ProtectedRoute>} />
                  <Route path="/claim-shop/:merchantId" element={<ClaimShopPage />} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/*  ADMIN PANEL                                   */}
                  {/* ═══════════════════════════════════════════════ */}
                  <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/super-dashboard" element={<ProtectedRoute><AdminSuperDashboardPage /></ProtectedRoute>} />
                  <Route path="/admin/executive-dashboard" element={<ProtectedRoute><ExecutiveDashboard /></ProtectedRoute>} />
                  <Route path="/admin/executive-kpi" element={<ProtectedRoute><ExecutiveKPIBoardPage /></ProtectedRoute>} />
                  <Route path="/admin/ops-dashboard" element={<ProtectedRoute><AdminOpsDashboardPage /></ProtectedRoute>} />
                  <Route path="/admin/ai-quality" element={<ProtectedRoute><AIQualityDashboard /></ProtectedRoute>} />
                  <Route path="/admin/ai-ops-chat" element={<ProtectedRoute><AIOpsChatPage /></ProtectedRoute>} />
                  <Route path="/admin/ai-decisions" element={<ProtectedRoute><AIDecisionsDashboardPage /></ProtectedRoute>} />
                  <Route path="/admin/disputes" element={<ProtectedRoute><AdminDisputesPage /></ProtectedRoute>} />
                  <Route path="/admin/fraud" element={<ProtectedRoute><AdminFraudPage /></ProtectedRoute>} />
                  <Route path="/admin/fraud-detection" element={<ProtectedRoute><AdminFraudDetectionPage /></ProtectedRoute>} />
                  <Route path="/admin/fraud-monitor" element={<ProtectedRoute><AdminFraudMonitorPage /></ProtectedRoute>} />
                  <Route path="/admin/live-ops" element={<ProtectedRoute><AdminLiveOpsPage /></ProtectedRoute>} />
                  <Route path="/admin/sla" element={<ProtectedRoute><AdminSLAPage /></ProtectedRoute>} />
                  <Route path="/admin/support-sla" element={<ProtectedRoute><AdminSupportSlaPage /></ProtectedRoute>} />
                  <Route path="/admin/trust-graph" element={<ProtectedRoute><AdminTrustGraphPage /></ProtectedRoute>} />
                  <Route path="/admin/financial-recon" element={<ProtectedRoute><FinancialReconPage /></ProtectedRoute>} />
                  <Route path="/admin/recon-alerts" element={<ProtectedRoute><ReconAlertsPage /></ProtectedRoute>} />
                  <Route path="/admin/merchant-onboarding" element={<ProtectedRoute><MerchantOnboardingAdminPage /></ProtectedRoute>} />
                  <Route path="/admin/workspace-bootstrap" element={<ProtectedRoute><WorkspaceBootstrapPage /></ProtectedRoute>} />
                  <Route path="/admin/menu" element={<ProtectedRoute><MenuAdminPage /></ProtectedRoute>} />
                  <Route path="/admin/support-inbox" element={<ProtectedRoute><SupportInboxPage /></ProtectedRoute>} />
                  <Route path="/admin/kpi-charts" element={<ProtectedRoute><KpiChartsPage /></ProtectedRoute>} />
                  <Route path="/admin/driver-heatmap" element={<ProtectedRoute><AdminDriverHeatmapPage /></ProtectedRoute>} />
                  <Route path="/admin/driver-live" element={<ProtectedRoute><DriverLivePage /></ProtectedRoute>} />
                  <Route path="/admin/driver-monitor" element={<ProtectedRoute><AdminDriverMonitorPage /></ProtectedRoute>} />
                  <Route path="/admin/realtime-control" element={<ProtectedRoute><AdminRealtimeControlPage /></ProtectedRoute>} />
                  <Route path="/admin/deployment-checklist" element={<ProtectedRoute><DeploymentChecklistPage /></ProtectedRoute>} />
                  <Route path="/admin/loyalty-redeem" element={<ProtectedRoute><LoyaltyRedeemPage /></ProtectedRoute>} />
                  <Route path="/admin/alerts" element={<ProtectedRoute><AdminAlertCenterPage /></ProtectedRoute>} />
                  <Route path="/admin/outreach" element={<ProtectedRoute><AdminOutreachPage /></ProtectedRoute>} />
                  <Route path="/admin/wallet-diagnostics" element={<ProtectedRoute><AdminWalletDiagnosticsPage /></ProtectedRoute>} />
                  <Route path="/admin/wallet-watch" element={<ProtectedRoute><AdminWalletWatchPage /></ProtectedRoute>} />
                  <Route path="/admin/execution-proof" element={<ProtectedRoute><ExecutionProofPage /></ProtectedRoute>} />
                  <Route path="/admin/review-queue" element={<ProtectedRoute><AdminReviewQueuePage /></ProtectedRoute>} />
                  <Route path="/admin/growth" element={<ProtectedRoute><AdminGrowthDashboardPage /></ProtectedRoute>} />
                  <Route path="/admin/growth-engine" element={<ProtectedRoute><AdminGrowthEnginePage /></ProtectedRoute>} />
                  <Route path="/admin/growth-ops" element={<ProtectedRoute><AdminGrowthOpsPage /></ProtectedRoute>} />
                  <Route path="/admin/qr-generate" element={<ProtectedRoute><QrGeneratePage /></ProtectedRoute>} />
                  <Route path="/admin/route-audit" element={<ProtectedRoute><RouteAuditPage /></ProtectedRoute>} />
                  <Route path="/admin/test-restaurants" element={<ProtectedRoute><AdminRestaurantTestSeederPage /></ProtectedRoute>} />
                  <Route path="/admin/runtime-audit" element={<ProtectedRoute><AdminRuntimeAuditPage /></ProtectedRoute>} />
                  <Route path="/admin/runtime-links" element={<ProtectedRoute><AdminRuntimeQuickLinksPage /></ProtectedRoute>} />
                  <Route path="/admin/runtime-cockpit" element={<ProtectedRoute><AdminRuntimeCockpitPage /></ProtectedRoute>} />
                  <Route path="/admin/master-debug" element={<ProtectedRoute><AdminMasterDebugPage /></ProtectedRoute>} />
                  <Route path="/admin/master-control" element={<ProtectedRoute><AdminMasterControlPage /></ProtectedRoute>} />
                  <Route path="/admin/central-control" element={<ProtectedRoute><AdminCentralControlPanelPage /></ProtectedRoute>} />
                  <Route path="/admin/ui-engine" element={<ProtectedRoute><AdminUiEnginePage /></ProtectedRoute>} />
                  <Route path="/admin/marketplace-ops" element={<ProtectedRoute><AdminMarketplaceOpsPage /></ProtectedRoute>} />
                  <Route path="/admin/orchestration" element={<ProtectedRoute><AdminOrchestrationPage /></ProtectedRoute>} />
                  <Route path="/admin/pipeline" element={<ProtectedRoute><AdminPipelinePage /></ProtectedRoute>} />
                  <Route path="/admin/engines" element={<ProtectedRoute><AdminEnginesDashboardPage /></ProtectedRoute>} />
                  <Route path="/admin/quality-engines" element={<ProtectedRoute><QualityEnginesDashboardPage /></ProtectedRoute>} />
                  <Route path="/admin/engine-cockpit" element={<ProtectedRoute><AdminEngineCockpit /></ProtectedRoute>} />
                  <Route path="/admin/ai-control-center" element={<ProtectedRoute><AdminAIControlCenter /></ProtectedRoute>} />
                  <Route path="/admin/monetization" element={<ProtectedRoute><AdminMonetizationDashboard /></ProtectedRoute>} />
                  <Route path="/admin/core-engine" element={<ProtectedRoute><AdminCoreEnginePage /></ProtectedRoute>} />
                  <Route path="/admin/home-engine" element={<ProtectedRoute><AdminHomeEnginePage /></ProtectedRoute>} />
                  <Route path="/admin/map-engine" element={<ProtectedRoute><AdminMapEnginePage /></ProtectedRoute>} />
                  <Route path="/admin/notification-engine" element={<ProtectedRoute><AdminNotificationEnginePage /></ProtectedRoute>} />
                  <Route path="/admin/unified-engine" element={<ProtectedRoute><UnifiedGlobalEnginePage /></ProtectedRoute>} />
                  <Route path="/admin/backend-truth" element={<ProtectedRoute><AdminBackendTruthPage /></ProtectedRoute>} />
                  <Route path="/admin/garage" element={<ProtectedRoute><AdminGaragePage /></ProtectedRoute>} />
                  <Route path="/admin/browser-repair" element={<ProtectedRoute><AdminBrowserRepairPage /></ProtectedRoute>} />
                  <Route path="/admin/support-ops" element={<ProtectedRoute><AdminSupportOpsPage /></ProtectedRoute>} />
                  <Route path="/admin/delivery-ops" element={<ProtectedRoute><AdminDeliveryOpsPage /></ProtectedRoute>} />
                  <Route path="/admin/delivery-incidents" element={<ProtectedRoute><AdminDeliveryIncidentsPage /></ProtectedRoute>} />
                  <Route path="/admin/merchant-autofill" element={<ProtectedRoute><AdminMerchantAutofillPage /></ProtectedRoute>} />
                  <Route path="/admin/merchant-health" element={<ProtectedRoute><AdminMerchantHealthPage /></ProtectedRoute>} />
                  <Route path="/admin/merchant-approval-queue" element={<ProtectedRoute><AdminMerchantApprovalQueuePage /></ProtectedRoute>} />
                  <Route path="/admin/merchant-promo-watch" element={<ProtectedRoute><AdminMerchantPromoWatchPage /></ProtectedRoute>} />
                  <Route path="/admin/bulk-seed" element={<ProtectedRoute><AdminBulkSeedPage /></ProtectedRoute>} />
                  <Route path="/admin/bulk-merchant-import" element={<ProtectedRoute><AdminBulkMerchantImportPage /></ProtectedRoute>} />
                  <Route path="/admin/seed-tools" element={<ProtectedRoute><AdminSeedToolsPage /></ProtectedRoute>} />
                  <Route path="/admin/shop-import" element={<ProtectedRoute><AdminShopImportPage /></ProtectedRoute>} />
                  <Route path="/admin/shop-quality" element={<ProtectedRoute><AdminShopQualityPage /></ProtectedRoute>} />
                  <Route path="/admin/content-ops" element={<ProtectedRoute><AdminContentOpsPage /></ProtectedRoute>} />
                  <Route path="/admin/analytics-ops" element={<ProtectedRoute><AdminAnalyticsOpsPage /></ProtectedRoute>} />
                  <Route path="/admin/quality-ops" element={<ProtectedRoute><AdminQualityOpsPage /></ProtectedRoute>} />
                  <Route path="/admin/crm-ops" element={<ProtectedRoute><AdminCrmOpsPage /></ProtectedRoute>} />
                  <Route path="/admin/retention-ops" element={<ProtectedRoute><AdminRetentionOpsPage /></ProtectedRoute>} />
                  <Route path="/admin/payments-ops" element={<ProtectedRoute><AdminPaymentsOpsPage /></ProtectedRoute>} />
                  <Route path="/admin/notification-ops" element={<ProtectedRoute><AdminNotificationOpsPage /></ProtectedRoute>} />
                  <Route path="/admin/uae-ops" element={<ProtectedRoute><AdminUaeOpsDashboard /></ProtectedRoute>} />
                  <Route path="/admin/owner-cockpit" element={<ProtectedRoute><OwnerCockpitPage /></ProtectedRoute>} />
                  <Route path="/admin/onboarding-quality" element={<ProtectedRoute><OnboardingQualityDashboardPage /></ProtectedRoute>} />
                  <Route path="/admin/url-import" element={<ProtectedRoute><UrlImportPage /></ProtectedRoute>} />
                  <Route path="/admin/platform-recovery" element={<ProtectedRoute><AdminPlatformRecoveryPage /></ProtectedRoute>} />
                  <Route path="/admin/platform-health" element={<ProtectedRoute><AdminPlatformHealthPage /></ProtectedRoute>} />
                  <Route path="/admin/platform-alerts" element={<ProtectedRoute><AdminPlatformAlertsPage /></ProtectedRoute>} />
                  <Route path="/admin/visual-quality" element={<ProtectedRoute><AdminVisualQualityPage /></ProtectedRoute>} />
                  <Route path="/admin/ranking-control" element={<ProtectedRoute><AdminRankingControlPage /></ProtectedRoute>} />
                  <Route path="/admin/coherence-control" element={<ProtectedRoute><AdminCoherenceControlPage /></ProtectedRoute>} />
                  <Route path="/admin/source-audit" element={<ProtectedRoute><AdminSourceAuditPage /></ProtectedRoute>} />
                  <Route path="/admin/user-lookup" element={<ProtectedRoute><AdminUserLookupPage /></ProtectedRoute>} />
                  <Route path="/admin/finance-summary" element={<ProtectedRoute><AdminFinanceSummaryPage /></ProtectedRoute>} />
                  <Route path="/admin/order-watch" element={<ProtectedRoute><AdminOrderWatchPage /></ProtectedRoute>} />
                  <Route path="/admin/order-audit" element={<ProtectedRoute><AdminOrderAuditPage /></ProtectedRoute>} />
                  <Route path="/admin/order-timeline" element={<ProtectedRoute><AdminOrderTimelinePage /></ProtectedRoute>} />
                  <Route path="/admin/search-watch" element={<ProtectedRoute><AdminSearchWatchPage /></ProtectedRoute>} />
                  <Route path="/admin/refund-watch" element={<ProtectedRoute><AdminRefundWatchPage /></ProtectedRoute>} />
                  <Route path="/admin/refund-queue" element={<ProtectedRoute><AdminRefundQueuePage /></ProtectedRoute>} />
                  <Route path="/admin/system-health" element={<ProtectedRoute><AdminSystemHealthPage /></ProtectedRoute>} />
                  <Route path="/admin/system-live" element={<ProtectedRoute><AdminSystemLivePanelPage /></ProtectedRoute>} />
                  <Route path="/admin/active-sessions" element={<ProtectedRoute><AdminActiveSessionsPage /></ProtectedRoute>} />
                  <Route path="/admin/failed-payments" element={<ProtectedRoute><AdminFailedPaymentsPage /></ProtectedRoute>} />
                  <Route path="/admin/coupon-oversight" element={<ProtectedRoute><AdminCouponOversightPage /></ProtectedRoute>} />
                  <Route path="/admin/restaurant-autofill" element={<ProtectedRoute><AdminRestaurantFillPage /></ProtectedRoute>} />
                  <Route path="/admin/menu-quality-control" element={<ProtectedRoute><AdminMenuQualityControlPage /></ProtectedRoute>} />
                  <Route path="/admin/ux-live-test" element={<ProtectedRoute><AdminUxLiveTestPage /></ProtectedRoute>} />
                  <Route path="/admin/qa-command" element={<ProtectedRoute><AdminQaCommandPage /></ProtectedRoute>} />
                  <Route path="/admin/food-checkout" element={<ProtectedRoute><FoodOrderCheckoutPage /></ProtectedRoute>} />
                  <Route path="/admin/delivery-proof/:orderId" element={<ProtectedRoute><DeliveryProofPage /></ProtectedRoute>} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/*  DEEP LINKS · QR · PUBLIC                      */}
                  {/* ═══════════════════════════════════════════════ */}
                  <Route path="/add-contact" element={<AddContactPage />} />
                  <Route path="/u/:userId" element={<UserProfilePage />} />
                  <Route path="/p/:productId" element={<ProductPage />} />
                  <Route path="/live/:liveId" element={<LivePage />} />
                  <Route path="/pay/:payId" element={<PayPage />} />
                  <Route path="/pay/request/:requestId" element={<PayRequestPage />} />
                  <Route path="/pay/scan" element={<QrScannerPage />} />
                  <Route path="/pay/link-resolver" element={<PaymentLinkResolverPage />} />
                  <Route path="/pay/confirm" element={<PaymentConfirmPage />} />
                  <Route path="/pay/success" element={<GuestPaymentSuccess />} />
                  <Route path="/qr/pay/:code" element={<QrPayResolver />} />
                  <Route path="/qr/:code" element={<QrResolvePage />} />
                  <Route path="/qr/entry/:targetCode" element={<QrEntryPage />} />
                  <Route path="/qr/track" element={<QrTrackingPage />} />
                  <Route path="/qr/pickup" element={<QrPickupPage />} />
                  <Route path="/claim/:token" element={<ClaimPage />} />
                  <Route path="/go/:slug" element={<SlugResolver />} />
                  <Route path="/go/:slug/:category" element={<SlugCategoryResolver />} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/*  SEO · MARKETPLACE · LOCATIONS                 */}
                  {/* ═══════════════════════════════════════════════ */}
                  <Route path="/marketplace-services" element={<MarketplaceServicesPage />} />
                  <Route path="/activities-booking" element={<ActivitiesPage />} />
                  <Route path="/seasonal-rentals-booking" element={<SeasonalRentalsPage />} />
                  <Route path="/seasonal-rentals" element={<Navigate to="/seasonal-rentals-booking" replace />} />
                  <Route path="/long-term-rentals" element={<LongTermRentalsPage />} />
                  <Route path="/property-owner-software" element={<CoreSEOPages />} />
                  <Route path="/property-management-platform" element={<PropertyManagementPlatformPage />} />
                  <Route path="/rental-management-software" element={<RentalManagementSoftwarePage />} />
                  <Route path="/services/:service/in/:city" element={<ServiceCitySEOPage />} />
                  <Route path="/activities/:activity/in/:city" element={<ActivityCitySEOPage />} />
                  <Route path="/services" element={<Navigate to="/browse/services" replace />} />
                  <Route path="/services/:categorySlug" element={<ServiceCategoryPage />} />
                  <Route path="/services/city/:citySlug" element={<ServiceCityPage />} />
                  <Route path="/provider/seo/:providerId" element={<ProviderSEOPage />} />
                  <Route path="/locations" element={<LocationsPage />} />
                  <Route path="/country/:countrySlug" element={<CountryHubPage />} />
                  <Route path="/city/:citySlug" element={<CityHubPage />} />
                  <Route path="/city/:citySlug/services" element={<CityServicesPage />} />
                  <Route path="/city/:citySlug/activities" element={<CityActivitiesPage />} />
                  <Route path="/city/:citySlug/concierge" element={<CityConciergePage />} />
                  <Route path="/city/:citySlug/:categorySlug" element={<DynamicCityCategoryPage />} />
                  <Route path="/marketplace" element={<MarketplaceHubPage />} />
                  <Route path="/marketplace/:citySlug" element={<MarketplaceCityPage />} />
                  <Route path="/marketplace/:citySlug/:serviceSlug" element={<MarketplaceServiceCityPage />} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/*  LEGAL                                         */}
                  {/* ═══════════════════════════════════════════════ */}
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/cookies" element={<CookiePage />} />
                  <Route path="/legal" element={<LegalNoticePage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/vision" element={<PlatformVision />} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/*  CATCH-ALL                                     */}
                  {/* ═══════════════════════════════════════════════ */}
                  <Route path="/seo/*" element={<SEOCatchAll />} />
                  <Route path="*" element={<AppNotFoundPage />} />

            </Routes>
          </SwipeableMain>
        </Suspense>
        <MainBottomNav />
        <Suspense fallback={null}>
          <SmartInstallBanner />
          <FloatingCTAButton />
          <OrbitPromptOverlay />
          <SmartCloseFlowSheet />
        </Suspense>
    </AppLockGuard>
    </UnifiedPaymentProvider>
    </CallProvider>
    <Suspense fallback={null}><GlobalOverlayRenderer /></Suspense>
    </AuthProvider>
  </TooltipProvider>
  </I18nProvider>
  </QueryClientProvider>
  </ThemeProvider>
  </ErrorBoundary>
  </ChunkRecoveryBoundary>
  </AppCrashBoundary>
);

export default App;
