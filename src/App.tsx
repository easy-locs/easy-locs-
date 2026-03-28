// EmergencyRenderTestPage removed (Batch A purge)
import MainBottomNav from "@/components/navigation/MainBottomNav";
import SwipeableMain from "@/components/navigation/SwipeableMain";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CallProvider } from "@/components/call/CallProvider";
import { useOrbitSessionInit } from "@/hooks/useOrbitSessionInit";
import { useRealtimeHub } from "@/hooks/useRealtimeHub";

import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "next-themes";
import { Suspense, lazy, useEffect, type ComponentType } from "react";
import AppLockGuard from "@/components/security/AppLockGuard";
import SplashScreen from "@/components/brand/SplashScreen";
import BrandSuccessFlash from "@/components/brand/BrandSuccessFlash";
import BrandLoadingSpinner from "@/components/brand/BrandLoadingSpinner";
import EasyLocsLogo from "@/components/brand/EasyLocsLogo";
import UpdateNotification from "@/components/UpdateNotification";
import { SkipLink } from "@/components/ui/a11y";
import SmartInstallBanner from "@/components/pwa/SmartInstallBanner";
import SmartCloseFlowSheet from "@/components/close-flow/SmartCloseFlowSheet";
// Geo: GeoBoot is the single GPS lifecycle manager
import { GeoBoot } from "@/lib/geo/GeoBoot";
import { GeoDebugPanel } from "@/components/debug/GeoDebugPanel";
import { PermissionBootstrap } from "@/components/boot/PermissionBootstrap";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AppCrashBoundary } from "@/components/system/AppCrashBoundary";
import { SystemHealthBanner } from "@/components/system/SystemHealthBanner";
import { useAppHealthCheck } from "@/hooks/useAppHealthCheck";
import ChunkRecoveryBoundary from "@/components/system/ChunkRecoveryBoundary";
import BrowserTelemetryProvider from "@/components/system/BrowserTelemetryProvider";
import CountryGuard from "@/components/dashboard/CountryGuard";
import { UnifiedPaymentProvider } from "@/payments/UnifiedPaymentSystem";

import { useNotificationV2Store } from "@/stores/notificationV2Store";
import AppBootstrapGuardDirect from "@/components/app/AppBootstrapGuard";
import { AppInit } from "@/components/system/AppInit";

import { CanonicalShellRuntime } from "@/components/app/CanonicalShellRuntime";
import { GlobalExperienceProvider } from "@/providers/GlobalExperienceProvider";
import { UiQualityProvider } from "@/providers/UiQualityProvider";
import { FloatingCTAButton } from "@/components/engine/FloatingCTAButton";
import { OrbitPromptOverlay } from "@/components/engine/OrbitPromptOverlay";

// V2 test pages — removed (Batch B purge)

// V2 Suite 4 pages
// V2 Suite 4 pages — all removed, routes redirect to canonical paths
// ── All lazy page imports from centralized registry ──
import * as Pages from "@/app/app-route-registry";

// Re-export all page components for route consumption (preserves existing variable names)
const {
  Index, Login, Signup, ForgotPassword, ResetPassword, VerifyEmail, Onboarding, AuthCallbackPage,
  Dashboard, Receipts, Reminders, Documents, AIAssistant, Leases, Company, Billing, Settings,
  Tenants, RentalManagement, Finances, Interventions, Tasks, Messages, CommunicationCenter,
  ChargesRegularization, FiscalReport, Expenses, Candidates, SeasonalRentals, PaymentNotices,
  DunningLetters, FurnitureInventory, Buildings, Vault, DataImport, CVGenerator,
  CategorySubscriptions, ChannelManager, Accounting, LandlordRentDashboard, AccountingEntries,
  ReportingDashboard, DynamicPricing, PropertyCalendar, RealEstateListings, LandlordProfile,
  Referrals, Collaboration, DeveloperPortal, AuditTrail, CountryWorkspace, ServiceTrackingPage,
  // Real Estate Module
  RealEstateModulePage, REPropertiesPage, REUnitsPage, RETenantsPage, RELeasesPage,
  REPaymentsPage, REDocumentsPage, REPropertyDetailPage, RELeaseDetailPage,
  // Tenant Portal
  TenantDashboard, TenantReceipts, TenantDocuments, TenantMessages, TenantPay, TenantSettings,
  TenantReviews, TenantRequests, TenantSignup,
  // Client Portal
  ClientDashboard, ClientBookings, ClientMessages, ClientDocuments, ClientPayments, ClientSettings,
  // Orbit
  OrbitAppShell, OrbitHome, OrbitContactsPage, OrbitIdentityPage,
  // Wallet
  WalletHubPage, WalletTopUpPage, WalletTransferPage, WalletRequestPage,
  // Marketplace
  PublicListing, PublicServiceBooking, PublicRealEstateListing, PropertyManagement, AddProperty,
  PropertyDetailHub, CreateListing, LocalServices, RentalCatalog, StaysCatalog, HostCatalog,
  ActivitiesMarketplace, GuestPortal, ProviderStorefront, StorePage, ShopCategoryPage,
  PropertiesShowcase, AccountShowcase, SavedListings, PropertyManagementHub, ExplorePage,
  Install, NotFound,
  // Travel
  TravelHub, TravelFlights, TravelStays, TravelHotelDetail, HotelCheckout, TravelStayDetail, TravelFlightDetail,
  // Universe Hubs
  DiscoverPage, BrowseVerticalPage, RetailIndexPage, RetailCategoryPage, RetailMallPage, RetailStorePage,
  FoodHub, GroceryHub, ServicesHub, RetailHub, PropertyHubUniverse, HealthcareHub, ElectronicsHub, GiftsHub, PetsHub,
  // Food
  FoodTypePage, CuisineListPage, FoodRestaurantPage,
  // Settings sub-pages
  SettingsHomePage, SettingsAccountPage, SettingsOrbitPage, SettingsBusinessPage, SettingsWalletPage,
  SettingsAddressesPage, SettingsNotificationsPage, SettingsSecurityPage, SettingsPreferencesPage,
  SettingsSupportPage, SettingsPaymentMethodsPage, NotificationPreferencesPage,
  // Mobility
  MobilityTaxiPage, MobilityDeliveryPage, DeliveryBringPage, DeliveryParcelPage, DeliveryGiftPage,
  DeliveryErrandPage, RiderLivePage, TrackRidePage, PayRidePage, RideReceiptPage, CallDriverPage, DriverPayoutPage,
  // Deep-link
  UserProfilePage, ProductPage, LivePage, PayPage, QrPayResolver, QrResolvePage, PayRequestPage,
  GuestPaymentSuccess, AddContactPage,
  // QR
  QrScannerPage, QrEntryPage, QrTrackingPage, QrPickupPage, QrGeneratePage,
  // Payment
  PaymentLinkResolverPage, PaymentConfirmPage, PaymentPage, StripeElementsPage,
  CheckoutPage, FoodOrderCheckoutPage, GuestCheckoutPage,
  // Orders
  OrdersPage, MyOrdersPage, UnifiedOrderDetailPage, TrackingPage, DeliveryProofPage,
  OrderReceiptPage, OrderRefundRequestPage, ReorderPage,
  // Seller
  SellerHubPage, SellerDashboardPage,
  // Merchant
  MerchantOnboardingPage, MerchantOnboardingAdminPage, MerchantClaimPage, MerchantDashboardPage,
  MerchantFinancePage, MerchantPosPage, MerchantKitchenPage, MerchantOrdersPage,
  ShopQrCenterPage, ShopOrderPage, MerchantMenuPageNew, MerchantStoreSettingsPage,
  MerchantPromoManagerPage, MerchantOrderBoardPage, MerchantInventoryPage, MerchantLiveControlPage,
  MerchantCouponManagerPage, MerchantBasicAnalyticsPage, MerchantCustomersPage,
  MerchantPromoBannerEditorPage, MerchantBusinessSummaryPage, MerchantClosingModePage,
  MerchantCustomerInsightsPage, MerchantProductPerformancePage, MerchantAutoAcceptSettingsPage,
  MerchantInventoryAlertsPage, MerchantStaffAccessPage, MerchantDailySalesPage,
  MerchantReviewRepliesPage, MerchantRefundRequestsPage, MerchantMenuBulkEditPage,
  MerchantDeliveryZonesPage, MerchantKitchenDisplayPage, MerchantBusinessHoursPage,
  MerchantMenuCategoryManagerPage,
  // Driver
  DriverDashboard, DeliveryCommandCenter, DriverDashboardPageNew, DriverLivePage,
  DriverEarningsPage, DriverEarningsPageNew, DriverMissionsPage, DriverMissionDetailPage,
  DriverProofPage, DriverEarningsSummaryPage, DriverActiveMissionsPage, DriverShiftPage,
  DriverAvailabilityZonesPage, DriverCompletedDeliveriesPage, DriverLiveMissionsPage,
  DriverFuelCostsPage, DriverBreaksPage,
  // Admin
  AdminDashboard, AIQualityDashboard, AdminDisputesPage, DemandHeatmapPage, AdminFraudPage,
  AdminLiveOpsPage, RiderPrioritySubscriptionPage, AdminDispatchBoardPage, AdminSLAPage,
  RefundRequestPage, TeamCommandCenterPage, AdminTrustGraphPage, ExecutiveKPIBoardPage,
  TeamPermissionsPage, AIOpsChatPage, FinancialReconPage, ReconAlertsPage,
  ExecutiveDashboard, ConciergeOperations, CustomerProfilePage, WorkspaceBootstrapPage,
  MenuAdminPage, SupportInboxPage, AdminHomeV1Page, KpiChartsPage, DriverHeatmapMapPage,
  AdminRealtimeControlPage, DeploymentChecklistPage, LoyaltyRedeemPage, AdminAlertCenterPage,
  AuditDebugPanelPage, AdminOutreachPage, AdminWalletDiagnosticsPage, AdminOpsExceptionsPage,
  AdminReviewQueuePage, AdminGrowthDashboard, RouteAuditPage, AdminRestaurantTestSeederPage,
  AdminRuntimeAuditPage, AdminRuntimeQuickLinksPage, AdminMasterDebugPage,
  AdminUiEnginePage, AdminMarketplaceOpsPage, AdminOpsDashboardPage, AdminOrchestrationPage,
  AdminPipelinePage, AdminEnginesDashboardPage, AdminBackendTruthPage, AdminGaragePage,
  PermissionCenterPage, AdminSupportOpsPage, AdminDeliveryOpsPage,
  SupportTicketsPage, SupportTicketDetailPage, AdminMerchantAutofillPage, AdminBulkSeedPage,
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
  AdminBrowserRepairPage, AdminCentralControlPanelPage,
  // Customer
  CustomerSpendingInsightsPage, CustomerAddressBookPage, CustomerLoyaltyHistoryPage,
  CustomerActiveOrdersPage, CustomerOrderArchivePage, CustomerReorderPage,
  CustomerLiveLocationPage, CustomerSavedCardsPage, CustomerDeliveryNotesPage,
  CustomerPaymentActivityPage, CustomerOrderReceiptsPage, CustomerAddressSelectorPage,
  CustomerGroupOrderPage, CustomerOrderGiftsPage, CustomerSplitBillPage,
  CustomerSavedCartsPage2, CustomerAutoRepeatPage, CustomerPartyOrderPage,
  CustomerRewardRedemptionPage, CustomerShareCartPage,
  // Map/Radar
  SuperMapPage, CanonicalMapTestPage, HyperRadarPage, RadarViewPage,
  // Shops
  ShopPage, MyShopPage, ShopsPage, MyShopsPage, MyBusinessHub, POSPage, OpsCenter,
  // Concierge
  ConciergeServicesPage,
  // SEO
  MarketplaceServicesPage, ActivitiesPage, SeasonalRentalsPage, SEOCatchAll,
  LongTermRentalsPage, ServiceCitySEOPage, ActivityCitySEOPage,
  CoreSEOPages, PropertyManagementPlatformPage, RentalManagementSoftwarePage,
  LocationsPage, CountryHubPage, CityHubPage, DynamicCityCategoryPage,
  MarketplaceHubPage, MarketplaceCityPage, MarketplaceServiceCityPage,
  ServicesHubPage, ServiceCategoryPage, ServiceCityPage, ProviderSEOPage,
  SlugResolver, SlugCategoryResolver,
  // Legal
  TermsPage, PrivacyPage, CookiePage, LegalNoticePage, AboutPage, ContactPage, HelpPage, PlatformVision,
  // Misc
  ClaimPage, ClaimShopPage, SearchResultsPage, MeCommandCenter,
  NotificationCenterPage, CityMarketplacePage, BoostDashboardPage, AppNotFoundPage,
  LiveTrackingPageNew, StripeCheckoutHandlerPage, ConciergeServices, FavoritesPage,
} = Pages;

// City sub-page wrappers (inline components, not lazy)
const CityServicesPage = () => <CityHubPage subPage="services" />;
const CityActivitiesPage = () => <CityHubPage subPage="activities" />;
const CityConciergePage = () => <CityHubPage subPage="concierge" />;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Expose query client globally for platform bus reactions
(window as any).__REACT_QUERY_CLIENT__ = queryClient;

// Wire canonical action engine to the shared query client
import { setActionQueryClient } from "@/lib/run-action";
setActionQueryClient(queryClient);

const PageLoader = () => (
  <div className="app-mobile-page bg-background" />
);

const seoPublicPrefixes = [
  "/book/", "/listing/", "/host/", "/provider/", "/showcase/", "/store/", "/shop/",
  "/services/", "/activities/", "/locations", "/country/", "/city/", "/marketplace",
  "/explore", "/properties",
];

// Guards + Routers extracted to atomic files
import { OrbitSessionGuard, RealtimeHubGuard, NotificationsRealtimeGuard, AppHealthGuard } from "@/components/app/AppGuards";
import { HomeRouter, MarketplaceHomeRouter } from "@/components/app/AppRouters";

const App = () => (
  <AppCrashBoundary>
  <ChunkRecoveryBoundary>
  <ErrorBoundary>
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false} storageKey="easylocs-theme">
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
    <GlobalExperienceProvider>
    <BrowserTelemetryProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* NOTE: HashRouter is now in main.tsx — no BrowserRouter here */}
        <AuthProvider>
           <CallProvider>
          <UnifiedPaymentProvider>
           <AppLockGuard>
           <SplashScreen>
           <BrandSuccessFlash />
             
             
            <AppHealthGuard />
            <OrbitSessionGuard />
           <RealtimeHubGuard />
           <NotificationsRealtimeGuard />
           <UpdateNotification />
                  <AppInit />
                   
                   <CanonicalShellRuntime />
                  <UiQualityProvider>
                <GeoBoot />
                <GeoDebugPanel />
                <PermissionBootstrap />
             <AppBootstrapGuardDirect />
           
           <SkipLink />
           <Suspense fallback={<PageLoader />}>
            <SwipeableMain className="pb-[calc(56px+env(safe-area-inset-bottom,0px))]">
            <Routes>
              {/* Emergency render test — removed (Batch A purge) */}

              {/* ══════ PUBLIC WEBSITE ══════ */}
              {/* Homepage */}
              <Route path="/" element={<HomeRouter />} />
              <Route path="/home" element={<MarketplaceHomeRouter />} />

              {/* Auth */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/tenant-signup" element={<TenantSignup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/install" element={<Install />} />

              {/* Deep-link public pages */}
              <Route path="/add-contact" element={<Suspense fallback={<PageLoader />}><AddContactPage /></Suspense>} />
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

              {/* V7 Public pillars — Radar is unified ecosystem */}
              <Route path="/discover" element={<Navigate to="/radar" replace />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/search" element={<Navigate to="/radar" replace />} />

              {/* Universe hubs — unified browse route */}
              <Route path="/browse/:vertical" element={<BrowseVerticalPage />} />
              <Route path="/browse" element={<DiscoverPage />} />

              {/* Legacy hub redirects → unified /browse/:vertical */}
              <Route path="/food" element={<Navigate to="/browse/food" replace />} />
              <Route path="/grocery" element={<Navigate to="/browse/grocery" replace />} />
              <Route path="/services-hub" element={<Navigate to="/browse/services" replace />} />
              <Route path="/shops" element={<Navigate to="/browse/retail" replace />} />
              <Route path="/real-estate" element={<Navigate to="/browse/real_estate" replace />} />
              <Route path="/healthcare" element={<Navigate to="/browse/healthcare" replace />} />
              <Route path="/electronics" element={<Navigate to="/browse/electronics" replace />} />
              <Route path="/gifts" element={<Navigate to="/browse/gifts" replace />} />
              <Route path="/pets" element={<Navigate to="/browse/pets" replace />} />

              {/* Retail / Shop routes */}
              <Route path="/shop" element={<RetailIndexPage />} />
              <Route path="/shop/category/:categorySlug" element={<RetailCategoryPage />} />
              <Route path="/shop/subcategory/:categorySlug/:subcategorySlug" element={<RetailCategoryPage />} />
              <Route path="/shop/mall/:mallSlug" element={<RetailMallPage />} />
              <Route path="/shop/store/:slug" element={<RetailStorePage />} />

              {/* Food sub-pages */}
              <Route path="/food/restaurant/:restaurantId" element={<FoodRestaurantPage />} />
              <Route path="/food/:type" element={<FoodTypePage />} />
              <Route path="/food/:type/:cuisine" element={<CuisineListPage />} />

              {/* Settings sub-pages */}
              <Route path="/settings" element={<SettingsHomePage />} />
              <Route path="/settings/account" element={<SettingsAccountPage />} />
              <Route path="/settings/orbit" element={<SettingsOrbitPage />} />
              <Route path="/settings/business" element={<SettingsBusinessPage />} />
              <Route path="/settings/wallet" element={<SettingsWalletPage />} />
              <Route path="/settings/addresses" element={<SettingsAddressesPage />} />
              <Route path="/settings/notifications" element={<SettingsNotificationsPage />} />
              <Route path="/settings/security" element={<SettingsSecurityPage />} />
              <Route path="/settings/preferences" element={<SettingsPreferencesPage />} />
              <Route path="/settings/support" element={<SettingsSupportPage />} />
              {/* Mobility — canonical routes */}
              <Route path="/mobility/taxi" element={<MobilityTaxiPage />} />
              <Route path="/mobility/delivery" element={<MobilityDeliveryPage />} />
              <Route path="/mobility/delivery/bring" element={<DeliveryBringPage />} />
              <Route path="/mobility/delivery/parcel" element={<DeliveryParcelPage />} />
              <Route path="/mobility/delivery/gift" element={<DeliveryGiftPage />} />
              <Route path="/mobility/delivery/errand" element={<DeliveryErrandPage />} />
              <Route path="/rider/live" element={<RiderLivePage />} />
              <Route path="/ride" element={<Navigate to="/mobility/taxi" replace />} />
              <Route path="/send" element={<Navigate to="/mobility/delivery" replace />} />
              <Route path="/send-package" element={<Navigate to="/mobility/delivery" replace />} />
              <Route path="/ride/send-package" element={<Navigate to="/mobility/delivery" replace />} />
              <Route path="/delivery" element={<Navigate to="/mobility/delivery" replace />} />
              <Route path="/track/:rideRequestId" element={<TrackRidePage />} />
              <Route path="/wallet/pay/:threadId" element={<PayRidePage />} />
              <Route path="/wallet/accounts" element={<Navigate to="/settings/wallet" replace />} />
              <Route path="/call/:threadId" element={<CallDriverPage />} />
              <Route path="/driver/payout" element={<DriverPayoutPage />} />
              <Route path="/admin/disputes" element={<AdminDisputesPage />} />
              <Route path="/driver/heatmap" element={<DemandHeatmapPage />} />
              <Route path="/admin/fraud" element={<AdminFraudPage />} />
              <Route path="/admin/live-ops" element={<AdminLiveOpsPage />} />
              <Route path="/subscription/priority" element={<RiderPrioritySubscriptionPage />} />
              <Route path="/admin/sla" element={<AdminSLAPage />} />
              <Route path="/admin/trust-graph" element={<AdminTrustGraphPage />} />
              <Route path="/refund/:rideRequestId" element={<RefundRequestPage />} />
              {/* Orbit — main messaging hub */}
              <Route path="/orbit" element={<CommunicationCenter />} />
              <Route path="/orbit/contacts" element={<OrbitContactsPage />} />
              <Route path="/team/command-center" element={<TeamCommandCenterPage />} />
              <Route path="/admin/executive-kpi" element={<ExecutiveKPIBoardPage />} />
              <Route path="/team/permissions" element={<TeamPermissionsPage />} />
              <Route path="/admin/ai-ops-chat" element={<AIOpsChatPage />} />
              <Route path="/admin/financial-recon" element={<FinancialReconPage />} />
              <Route path="/admin/recon-alerts" element={<ReconAlertsPage />} />
              {/* call-session route removed — calls go through CallProvider */}
              <Route path="/orbit/identity" element={<OrbitIdentityPage />} />
              <Route path="/wallet/hub" element={<WalletHubPage />} />
              <Route path="/merchant/onboarding" element={<MerchantOnboardingPage />} />
              <Route path="/admin/merchant-onboarding" element={<MerchantOnboardingAdminPage />} />
              <Route path="/admin/executive-dashboard" element={<ExecutiveDashboard />} />
              {/* Travel */}
              <Route path="/travel" element={<TravelHub />} />
              <Route path="/travel/flights" element={<TravelFlights />} />
              <Route path="/travel/stays" element={<TravelStays />} />
              <Route path="/travel/hotels" element={<Navigate to="/travel/stays" replace />} />
              <Route path="/travel/hotel/:id" element={<TravelHotelDetail />} />
              <Route path="/travel/hotel-checkout" element={<ProtectedRoute><HotelCheckout /></ProtectedRoute>} />
              <Route path="/travel/stay/:id" element={<TravelStayDetail />} />
              <Route path="/travel/flight/:id" element={<TravelFlightDetail />} />

              {/* Orphaned pages — now wired */}
              <Route path="/concierge-ops" element={<ProtectedRoute><ConciergeOperations /></ProtectedRoute>} />
              <Route path="/customer/:customerId" element={<ProtectedRoute><CustomerProfilePage /></ProtectedRoute>} />
              {/* /travel/hotels already redirects to /travel/stays at line 895 */}

              <Route path="/super-map" element={<SuperMapPage />} />
              <Route path="/map-lab" element={<CanonicalMapTestPage />} />
              <Route path="/map" element={<Navigate to="/radar" replace />} />
              <Route path="/radar" element={<HyperRadarPage />} />
              {/* /shops already routed to RetailHub above — ShopsPage is legacy */}
              <Route path="/s/:slug" element={<ShopPage />} />
              <Route path="/s/:slug/:categorySlug" element={<ShopCategoryPage />} />
              <Route path="/business" element={<MyBusinessHub />} />
              <Route path="/property-hub" element={<PropertyManagementHub />} />
              <Route path="/pos" element={<POSPage />} />
              <Route path="/pos/:shopId" element={<POSPage />} />
              <Route path="/my-orders" element={<MyOrdersPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/order/:orderId" element={<UnifiedOrderDetailPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/tracking/:orderId" element={<TrackingPage />} />

              {/* Marketplace & Listings */}
              <Route path="/listing/:id" element={<PublicListing />} />
              <Route path="/book/:slug" element={<PublicServiceBooking />} />
              <Route path="/nearby" element={<LocalServices />} />
              <Route path="/rentals" element={<Navigate to="/dashboard/rental-management" replace />} />
              <Route path="/rentals/:country" element={<RentalCatalog />} />
              <Route path="/rentals/:country/:city" element={<RentalCatalog />} />
              <Route path="/stays" element={<Navigate to="/travel/stays" replace />} />
              <Route path="/stays/:country" element={<StaysCatalog />} />
              <Route path="/stays/:country/:city" element={<StaysCatalog />} />
              <Route path="/host/:orgId" element={<HostCatalog />} />
              <Route path="/activities" element={<ActivitiesMarketplace />} />
              <Route path="/guest/:orgId" element={<GuestPortal />} />
              <Route path="/provider/:providerId" element={<ProviderStorefront />} />
              <Route path="/store/:storeId" element={<StorePage />} />
              <Route path="/saved" element={<SavedListings />} />
              <Route path="/showcase/:orgId" element={<PropertiesShowcase />} />
              <Route path="/account/:orgId" element={<AccountShowcase />} />
              <Route path="/properties" element={<PropertiesShowcase />} />

              {/* Real Estate Module — nested under /property-management to avoid /real-estate conflict */}
              <Route path="/property-management" element={<RealEstateModulePage />}>
                <Route index element={<REPropertiesPage />} />
                <Route path="units" element={<REUnitsPage />} />
                <Route path="tenants" element={<RETenantsPage />} />
                <Route path="leases" element={<RELeasesPage />} />
                <Route path="payments" element={<REPaymentsPage />} />
                <Route path="documents" element={<REDocumentsPage />} />
              </Route>
              <Route path="/real-estate/property/:propertyId" element={<REPropertyDetailPage />} />
              <Route path="/real-estate/lease/:leaseId" element={<RELeaseDetailPage />} />

              {/* Real Estate Public */}
              <Route path="/top-rated" element={<RealEstateListings />} />
              <Route path="/trending" element={<RealEstateListings />} />
              <Route path="/real-estate-listing/:id" element={<PublicRealEstateListing />} />

              {/* SEO Layer pages */}
              <Route path="/concierge-services" element={<ConciergeServicesPage />} />
              <Route path="/marketplace-services" element={<MarketplaceServicesPage />} />
              <Route path="/activities-booking" element={<ActivitiesPage />} />
              <Route path="/seasonal-rentals-booking" element={<SeasonalRentalsPage />} />
              <Route path="/long-term-rentals" element={<LongTermRentalsPage />} />
              <Route path="/property-owner-software" element={<CoreSEOPages />} />
              <Route path="/property-management-platform" element={<PropertyManagementPlatformPage />} />
              <Route path="/rental-management-software" element={<RentalManagementSoftwarePage />} />
              <Route path="/services/:service/in/:city" element={<ServiceCitySEOPage />} />
              <Route path="/activities/:activity/in/:city" element={<ActivityCitySEOPage />} />
              {/* Programmatic SEO */}
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
              <Route path="/services" element={<Navigate to="/browse/services" replace />} />
              <Route path="/services/:categorySlug" element={<ServiceCategoryPage />} />
              <Route path="/services/city/:citySlug" element={<ServiceCityPage />} />
              <Route path="/provider/seo/:providerId" element={<ProviderSEOPage />} />
              {/* Short-URL resolvers */}
              <Route path="/go/:slug" element={<SlugResolver />} />
              <Route path="/go/:slug/:category" element={<SlugCategoryResolver />} />

              {/* Legal */}
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/cookies" element={<CookiePage />} />
              <Route path="/legal" element={<LegalNoticePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/legal-notice" element={<LegalNoticePage />} />
              <Route path="/seasonal-rentals" element={<Navigate to="/seasonal-rentals-booking" replace />} />
              <Route path="/developer" element={<Navigate to="/dashboard/developer" replace />} />
              <Route path="/vision" element={<PlatformVision />} />

              {/* ══════ PROTECTED DASHBOARD ══════ */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/properties" element={<ProtectedRoute><PropertyManagement /></ProtectedRoute>} />
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
              <Route path="/dashboard/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/dashboard/communication" element={<ProtectedRoute><CommunicationCenter /></ProtectedRoute>} />
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
              <Route path="/wallet" element={<ProtectedRoute><WalletHubPage /></ProtectedRoute>} />
              <Route path="/dashboard/service-tracking" element={<ProtectedRoute><ServiceTrackingPage /></ProtectedRoute>} />
              <Route path="/dashboard/seller" element={<ProtectedRoute><SellerHubPage /></ProtectedRoute>} />
              <Route path="/seller" element={<ProtectedRoute><SellerDashboardPage /></ProtectedRoute>} />
              <Route path="/seller/boost" element={<ProtectedRoute><BoostDashboardPage /></ProtectedRoute>} />
              <Route path="/dashboard/boost" element={<ProtectedRoute><BoostDashboardPage /></ProtectedRoute>} />
              <Route path="/dashboard/driver" element={<ProtectedRoute><DriverDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/delivery" element={<ProtectedRoute><DeliveryCommandCenter /></ProtectedRoute>} />
              <Route path="/dashboard/my-shop" element={<ProtectedRoute><MyShopPage /></ProtectedRoute>} />
              <Route path="/dashboard/my-shops" element={<ProtectedRoute><MyShopsPage /></ProtectedRoute>} />
              <Route path="/dashboard/ops" element={<ProtectedRoute><OpsCenter /></ProtectedRoute>} />
              <Route path="/dashboard/country/:countryCode" element={<ProtectedRoute><CountryWorkspace /></ProtectedRoute>} />

              {/* Tenant Portal */}
              <Route path="/tenant" element={<ProtectedRoute><TenantDashboard /></ProtectedRoute>} />
              <Route path="/tenant/receipts" element={<ProtectedRoute><TenantReceipts /></ProtectedRoute>} />
              <Route path="/tenant/documents" element={<ProtectedRoute><TenantDocuments /></ProtectedRoute>} />
              <Route path="/tenant/messages" element={<ProtectedRoute><TenantMessages /></ProtectedRoute>} />
              <Route path="/tenant/pay" element={<ProtectedRoute><TenantPay /></ProtectedRoute>} />
              <Route path="/tenant/settings" element={<ProtectedRoute><TenantSettings /></ProtectedRoute>} />
              <Route path="/tenant/reviews" element={<ProtectedRoute><TenantReviews /></ProtectedRoute>} />
              <Route path="/tenant/requests" element={<ProtectedRoute><TenantRequests /></ProtectedRoute>} />

              {/* Client Portal */}
              <Route path="/client" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
              <Route path="/client/bookings" element={<ProtectedRoute><ClientBookings /></ProtectedRoute>} />
              <Route path="/client/messages" element={<ProtectedRoute><ClientMessages /></ProtectedRoute>} />
              <Route path="/client/documents" element={<ProtectedRoute><ClientDocuments /></ProtectedRoute>} />
              <Route path="/client/payments" element={<ProtectedRoute><ClientPayments /></ProtectedRoute>} />
              <Route path="/client/settings" element={<ProtectedRoute><ClientSettings /></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/ai-quality" element={<ProtectedRoute><AIQualityDashboard /></ProtectedRoute>} />
              {/* Ghost call route removed — calls go through CallProvider */}
              <Route path="/admin/workspace-bootstrap" element={<ProtectedRoute><WorkspaceBootstrapPage /></ProtectedRoute>} />
              <Route path="/admin/menu" element={<ProtectedRoute><MenuAdminPage /></ProtectedRoute>} />
              <Route path="/admin/support-inbox" element={<ProtectedRoute><SupportInboxPage /></ProtectedRoute>} />
              <Route path="/admin/home-v1" element={<ProtectedRoute><AdminHomeV1Page /></ProtectedRoute>} />
              <Route path="/admin/driver-live" element={<ProtectedRoute><DriverLivePage /></ProtectedRoute>} />
              <Route path="/admin/food-checkout" element={<ProtectedRoute><FoodOrderCheckoutPage /></ProtectedRoute>} />
              <Route path="/admin/delivery-proof/:orderId" element={<ProtectedRoute><DeliveryProofPage /></ProtectedRoute>} />
              <Route path="/admin/kpi-charts" element={<ProtectedRoute><KpiChartsPage /></ProtectedRoute>} />
              <Route path="/admin/driver-heatmap" element={<ProtectedRoute><DriverHeatmapMapPage /></ProtectedRoute>} />
              <Route path="/admin/realtime-control" element={<ProtectedRoute><AdminRealtimeControlPage /></ProtectedRoute>} />
              <Route path="/admin/deployment-checklist" element={<ProtectedRoute><DeploymentChecklistPage /></ProtectedRoute>} />
              <Route path="/admin/loyalty-redeem" element={<ProtectedRoute><LoyaltyRedeemPage /></ProtectedRoute>} />
              <Route path="/admin/alerts" element={<ProtectedRoute><AdminAlertCenterPage /></ProtectedRoute>} />
              <Route path="/payments/stripe-elements" element={<ProtectedRoute><StripeElementsPage /></ProtectedRoute>} />
              <Route path="/admin/audit-debug" element={<ProtectedRoute><AuditDebugPanelPage /></ProtectedRoute>} />
              <Route path="/admin/outreach" element={<ProtectedRoute><AdminOutreachPage /></ProtectedRoute>} />
               <Route path="/admin/uae-ops" element={<ProtectedRoute><AdminUaeOpsDashboard /></ProtectedRoute>} />
               <Route path="/admin/owner-cockpit" element={<ProtectedRoute><OwnerCockpitPage /></ProtectedRoute>} />
                <Route path="/admin/onboarding-quality" element={<ProtectedRoute><OnboardingQualityDashboardPage /></ProtectedRoute>} />
                <Route path="/admin/unified-engine" element={<ProtectedRoute><UnifiedGlobalEnginePage /></ProtectedRoute>} />
                <Route path="/admin/ai-decisions" element={<ProtectedRoute><AIDecisionsDashboardPage /></ProtectedRoute>} />
                <Route path="/admin/url-import" element={<ProtectedRoute><UrlImportPage /></ProtectedRoute>} />

              {/* Merchant claim & dashboard */}
              <Route path="/merchant/claim" element={<MerchantClaimPage />} />
              <Route path="/merchant/dashboard" element={<ProtectedRoute><MerchantDashboardPage /></ProtectedRoute>} />
              <Route path="/merchant/finance" element={<ProtectedRoute><MerchantFinancePage /></ProtectedRoute>} />
              <Route path="/merchant/pos" element={<ProtectedRoute><MerchantPosPage /></ProtectedRoute>} />
              <Route path="/merchant/kitchen" element={<ProtectedRoute><MerchantKitchenPage /></ProtectedRoute>} />
              <Route path="/merchant/orders" element={<ProtectedRoute><MerchantOrdersPage /></ProtectedRoute>} />
              <Route path="/merchant/qr/:shopId" element={<ProtectedRoute><ShopQrCenterPage /></ProtectedRoute>} />
              <Route path="/menu/:shopSlug" element={<ShopOrderPage />} />
              {/* /admin/wallet-test removed — legacy test page */}
              <Route path="/admin/wallet-diagnostics" element={<ProtectedRoute><AdminWalletDiagnosticsPage /></ProtectedRoute>} />
              <Route path="/driver/earnings" element={<ProtectedRoute><DriverEarningsPage /></ProtectedRoute>} />
              <Route path="/admin/review-queue" element={<ProtectedRoute><AdminReviewQueuePage /></ProtectedRoute>} />
              <Route path="/admin/growth" element={<ProtectedRoute><AdminGrowthDashboard /></ProtectedRoute>} />
              <Route path="/city-market/:citySlug" element={<CityMarketplacePage />} />
              <Route path="/admin/qr-generate" element={<ProtectedRoute><QrGeneratePage /></ProtectedRoute>} />
              <Route path="/admin/route-audit" element={<ProtectedRoute><RouteAuditPage /></ProtectedRoute>} />
              {/* orbit/call-test route removed */}
              <Route path="/admin/test-restaurants" element={<ProtectedRoute><AdminRestaurantTestSeederPage /></ProtectedRoute>} />
              <Route path="/admin/runtime-audit" element={<ProtectedRoute><AdminRuntimeAuditPage /></ProtectedRoute>} />
              <Route path="/admin/runtime-links" element={<ProtectedRoute><AdminRuntimeQuickLinksPage /></ProtectedRoute>} />
               <Route path="/admin/master-debug" element={<ProtectedRoute><AdminMasterDebugPage /></ProtectedRoute>} />
               {/* admin/dino-control removed — legacy */}
               <Route path="/admin/ui-engine" element={<ProtectedRoute><AdminUiEnginePage /></ProtectedRoute>} />
               <Route path="/admin/marketplace-ops" element={<ProtectedRoute><AdminMarketplaceOpsPage /></ProtectedRoute>} />
               <Route path="/settings/payment-methods" element={<ProtectedRoute><SettingsPaymentMethodsPage /></ProtectedRoute>} />
               <Route path="/merchant/menu" element={<ProtectedRoute><MerchantMenuPageNew /></ProtectedRoute>} />
               <Route path="/merchant/menu/:merchantId" element={<ProtectedRoute><MerchantMenuPageNew /></ProtectedRoute>} />
               <Route path="/driver/dashboard" element={<ProtectedRoute><DriverDashboardPageNew /></ProtectedRoute>} />
               <Route path="/admin/ops-dashboard" element={<ProtectedRoute><AdminOpsDashboardPage /></ProtectedRoute>} />
                <Route path="/admin/orchestration" element={<ProtectedRoute><AdminOrchestrationPage /></ProtectedRoute>} />
                <Route path="/admin/pipeline" element={<ProtectedRoute><AdminPipelinePage /></ProtectedRoute>} />
                 <Route path="/admin/engines" element={<ProtectedRoute><AdminEnginesDashboardPage /></ProtectedRoute>} />
                 <Route path="/admin/engine-cockpit" element={<ProtectedRoute><AdminEngineCockpit /></ProtectedRoute>} />
                 <Route path="/admin/browser-repair" element={<ProtectedRoute><AdminBrowserRepairPage /></ProtectedRoute>} />
                <Route path="/admin/backend-truth" element={<ProtectedRoute><AdminBackendTruthPage /></ProtectedRoute>} />
                <Route path="/admin/garage" element={<ProtectedRoute><AdminGaragePage /></ProtectedRoute>} />
               <Route path="/permissions" element={<PermissionCenterPage />} />
               <Route path="/admin/support-ops" element={<ProtectedRoute><AdminSupportOpsPage /></ProtectedRoute>} />
               <Route path="/admin/delivery-ops" element={<ProtectedRoute><AdminDeliveryOpsPage /></ProtectedRoute>} />
               <Route path="/support/tickets" element={<ProtectedRoute><SupportTicketsPage /></ProtectedRoute>} />
               <Route path="/support/tickets/:ticketId" element={<ProtectedRoute><SupportTicketDetailPage /></ProtectedRoute>} />
               <Route path="/driver/missions-board" element={<ProtectedRoute><DriverMissionsPage /></ProtectedRoute>} />
               <Route path="/driver/missions-board/:orderId" element={<ProtectedRoute><DriverMissionDetailPage /></ProtectedRoute>} />
               <Route path="/driver/proof/:orderId" element={<ProtectedRoute><DriverProofPage /></ProtectedRoute>} />
                <Route path="/admin/merchant-autofill" element={<ProtectedRoute><AdminMerchantAutofillPage /></ProtectedRoute>} />
                <Route path="/admin/bulk-seed" element={<ProtectedRoute><AdminBulkSeedPage /></ProtectedRoute>} />
                <Route path="/admin/super-dashboard" element={<ProtectedRoute><AdminSuperDashboardPage /></ProtectedRoute>} />
               <Route path="/merchant/store-settings/:merchantId" element={<ProtectedRoute><MerchantStoreSettingsPage /></ProtectedRoute>} />
                <Route path="/merchant/promos/:merchantId" element={<ProtectedRoute><MerchantPromoManagerPage /></ProtectedRoute>} />
                <Route path="/admin/payments-ops" element={<ProtectedRoute><AdminPaymentsOpsPage /></ProtectedRoute>} />
                <Route path="/admin/bulk-merchant-import" element={<ProtectedRoute><AdminBulkMerchantImportPage /></ProtectedRoute>} />
                <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
                <Route path="/admin/seed-tools" element={<ProtectedRoute><AdminSeedToolsPage /></ProtectedRoute>} />
                <Route path="/search-results" element={<SearchResultsPage />} />
                <Route path="/admin/content-ops" element={<ProtectedRoute><AdminContentOpsPage /></ProtectedRoute>} />
                <Route path="/order/reorder/:orderId" element={<ProtectedRoute><ReorderPage /></ProtectedRoute>} />
                <Route path="/merchant/orders/:merchantId" element={<ProtectedRoute><MerchantOrderBoardPage /></ProtectedRoute>} />
                <Route path="/admin/analytics-ops" element={<ProtectedRoute><AdminAnalyticsOpsPage /></ProtectedRoute>} />
                <Route path="/me" element={<ProtectedRoute><MeCommandCenter /></ProtectedRoute>} />
                <Route path="/settings/notification-preferences" element={<ProtectedRoute><NotificationPreferencesPage /></ProtectedRoute>} />
                <Route path="/admin/quality-ops" element={<ProtectedRoute><AdminQualityOpsPage /></ProtectedRoute>} />
                <Route path="/merchant/reviews/:merchantId" element={<ProtectedRoute><MerchantReviewRepliesPage /></ProtectedRoute>} />
                <Route path="/admin/crm-ops" element={<ProtectedRoute><AdminCrmOpsPage /></ProtectedRoute>} />
                <Route path="/admin/home-engine" element={<ProtectedRoute><AdminHomeEnginePage /></ProtectedRoute>} />
                <Route path="/admin/map-engine" element={<ProtectedRoute><AdminMapEnginePage /></ProtectedRoute>} />
                <Route path="/admin/notification-engine" element={<ProtectedRoute><AdminNotificationEnginePage /></ProtectedRoute>} />
                <Route path="/merchant/inventory/:merchantId" element={<ProtectedRoute><MerchantInventoryPage /></ProtectedRoute>} />
                <Route path="/merchant/live/:merchantId" element={<ProtectedRoute><MerchantLiveControlPage /></ProtectedRoute>} />
                <Route path="/merchant/coupons/:merchantId" element={<ProtectedRoute><MerchantCouponManagerPage /></ProtectedRoute>} />
                <Route path="/admin/growth-ops" element={<ProtectedRoute><AdminGrowthOpsPage /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><NotificationCenterPage /></ProtectedRoute>} />
                <Route path="/admin/retention-ops" element={<ProtectedRoute><AdminRetentionOpsPage /></ProtectedRoute>} />
                <Route path="/driver/earnings-v2" element={<ProtectedRoute><DriverEarningsPageNew /></ProtectedRoute>} />
                <Route path="/order/receipt/:orderId" element={<ProtectedRoute><OrderReceiptPage /></ProtectedRoute>} />
                <Route path="/merchant/analytics/:merchantId" element={<ProtectedRoute><MerchantBasicAnalyticsPage /></ProtectedRoute>} />
                <Route path="/merchant/customers/:merchantId" element={<ProtectedRoute><MerchantCustomersPage /></ProtectedRoute>} />
                <Route path="/admin/merchant-health" element={<ProtectedRoute><AdminMerchantHealthPage /></ProtectedRoute>} />
                <Route path="/admin/platform-recovery" element={<ProtectedRoute><AdminPlatformRecoveryPage /></ProtectedRoute>} />
                <Route path="/admin/shop-import" element={<ProtectedRoute><AdminShopImportPage /></ProtectedRoute>} />
                <Route path="/admin/visual-quality" element={<ProtectedRoute><AdminVisualQualityPage /></ProtectedRoute>} />
                <Route path="/admin/ranking-control" element={<ProtectedRoute><AdminRankingControlPage /></ProtectedRoute>} />
                <Route path="/admin/coherence-control" element={<ProtectedRoute><AdminCoherenceControlPage /></ProtectedRoute>} />
                <Route path="/admin/shop-quality" element={<ProtectedRoute><AdminShopQualityPage /></ProtectedRoute>} />
                <Route path="/admin/source-audit" element={<ProtectedRoute><AdminSourceAuditPage /></ProtectedRoute>} />
                <Route path="/wallet/top-up" element={<ProtectedRoute><WalletTopUpPage /></ProtectedRoute>} />
                <Route path="/wallet/transfer" element={<ProtectedRoute><WalletTransferPage /></ProtectedRoute>} />
                <Route path="/wallet/request" element={<ProtectedRoute><WalletRequestPage /></ProtectedRoute>} />
                <Route path="/order/refund/:orderId" element={<ProtectedRoute><OrderRefundRequestPage /></ProtectedRoute>} />
                <Route path="/merchant/banner-editor/:merchantId" element={<ProtectedRoute><MerchantPromoBannerEditorPage /></ProtectedRoute>} />
                <Route path="/admin/driver-monitor" element={<ProtectedRoute><AdminDriverMonitorPage /></ProtectedRoute>} />
                <Route path="/admin/user-lookup" element={<ProtectedRoute><AdminUserLookupPage /></ProtectedRoute>} />
                <Route path="/admin/notification-ops" element={<ProtectedRoute><AdminNotificationOpsPage /></ProtectedRoute>} />
                <Route path="/admin/finance-summary" element={<ProtectedRoute><AdminFinanceSummaryPage /></ProtectedRoute>} />
                <Route path="/me/spending-insights" element={<ProtectedRoute><CustomerSpendingInsightsPage /></ProtectedRoute>} />
                <Route path="/admin/platform-alerts" element={<ProtectedRoute><AdminPlatformAlertsPage /></ProtectedRoute>} />
                <Route path="/me/address-book" element={<ProtectedRoute><CustomerAddressBookPage /></ProtectedRoute>} />
                <Route path="/merchant/business-summary/:merchantId" element={<ProtectedRoute><MerchantBusinessSummaryPage /></ProtectedRoute>} />
                <Route path="/admin/order-watch" element={<ProtectedRoute><AdminOrderWatchPage /></ProtectedRoute>} />
                <Route path="/me/loyalty-history" element={<ProtectedRoute><CustomerLoyaltyHistoryPage /></ProtectedRoute>} />
                <Route path="/admin/search-watch" element={<ProtectedRoute><AdminSearchWatchPage /></ProtectedRoute>} />
                <Route path="/my-orders/active" element={<ProtectedRoute><CustomerActiveOrdersPage /></ProtectedRoute>} />
                <Route path="/merchant/closing-mode/:merchantId" element={<ProtectedRoute><MerchantClosingModePage /></ProtectedRoute>} />
                <Route path="/admin/merchant-promo-watch" element={<ProtectedRoute><AdminMerchantPromoWatchPage /></ProtectedRoute>} />
                <Route path="/driver/earnings-summary" element={<ProtectedRoute><DriverEarningsSummaryPage /></ProtectedRoute>} />
                <Route path="/admin/refund-watch" element={<ProtectedRoute><AdminRefundWatchPage /></ProtectedRoute>} />
                <Route path="/merchant/customer-insights/:merchantId" element={<ProtectedRoute><MerchantCustomerInsightsPage /></ProtectedRoute>} />
                {/* duplicate /admin/driver-heatmap removed — canonical at line 1026 */}
                <Route path="/my-orders/archive" element={<ProtectedRoute><CustomerOrderArchivePage /></ProtectedRoute>} />
                <Route path="/merchant/product-performance/:merchantId" element={<ProtectedRoute><MerchantProductPerformancePage /></ProtectedRoute>} />
                <Route path="/admin/wallet-watch" element={<ProtectedRoute><AdminWalletWatchPage /></ProtectedRoute>} />
                <Route path="/reorder" element={<ProtectedRoute><CustomerReorderPage /></ProtectedRoute>} />
                <Route path="/merchant/auto-accept/:merchantId" element={<ProtectedRoute><MerchantAutoAcceptSettingsPage /></ProtectedRoute>} />
                <Route path="/admin/system-health" element={<ProtectedRoute><AdminSystemHealthPage /></ProtectedRoute>} />
                <Route path="/location/live" element={<ProtectedRoute><CustomerLiveLocationPage /></ProtectedRoute>} />
                <Route path="/driver/active-missions" element={<ProtectedRoute><DriverActiveMissionsPage /></ProtectedRoute>} />
                <Route path="/admin/fraud-detection" element={<ProtectedRoute><AdminFraudDetectionPage /></ProtectedRoute>} />
                <Route path="/me/saved-cards" element={<ProtectedRoute><CustomerSavedCardsPage /></ProtectedRoute>} />
                <Route path="/merchant/inventory-alerts/:merchantId" element={<ProtectedRoute><MerchantInventoryAlertsPage /></ProtectedRoute>} />
                <Route path="/admin/order-timeline" element={<ProtectedRoute><AdminOrderTimelinePage /></ProtectedRoute>} />
                <Route path="/driver/shift" element={<ProtectedRoute><DriverShiftPage /></ProtectedRoute>} />
                <Route path="/admin/merchant-approval-queue" element={<ProtectedRoute><AdminMerchantApprovalQueuePage /></ProtectedRoute>} />
                <Route path="/me/delivery-notes" element={<ProtectedRoute><CustomerDeliveryNotesPage /></ProtectedRoute>} />
                <Route path="/merchant/staff-access/:merchantId" element={<ProtectedRoute><MerchantStaffAccessPage /></ProtectedRoute>} />
                <Route path="/admin/failed-payments" element={<ProtectedRoute><AdminFailedPaymentsPage /></ProtectedRoute>} />
                <Route path="/admin/support-sla" element={<ProtectedRoute><AdminSupportSlaPage /></ProtectedRoute>} />
                <Route path="/checkout/address-selector" element={<ProtectedRoute><CustomerAddressSelectorPage /></ProtectedRoute>} />
                <Route path="/merchant/daily-sales/:merchantId" element={<ProtectedRoute><MerchantDailySalesPage /></ProtectedRoute>} />
                <Route path="/admin/delivery-incidents" element={<ProtectedRoute><AdminDeliveryIncidentsPage /></ProtectedRoute>} />
                <Route path="/me/payment-activity" element={<ProtectedRoute><CustomerPaymentActivityPage /></ProtectedRoute>} />
                <Route path="/driver/availability-zones" element={<ProtectedRoute><DriverAvailabilityZonesPage /></ProtectedRoute>} />
                <Route path="/admin/growth-dashboard" element={<ProtectedRoute><AdminGrowthDashboardPage /></ProtectedRoute>} />
                <Route path="/me/order-receipts" element={<ProtectedRoute><CustomerOrderReceiptsPage /></ProtectedRoute>} />
                <Route path="/admin/growth-engine" element={<ProtectedRoute><AdminGrowthEnginePage /></ProtectedRoute>} />
                <Route path="/merchant/refund-requests/:merchantId" element={<ProtectedRoute><MerchantRefundRequestsPage /></ProtectedRoute>} />
                <Route path="/admin/coupon-oversight" element={<ProtectedRoute><AdminCouponOversightPage /></ProtectedRoute>} />
                <Route path="/driver/completed-deliveries" element={<ProtectedRoute><DriverCompletedDeliveriesPage /></ProtectedRoute>} />
                <Route path="/admin/active-sessions" element={<ProtectedRoute><AdminActiveSessionsPage /></ProtectedRoute>} />
                <Route path="/merchant/menu-bulk/:merchantId" element={<ProtectedRoute><MerchantMenuBulkEditPage /></ProtectedRoute>} />
                <Route path="/admin/fraud-monitor" element={<ProtectedRoute><AdminFraudMonitorPage /></ProtectedRoute>} />
                <Route path="/driver/live-missions" element={<ProtectedRoute><DriverLiveMissionsPage /></ProtectedRoute>} />
                {/* FS-FX */}
                <Route path="/admin/core-engine" element={<ProtectedRoute><AdminCoreEnginePage /></ProtectedRoute>} />
                {/* FY-GD */}
                <Route path="/checkout/group-order" element={<ProtectedRoute><CustomerGroupOrderPage /></ProtectedRoute>} />
                {/* GE-GJ */}
                <Route path="/merchant/delivery-zones/:merchantId" element={<ProtectedRoute><MerchantDeliveryZonesPage /></ProtectedRoute>} />
                {/* GK-GP */}
                <Route path="/checkout/gift-order" element={<ProtectedRoute><CustomerOrderGiftsPage /></ProtectedRoute>} />
                {/* GQ-GV */}
                <Route path="/checkout/split-bill" element={<ProtectedRoute><CustomerSplitBillPage /></ProtectedRoute>} />
                <Route path="/merchant/kitchen-display/:merchantId" element={<ProtectedRoute><MerchantKitchenDisplayPage /></ProtectedRoute>} />
                <Route path="/admin/order-audit" element={<ProtectedRoute><AdminOrderAuditPage /></ProtectedRoute>} />
                {/* GW-HB */}
                <Route path="/me/saved-carts" element={<ProtectedRoute><CustomerSavedCartsPage2 /></ProtectedRoute>} />
                {/* HC-HH */}
                <Route path="/me/auto-repeat" element={<ProtectedRoute><CustomerAutoRepeatPage /></ProtectedRoute>} />
                <Route path="/admin/refund-queue" element={<ProtectedRoute><AdminRefundQueuePage /></ProtectedRoute>} />
                <Route path="/checkout/party-order" element={<ProtectedRoute><CustomerPartyOrderPage /></ProtectedRoute>} />
                <Route path="/admin/platform-health" element={<ProtectedRoute><AdminPlatformHealthPage /></ProtectedRoute>} />
                <Route path="/admin/runtime-cockpit" element={<ProtectedRoute><AdminRuntimeCockpitPage /></ProtectedRoute>} />
                {/* HI-HN */}
                <Route path="/me/redeem-rewards" element={<ProtectedRoute><CustomerRewardRedemptionPage /></ProtectedRoute>} />
                {/* HO-HT */}
                <Route path="/admin/system-live" element={<ProtectedRoute><AdminSystemLivePanelPage /></ProtectedRoute>} />
                {/* HU-HZ */}
                <Route path="/admin/restaurant-autofill" element={<ProtectedRoute><AdminRestaurantFillPage /></ProtectedRoute>} />
                {/* IA-IF */}
                <Route path="/payments/stripe-handler" element={<ProtectedRoute><StripeCheckoutHandlerPage /></ProtectedRoute>} />
                {/* IG-IL */}
                {/* IM-IR */}
                <Route path="/admin/master-control" element={<ProtectedRoute><AdminMasterControlPage /></ProtectedRoute>} />
                {/* IS-IX */}
                {/* JA-JF */}
                <Route path="/admin/qa-command" element={<ProtectedRoute><AdminQaCommandPage /></ProtectedRoute>} />
                {/* KA-KF */}
                <Route path="/live-tracking" element={<ProtectedRoute><LiveTrackingPageNew /></ProtectedRoute>} />
                {/* LG-LR */}
                <Route path="/driver/fuel-costs-v2" element={<ProtectedRoute><DriverFuelCostsPage /></ProtectedRoute>} />
                <Route path="/driver/breaks" element={<ProtectedRoute><DriverBreaksPage /></ProtectedRoute>} />
                <Route path="/merchant/business-hours/:merchantId" element={<ProtectedRoute><MerchantBusinessHoursPage /></ProtectedRoute>} />
                {/* MA-MW */}
                <Route path="/checkout/share-cart" element={<ProtectedRoute><CustomerShareCartPage /></ProtectedRoute>} />
                {/* MX-OG */}
                <Route path="/admin/central-control" element={<ProtectedRoute><AdminCentralControlPanelPage /></ProtectedRoute>} />
                {/* OH-PI */}
                <Route path="/merchant/menu-categories/:merchantId" element={<ProtectedRoute><MerchantMenuCategoryManagerPage /></ProtectedRoute>} />
                <Route path="/admin/menu-quality-control" element={<ProtectedRoute><AdminMenuQualityControlPage /></ProtectedRoute>} />
                <Route path="/admin/ux-live-test" element={<ProtectedRoute><AdminUxLiveTestPage /></ProtectedRoute>} />
                <Route path="/hyper-radar" element={<HyperRadarPage />} />
                {/* PJ-PO */}

              {/* Guest / Public */}
              <Route path="/guest/checkout/:cartId" element={<GuestCheckoutPage />} />
              <Route path="/payment/:orderId" element={<PaymentPage />} />
              <Route path="/claim-shop/:merchantId" element={<ClaimShopPage />} />
              {/* /store/:publicSlug removed — shadowed by /store/:storeId (line 869) */}

              <Route path="/app/orbit" element={<Navigate to="/orbit" replace />} />
              <Route path="/app/*" element={<Navigate to="/" replace />} />

              {/* V2 routes — all redirected to canonical paths */}
              <Route path="/v2-auth" element={<Navigate to="/login" replace />} />
              <Route path="/v2-home" element={<Navigate to="/" replace />} />
              <Route path="/v2-owner" element={<Navigate to="/dashboard" replace />} />
              <Route path="/v2-tenant" element={<Navigate to="/tenant" replace />} />
              <Route path="/v2-bookings" element={<Navigate to="/dashboard" replace />} />
              <Route path="/v2-properties" element={<Navigate to="/dashboard/properties" replace />} />
              <Route path="/v2-search" element={<Navigate to="/radar" replace />} />
              <Route path="/v2-map" element={<Navigate to="/radar" replace />} />
              <Route path="/v2-messages" element={<Navigate to="/dashboard/communication" replace />} />
              <Route path="/v2-notifications" element={<Navigate to="/notifications" replace />} />
              <Route path="/v2-payments" element={<Navigate to="/wallet" replace />} />
              <Route path="/v2-favorites" element={<Navigate to="/favorites" replace />} />
              <Route path="/v2-admin" element={<Navigate to="/admin" replace />} />

              {/* SEO catch-all */}
              <Route path="/seo/*" element={<SEOCatchAll />} />

              {/* Fallback */}
              <Route path="/index" element={<Navigate to="/" replace />} />
              <Route path="*" element={<AppNotFoundPage />} />
            </Routes>
            </SwipeableMain>
           </Suspense>
           <MainBottomNav />
            <SmartInstallBanner />
            <FloatingCTAButton />
            <OrbitPromptOverlay />
            <SmartCloseFlowSheet />
            </UiQualityProvider>
            </SplashScreen>
           </AppLockGuard>
          </UnifiedPaymentProvider>
           </CallProvider>
        </AuthProvider>
    </TooltipProvider>
    </BrowserTelemetryProvider>
    </GlobalExperienceProvider>
    </I18nProvider>
  </QueryClientProvider>
  </ThemeProvider>
  </ErrorBoundary>
  </ChunkRecoveryBoundary>
  </AppCrashBoundary>
);

export default App;
