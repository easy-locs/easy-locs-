// ═══════════════════════════════════════════════════════════════════
// App.tsx — Super-App v3 · 5 Pillars: Dashboard · Radar · Orbit · Wallet · Me
// ═══════════════════════════════════════════════════════════════════

// ── React & routing ──
import { Suspense, lazy, useState, useEffect, memo } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { LazyMotion, domAnimation } from "framer-motion";

// ── Auth & providers ──
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/lib/i18n";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// ── Shell & system (critical — loaded eagerly for app tree) ──
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { GlobalErrorBoundary } from "@/components/system/GlobalErrorBoundary";
import ChunkRecoveryBoundary from "@/components/system/ChunkRecoveryBoundary";

// ── UI chrome (critical — minimal for first paint) ──
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import SplashScreen from "@/components/brand/SplashScreen";
import SwipeableMain from "@/components/navigation/SwipeableMain";
import { HomeRouter, MarketplaceHomeRouter } from "@/components/app/AppRouters";

// ── ALL heavy providers & chrome deferred via lazy ──
const MainBottomNav = lazy(() => import("@/components/navigation/MainBottomNav"));
const SmartInstallBanner = lazy(() => import("@/components/pwa/SmartInstallBanner"));
const SmartCloseFlowSheet = lazy(() => import("@/components/close-flow/SmartCloseFlowSheet"));
const FloatingCTAButton = lazy(() => import("@/components/engine/FloatingCTAButton").then(m => ({ default: m.FloatingCTAButton })));
const OrbitPromptOverlay = lazy(() => import("@/components/engine/OrbitPromptOverlay").then(m => ({ default: m.OrbitPromptOverlay })));
const GlobalOverlayRenderer = lazy(() => import("@/components/overlays/GlobalOverlayRenderer").then(m => ({ default: m.GlobalOverlayRenderer })));
const InAppNavigationView = lazy(() => import("@/components/navigation/InAppNavigationView").then(m => ({ default: m.InAppNavigationView })));
const IntentNavigateProvider = lazy(() => import("@/components/app/IntentNavigateProvider"));
const SmartCoreTracker = lazy(() => import("@/components/system/SmartCoreTracker"));
const SentryRouteTracker = lazy(() => import("@/components/system/SentryRouteTracker"));
const AnalyticsRouteTracker = lazy(() => import("@/components/system/AnalyticsRouteTracker"));
const LazyAppLockGuard = lazy(() => import("@/components/security/AppLockGuard"));
const CookieConsentBannerLazy = lazy(() => import("@/components/system/CookieConsentBanner"));
const GlobalSearchTrigger = lazy(() => import("@/components/search/GlobalSearchTrigger"));
const AppRatingPromptLazy = lazy(() => import("@/components/pwa/AppRatingPrompt"));
function AppLockGuardShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <LazyAppLockGuard>{children}</LazyAppLockGuard>
    </Suspense>
  );
}

// ── Deferred services provider — single lazy wrapper for call + payments ──
const LazyDeferredServices = lazy(async () => {
  const [{ CallProvider }, { UnifiedPaymentProvider }] = await Promise.all([
    import("@/components/call/CallProvider"),
    import("@/payments/UnifiedPaymentSystem"),
  ]);
  return {
    default: ({ children }: { children: React.ReactNode }) => (
      <CallProvider><UnifiedPaymentProvider>{children}</UnifiedPaymentProvider></CallProvider>
    ),
  };
});

function DeferredServicesProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = safeIdleCallback(() => setReady(true), { timeout: 1500 });
    return () => { if (typeof cancelIdleCallback === "function") cancelIdleCallback(id); else clearTimeout(id); };
  }, []);
  if (!ready) return <>{children}</>;
  return (
    <Suspense fallback={<>{children}</>}>
      <LazyDeferredServices>{children}</LazyDeferredServices>
    </Suspense>
  );
}


const safeIdleCallback = (fn: () => void, opts?: { timeout: number }) => {
  if (typeof requestIdleCallback === "function") {
    return requestIdleCallback(fn, opts);
  }
  return setTimeout(fn, opts?.timeout ?? 100) as unknown as number;
};

// ── Web Vitals — track LCP, FID, CLS, INP, FCP, TTFB ──
safeIdleCallback(() => {
  import("@/lib/web-vitals").then(m => m.initWebVitals()).catch(() => {});
}, { timeout: 2000 });

// ── Quality gates — defer to idle (never block parse) ──
const scheduleIdle = (fn: () => void) => safeIdleCallback(fn, { timeout: 3000 });
scheduleIdle(() => { import("@/lib/quality-gates").then(m => m.initQualityGates()).catch(() => {}); });

// ── Deferred boot guards — loaded 3s after first paint ──
function DeferredBootGuards() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const activate = () => setReady(true);
    if (document.readyState === "complete") {
      const t = setTimeout(activate, 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(activate, 1500);
    const onLoad = () => { clearTimeout(t); setTimeout(activate, 200); };
    window.addEventListener("load", onLoad, { once: true });
    return () => { clearTimeout(t); window.removeEventListener("load", onLoad); };
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
    { DevOSBoot },
  ] = await Promise.all([
    import("@/components/system/AppInit"),
    import("@/components/app/CanonicalShellRuntime"),
    import("@/lib/geo/GeoBoot"),
    import("@/components/boot/PermissionBootstrap"),
    import("@/components/app/AppGuards"),
    import("@/providers/GlobalExperienceProvider"),
    import("@/providers/UiQualityProvider"),
    import("@/components/system/BrowserTelemetryProvider"),
    import("@/components/system/DevOSBoot"),
  ]);

  const AppBootstrapGuardDirect = lazy(() => import("@/components/app/AppBootstrapGuard"));
  const PrayerNotificationProvider = lazy(() => import("@/components/app/PrayerNotificationProvider"));
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
        <DevOSBoot />
        <Suspense fallback={null}><AppBootstrapGuardDirect /></Suspense>
        <Suspense fallback={null}><PrayerNotificationProvider /></Suspense>
        <Suspense fallback={null}><AppRatingPromptLazy /></Suspense>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-fullscreen focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium">Skip to main content</a>
      </>
    ),
  };
});

// ── Page registry (all lazy-loaded) ──
import * as Pages from "@/app/app-route-registry";

const {
  // Auth
  Index, Login, Signup, ForgotPassword, ResetPassword, VerifyEmail, Onboarding, AuthCallbackPage, AuthDiagnosticPage,

  // Dashboard (Pillar 1)
  Dashboard, AddProperty, PropertyDetailHub, CreateListing,
  Receipts, Reminders, Documents, AIAssistant, AISearch, Leases, Company, Billing, Settings,
  Tenants, RentalManagement, Finances, Interventions, Tasks,
  ChargesRegularization, FiscalReport, Expenses, Candidates, SeasonalRentals, PaymentNotices,
  DunningLetters, FurnitureInventory, Buildings, Vault, DataImport, CVGenerator,
  CategorySubscriptions, ChannelManager, Accounting, LandlordRentDashboard, AccountingEntries,
  ReportingDashboard, DynamicPricing, PropertyCalendar, RealEstateListings, LandlordProfile,
  Referrals, Collaboration, DeveloperPortal, AuditTrail, CountryWorkspace, ServiceTrackingPage,
  GeoExplorerPage,
  PrayerTimesPage, NewsPage,
  RealEstateModulePage, REPropertiesPage, REUnitsPage, RETenantsPage, RELeasesPage,
  REPaymentsPage, REDocumentsPage, REPropertyDetailPage, RELeaseDetailPage,

  // Radar (Pillar 2)
  HyperRadarPage, ExplorePage,
  DiscoverPage, BrowseVerticalPage, RetailIndexPage, RetailCategoryPage, RetailMallPage, RetailStorePage,
  PropertyHubPage, FoodTypePage, CuisineListPage, FoodRestaurantPage,
  TravelHub, TravelFlights, TravelStays, TravelHotelDetail, HotelCheckout, TravelStayDetail, TravelFlightDetail,
  HotelDashboardPage, HotelCalendarPage, HotelRoomsPage, HotelPricingPage,
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
  ForexDashboardPage,
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
  SettingsSupportPage, SettingsSubscriptionPage, SettingsPrivacyPage, SettingsMarketingPage,
  ProviderAvailabilityPage, ProviderZonesPage, ProviderBookingsPage, ProviderServicesPage,
  CustomerSpendingInsightsPage, EditProfilePage, CustomerAddressBookPage, CustomerLoyaltyHistoryPage,
  CustomerChallengesPage, CustomerReferralPage, CreatorDashboardPage,
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
  MerchantKitchenDisplayPage, MerchantBusinessHoursPage, MerchantMenuCategoryManagerPage, MerchantMenuItemEditorPage,
  DriverDashboardPageNew, DriverLivePage,
  DriverEarningsPageNew, DriverMissionsPage, DriverMissionDetailPage,
  DriverProofPage, DriverEarningsSummaryPage, DriverActiveMissionsPage, DriverShiftPage,
  DriverAvailabilityZonesPage, DriverCompletedDeliveriesPage, DriverLiveMissionsPage,
  DriverFuelCostsPage, DriverBreaksPage,
  DriverTaxiDashboardPage, DriverTaxiEarningsPage,
  SellerDashboardPage, BoostDashboardPage,
  MyShopsPage, MyBusinessHub, OpsCenter,
  RefundRequestPage, CustomerProfilePage,
  SupportTicketsPage, SupportTicketDetailPage, PermissionCenterPage,
  TeamCommandCenterPage, TeamPermissionsPage,

  // DevOS / Builder
  DevOSDashboardPage, ArchitectureMapPage, AuditCenterPage,
  RepairCenterPage, MemoryCenterPage, DeployCenterPage,

  // Admin — canonical set (duplicates removed; old URLs redirect below)
  AdminDashboard, AdminDisputesPage, FinancialReconPage,
  ConciergeOperations,
  MenuAdminPage, SupportInboxPage,
  AdminRealtimeControlPage, AdminAlertCenterPage,
  AdminWalletDiagnosticsPage, ExecutionProofPage,
  AdminReviewQueuePage,
  AdminUiEnginePage, AdminMarketplaceOpsPage, AdminOpsDashboardPage,
  AdminPipelinePage, AdminEnginesDashboardPage, AdminAutonomyDashboardPage,
  AdminSupportOpsPage, AdminDeliveryOpsPage,
  AdminPaymentsOpsPage,
  AdminSeedToolsPage, AdminContentOpsPage, AdminAnalyticsOpsPage, AdminQualityOpsPage,
  AdminCrmOpsPage,
  AdminGrowthOpsPage, AdminRetentionOpsPage, AdminMerchantHealthPage,
  AdminShopImportPage,
  AdminShopQualityPage, AdminSourceAuditPage,
  AdminDriverMonitorPage, AdminUserLookupPage, AdminNotificationOpsPage, AdminFinanceSummaryPage,
  AdminOrderWatchPage, AdminSystemHealthPage,
  AdminFraudDetectionPage,
  AdminMerchantApprovalQueuePage,
  AdminKycReviewPage,
  HotelOnboardingWizard,
  TaxiDriverOnboardingWizard,
  ServiceProviderOnboardingWizard,
  AdminSupportSlaPage,
  AdminRefundQueuePage, AdminPlatformHealthPage,
  AdminMasterControlPage, AdminControlRoomPage,
  EngineControlRoomPage,
  AdminAIControlCenter,
  AdminDataQualityPage,
  CommandControlDashboard,
  RiderPrioritySubscriptionPage,
} = Pages;

const RewardsHubPage = lazy(() => import("@/pages/RewardsHubPage"));

const {
  // Deep-link
  UserProfilePage, ProductPage, LivePage, PayPage, QrPayResolver, QrResolvePage, ShortLinkResolvePage, PayRequestPage,
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
  CityGuidePage, BestServiceCityPage, CompareServiceCityPage,

  // Legal
  TermsPage, PrivacyPage, CookiePage, LegalNoticePage, AboutPage, ContactPage, HelpPage, PlatformVision,

  // Misc
  ClaimPage, ClaimShopPage, AppNotFoundPage,

  // Pro Back Office
  ProShell, ProDashboard, ProOnboarding, ProProfile, ProMedia, ProCatalog,
  ProAvailability, ProPricing, ProOrders, ProInbox, ProReviews, ProWallet,
  ProTeam, ProAnalytics, ProLiveMonitor, ProSettings, ProCompliance,
  SocialHubPage, BadgesPage, MyReviewsPage,

  // Commerce + Services (Task #142)
  ProductDetailPage, WishlistPage, MerchantReturnsPage,
  ServicesPage, ServiceProviderPage,
  ProviderDashboardPage, ProviderCalendarPage, ProviderServicesCrudPage,
  ProviderAvailabilityPageNew, ProviderEarningsPage,
  AdminSuperDashboardPage,
} = Pages;

// City sub-page wrappers
const CityServicesPage = () => <CityHubPage subPage="services" />;
const CityActivitiesPage = () => <CityHubPage subPage="activities" />;
const CityConciergePage = () => <CityHubPage subPage="concierge" />;

function DashboardCommRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/orbit${search}`} replace />;
}

function PricingScrollRedirect() {
  useEffect(() => {
    const el = document.getElementById("pricing");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);
  return <Index />;
}

// ── Runtime bootstrap ──
import { queryClient } from "@/lib/query-client";
import { setActionQueryClient } from "@/lib/run-action";
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__REACT_QUERY_CLIENT__ = queryClient;
}
setActionQueryClient(queryClient);
safeIdleCallback(() => {
  import("@/lib/smart-prefetch").then((m) => {
    m.prefetchCriticalRoutes();
    m.initPreconnectHints();
  }).catch(() => {});
}, { timeout: 5000 });
safeIdleCallback(() => {
  import("@/lib/super-app-bridge").then((m) => m.installSuperAppBridge()).catch(() => {});
}, { timeout: 10000 });

function CoreProviders({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict={false}>
      <GlobalErrorBoundary>
        <ChunkRecoveryBoundary>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false} storageKey="easylocs-theme">
            <QueryClientProvider client={queryClient}>
              <I18nProvider>
                {children}
              </I18nProvider>
            </QueryClientProvider>
          </ThemeProvider>
        </ChunkRecoveryBoundary>
      </GlobalErrorBoundary>
    </LazyMotion>
  );
}

const App = () => (
  <CoreProviders>
    <Toaster />
    <Sonner />
    <Suspense fallback={null}><CookieConsentBannerLazy /></Suspense>
    <AuthProvider>
    <SplashScreen>
    <DeferredServicesProvider>
    <AppLockGuardShell>
      <Suspense fallback={null}>
        <IntentNavigateProvider />
      </Suspense>
      <DeferredBootGuards />
      <Suspense fallback={null}>
        <SmartCoreTracker />
        <SentryRouteTracker />
        <AnalyticsRouteTracker />
      </Suspense>
      <Suspense fallback={null}>
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
                  <Route path="/auth/diagnostic" element={<ProtectedRoute><AuthDiagnosticPage /></ProtectedRoute>} />
                  <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                  <Route path="/install" element={<Install />} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/*  PILLAR 1 · DASHBOARD                         */}
                  {/* ═══════════════════════════════════════════════ */}
                  <Route path="/" element={<FeatureErrorBoundary featureName="Dashboard"><HomeRouter /></FeatureErrorBoundary>} />
                  <Route path="/landing" element={<FeatureErrorBoundary featureName="Dashboard"><Index /></FeatureErrorBoundary>} />
                  <Route path="/home" element={<MarketplaceHomeRouter />} />
                  <Route path="/pricing" element={<PricingScrollRedirect />} />
                  <Route path="/dashboard" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Dashboard /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/property/add" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><AddProperty /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/property/:id" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><PropertyDetailHub /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/create-listing" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><CreateListing /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/receipts" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Receipts /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/reminders" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Reminders /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/documents" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Documents /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/ai" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><AIAssistant /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/ai-search" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><AISearch /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/leases" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Leases /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/company" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Company /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/billing" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Billing /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/settings" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Settings /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/tenants" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Tenants /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/rental-management" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><RentalManagement /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/finances" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Finances /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/interventions" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Interventions /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/tasks" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Tasks /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/messages" element={<Navigate to="/orbit" replace />} />
                  <Route path="/dashboard/activities" element={<Navigate to="/activities" replace />} />
                  <Route path="/dashboard/communication" element={<DashboardCommRedirect />} />
                  <Route path="/dashboard/charges-regularization" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><ChargesRegularization /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/fiscal-report" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><FiscalReport /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/expenses" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Expenses /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/candidates" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Candidates /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/seasonal-rentals" element={<ProtectedRoute><Navigate to="/property-hub?section=seasonal" replace /></ProtectedRoute>} />
                  <Route path="/dashboard/payment-notices" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><PaymentNotices /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/dunning-letters" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><DunningLetters /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/furniture-inventory" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><FurnitureInventory /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/buildings" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Buildings /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/vault" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Vault /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/import" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><DataImport /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/cv-generator" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><CVGenerator /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/subscriptions" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><CategorySubscriptions /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/channels" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><ChannelManager /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/accounting" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Accounting /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/rent-cockpit" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><LandlordRentDashboard /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/accounting-entries" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><AccountingEntries /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/reporting" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><ReportingDashboard /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/dynamic-pricing" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><DynamicPricing /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/calendar" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><PropertyCalendar /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/real-estate" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><RealEstateListings /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/profile" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><LandlordProfile /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/referrals" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Referrals /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/collaboration" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><Collaboration /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/developer" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><DeveloperPortal /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/audit" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><AuditTrail /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/wallet" element={<Navigate to="/wallet" replace />} />
                  <Route path="/dashboard/service-tracking" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><ServiceTrackingPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/prayer-times" element={<ProtectedRoute><FeatureErrorBoundary featureName="PrayerTimes"><PrayerTimesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/news" element={<ProtectedRoute><FeatureErrorBoundary featureName="News"><NewsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/seller" element={<Navigate to="/seller" replace />} />
                  <Route path="/dashboard/driver" element={<Navigate to="/driver/dashboard" replace />} />
                  <Route path="/dashboard/delivery" element={<Navigate to="/driver/dashboard" replace />} />
                  <Route path="/dashboard/my-shop" element={<Navigate to="/dashboard/my-shops" replace />} />
                  <Route path="/dashboard/my-shops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MyShopsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><OpsCenter /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/country/:countryCode" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><CountryWorkspace /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/boost" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><BoostDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/dashboard/properties" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><RealEstateModulePage /></FeatureErrorBoundary></ProtectedRoute>}>
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
                  <Route path="/concierge-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><ConciergeOperations /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/customer/:customerId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><CustomerProfilePage /></FeatureErrorBoundary></ProtectedRoute>} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/*  PILLAR 2 · RADAR (Discover · Browse · Move)   */}
                  {/* ═══════════════════════════════════════════════ */}
                  <Route path="/radar" element={<FeatureErrorBoundary featureName="Radar"><HyperRadarPage /></FeatureErrorBoundary>} />
                  <Route path="/map" element={<Navigate to="/radar" replace />} />
                  <Route path="/discover" element={<Navigate to="/radar" replace />} />
                  <Route path="/search" element={<Navigate to="/radar" replace />} />
                  <Route path="/explore" element={<ExplorePage />} />
                  <Route path="/geo-explorer" element={<GeoExplorerPage />} />
                  <Route path="/geo-explorer/:countryCode" element={<GeoExplorerPage />} />
                  <Route path="/geo-explorer/:countryCode/:cityId" element={<GeoExplorerPage />} />
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
                  <Route path="/food/r/:cuisine/:restaurantId" element={<FoodRestaurantPage />} />
                  <Route path="/food/:type" element={<FoodTypePage />} />
                  <Route path="/food/:type/:cuisine" element={<CuisineListPage />} />
                  <Route path="/shop" element={<RetailIndexPage />} />
                  <Route path="/shop/category/:categorySlug" element={<RetailCategoryPage />} />
                  <Route path="/shop/subcategory/:categorySlug/:subcategorySlug" element={<RetailCategoryPage />} />
                  <Route path="/shop/mall/:mallSlug" element={<RetailMallPage />} />
                  <Route path="/shop/store/:slug" element={<RetailStorePage />} />
                  <Route path="/property" element={<PropertyHubPage />} />
                  <Route path="/real-estate" element={<Pages.RealEstateMarketplace />} />
                  <Route path="/real-estate/dubai-analytics" element={<Pages.DubaiAnalyticsPage />} />
                  <Route path="/real-estate/:listingType" element={<Pages.RealEstateMarketplace />} />
                  <Route path="/real-estate/:listingType/:slug" element={<Pages.RealEstateDetailPage />} />
                  <Route path="/property-hub" element={<PropertyManagementHub />} />
                  <Route path="/property-hub/seasonal/reservations" element={<ProtectedRoute><FeatureErrorBoundary featureName="PropertyHub"><SeasonalRentals /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/travel" element={<TravelHub />} />
                  <Route path="/travel/flights" element={<TravelFlights />} />
                  <Route path="/travel/stays" element={<TravelStays />} />
                  <Route path="/travel/hotels" element={<Navigate to="/travel/stays" replace />} />
                  <Route path="/travel/hotel/:id" element={<TravelHotelDetail />} />
                  <Route path="/travel/hotel-checkout" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><HotelCheckout /></FeatureErrorBoundary></ProtectedRoute>} />
                  {/* Hotel routes */}
                  <Route path="/hotel/dashboard" element={<ProtectedRoute><FeatureErrorBoundary featureName="Hotel"><HotelDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/hotel/calendar" element={<ProtectedRoute><FeatureErrorBoundary featureName="Hotel"><HotelCalendarPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/hotel/rooms" element={<ProtectedRoute><FeatureErrorBoundary featureName="Hotel"><HotelRoomsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/hotel/pricing" element={<ProtectedRoute><FeatureErrorBoundary featureName="Hotel"><HotelPricingPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/travel/stay/:id" element={<TravelStayDetail />} />
                  <Route path="/travel/flight/:id" element={<TravelFlightDetail />} />
                  <Route path="/travel/flight-search" element={<FlightSearchPage />} />
                  <Route path="/travel/flight-results" element={<FlightResultsPage />} />
                  <Route path="/travel/flight-detail" element={<FlightDetailPage />} />
                  <Route path="/travel/flight-passengers" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><FlightPassengerPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/travel/flight-payment" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><FlightPaymentPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/travel/flight-confirmation" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><FlightConfirmationPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/property/search" element={<PropertySearchPage />} />
                  <Route path="/property/results" element={<PropertyResultsPage />} />
                  <Route path="/property/detail" element={<PropertyDetailPage />} />
                  <Route path="/property/booking" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><PropertyBookingPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/property/payment" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><PropertyPaymentPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/property/confirmation" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><PropertyConfirmationPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/mobility" element={<MobilityHubPage />} />
                  <Route path="/mobility/taxi" element={<MobilityTaxiPage />} />
                  <Route path="/mobility/delivery" element={<MobilityDeliveryPage />} />
                  <Route path="/mobility/delivery/bring" element={<DeliveryBringPage />} />
                  <Route path="/mobility/delivery/parcel" element={<DeliveryParcelPage />} />
                  <Route path="/mobility/delivery/gift" element={<DeliveryGiftPage />} />
                  <Route path="/mobility/delivery/errand" element={<DeliveryErrandPage />} />
                  <Route path="/rider/live" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><RiderLivePage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/ride" element={<Navigate to="/mobility/taxi" replace />} />
                  <Route path="/taxi" element={<Navigate to="/mobility/taxi" replace />} />
                  <Route path="/send" element={<Navigate to="/mobility/delivery" replace />} />
                  <Route path="/send-package" element={<Navigate to="/mobility/delivery" replace />} />
                  <Route path="/delivery" element={<Navigate to="/mobility/delivery" replace />} />
                  <Route path="/track/:rideRequestId" element={<TrackRidePage />} />
                  <Route path="/call/:threadId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><CallDriverPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/driver/heatmap" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><DemandHeatmapPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/subscription/priority" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><RiderPrioritySubscriptionPage /></FeatureErrorBoundary></ProtectedRoute>} />
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
                  <Route path="/provider/availability" element={<ProtectedRoute><FeatureErrorBoundary featureName="Provider"><ProviderAvailabilityPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/provider/availability-v2" element={<ProtectedRoute><FeatureErrorBoundary featureName="Provider"><ProviderAvailabilityPageNew /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/provider/zones" element={<ProtectedRoute><FeatureErrorBoundary featureName="Provider"><ProviderZonesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/provider/bookings" element={<ProtectedRoute><FeatureErrorBoundary featureName="Provider"><ProviderBookingsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/provider/services" element={<ProtectedRoute><FeatureErrorBoundary featureName="Provider"><ProviderServicesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/provider/dashboard" element={<ProtectedRoute><FeatureErrorBoundary featureName="Provider"><ProviderDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/provider/calendar" element={<ProtectedRoute><FeatureErrorBoundary featureName="Provider"><ProviderCalendarPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/provider/services-crud" element={<ProtectedRoute><FeatureErrorBoundary featureName="Provider"><ProviderServicesCrudPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/provider/earnings" element={<ProtectedRoute><FeatureErrorBoundary featureName="Provider"><ProviderEarningsPage /></FeatureErrorBoundary></ProtectedRoute>} />
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
                  <Route path="/wallet/forex" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><ForexDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/wallet/transaction/:txId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><WalletTransactionDetailPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/wallet/pay/:threadId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><PayRidePage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/wallet/property/*" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><Pages.WalletPropertyHub /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/wallet/accounts" element={<Navigate to="/settings/wallet" replace />} />
                  <Route path="/pos" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><POSPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/pos/:shopId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><POSPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/checkout" element={<FeatureErrorBoundary featureName="Wallet"><CheckoutPage /></FeatureErrorBoundary>} />
                  <Route path="/checkout/address-selector" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><CustomerAddressSelectorPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/checkout/group-order" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><CustomerGroupOrderPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/checkout/gift-order" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><CustomerOrderGiftsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/checkout/split-bill" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><CustomerSplitBillPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/checkout/party-order" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><CustomerPartyOrderPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/checkout/share-cart" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><CustomerShareCartPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/orders" element={<Navigate to="/my-orders" replace />} />
                  <Route path="/my-orders" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><MyOrdersPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/my-orders/active" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><CustomerActiveOrdersPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/my-orders/archive" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><CustomerOrderArchivePage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/order/:orderId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><UnifiedOrderDetailPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/order/receipt/:orderId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><OrderReceiptPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/order/refund/:orderId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><OrderRefundRequestPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/order/reorder/:orderId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><ReorderPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/reorder" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><CustomerReorderPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/tracking/:orderId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><TrackingPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/live-tracking" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><LiveTrackingPageNew /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/refund/:rideRequestId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><RefundRequestPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/payment/:orderId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><PaymentPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/payments/stripe-elements" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><StripeElementsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/payments/stripe-handler" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><StripeCheckoutHandlerPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/guest/checkout/:cartId" element={<GuestCheckoutPage />} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/*  PILLAR 5 · ME (Profile · Settings · Tools)    */}
                  {/* ═══════════════════════════════════════════════ */}
                  <Route path="/me" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><MeCommandCenter /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/edit-profile" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><EditProfilePage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/spending-insights" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerSpendingInsightsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/address-book" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerAddressBookPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/loyalty-history" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerLoyaltyHistoryPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/challenges" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerChallengesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/referral" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerReferralPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/referrals" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerReferralPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/social" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SocialHubPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/badges" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><BadgesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/reviews" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><MyReviewsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/wishlist" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><WishlistPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/loyalty" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerLoyaltyHistoryPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/creator" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CreatorDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/creator/affiliates" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CreatorDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/creator/analytics" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CreatorDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/creator/tips" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CreatorDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/saved-cards" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerSavedCardsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/saved-carts" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerSavedCartsPage2 /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/delivery-notes" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerDeliveryNotesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/payment-activity" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerPaymentActivityPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/order-receipts" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerOrderReceiptsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/gestion-immo" element={<Navigate to="/property-hub" replace />} />
                  <Route path="/me/gestion-immo/:propertyId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MePropertyDetail /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/tenant-view" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><Pages.MeTenantView /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/property-hub" element={<Navigate to="/property-hub" replace />} />
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
                  <Route path="/me/rewards" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><RewardsHubPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/me/redeem-rewards" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerRewardRedemptionPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/favorites" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><FavoritesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><NotificationCenterPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/location/live" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><CustomerLiveLocationPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/permissions" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><PermissionCenterPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/support/tickets" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SupportTicketsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/support/tickets/:ticketId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SupportTicketDetailPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/team/command-center" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><TeamCommandCenterPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/team/permissions" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><TeamPermissionsPage /></FeatureErrorBoundary></ProtectedRoute>} />

                  {/* Settings — /settings redirects to /me (unified hub) */}
                  <Route path="/settings" element={<Navigate to="/me" replace />} />
                  <Route path="/settings/account" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsAccountPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/settings/orbit" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsOrbitPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/settings/business" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsBusinessPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/settings/wallet" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsWalletPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/settings/addresses" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsAddressesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/settings/notifications" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsNotificationsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/settings/security" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsSecurityPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/settings/preferences" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsPreferencesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/settings/support" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsSupportPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/settings/subscription" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsSubscriptionPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/settings/privacy" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsPrivacyPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/settings/marketing" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><SettingsMarketingPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/settings/payment-methods" element={<Navigate to="/wallet" replace />} />
                  <Route path="/settings/notification-preferences" element={<Navigate to="/settings/notifications" replace />} />

                  {/* Merchant tools */}
                  <Route path="/merchant/claim" element={<MerchantClaimPage />} />
                  <Route path="/merchant/onboarding" element={<MerchantOnboardingPage />} />
                  <Route path="/merchant/dashboard" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/dashboard/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/finance" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantFinancePage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/pos" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantPosPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/kitchen" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantKitchenPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/orders" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantOrdersPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/orders/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantOrderBoardPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/qr/:shopId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><ShopQrCenterPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/menu" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantMenuPageNew /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/menu/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantMenuPageNew /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/menu-bulk/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantMenuBulkEditPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/menu-categories/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantMenuCategoryManagerPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  {/* Restaurant routes */}
                  <Route path="/merchant/menu/edit/:itemId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantMenuItemEditorPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/store-settings/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantStoreSettingsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/promos/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantPromoManagerPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/banner-editor/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantPromoBannerEditorPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/inventory/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantInventoryPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/inventory-alerts/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantInventoryAlertsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/live/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantLiveControlPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/coupons/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantCouponManagerPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/analytics/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantBasicAnalyticsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/customers/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantCustomersPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/customer-insights/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantCustomerInsightsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/product-performance/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantProductPerformancePage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/business-summary/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantBusinessSummaryPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/closing-mode/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantClosingModePage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/auto-accept/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantAutoAcceptSettingsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/staff-access/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantStaffAccessPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/daily-sales/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantDailySalesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/reviews/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantReviewRepliesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/refund-requests/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantRefundRequestsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/delivery-zones/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantDeliveryZonesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/kitchen-display/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantKitchenDisplayPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/business-hours/:merchantId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantBusinessHoursPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/merchant/returns" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MerchantReturnsPage /></FeatureErrorBoundary></ProtectedRoute>} />

                  {/* Driver tools */}
                  <Route path="/driver/dashboard" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverDashboardPageNew /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/driver/payout" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><DriverPayoutPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/driver/earnings" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><DriverEarningsPageNew /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/driver/earnings-v2" element={<Navigate to="/driver/earnings" replace />} />
                  <Route path="/driver/earnings-summary" element={<ProtectedRoute><FeatureErrorBoundary featureName="Wallet"><DriverEarningsSummaryPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/driver/missions-board" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverMissionsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/driver/missions-board/:orderId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverMissionDetailPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/driver/proof/:orderId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverProofPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/driver/active-missions" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverActiveMissionsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/driver/live-missions" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverLiveMissionsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/driver/completed-deliveries" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverCompletedDeliveriesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/driver/shift" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverShiftPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/driver/availability-zones" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverAvailabilityZonesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/driver/fuel-costs-v2" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverFuelCostsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/driver/breaks" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverBreaksPage /></FeatureErrorBoundary></ProtectedRoute>} />

                  {/* Taxi & Ride routes */}
                  <Route path="/driver/taxi" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverTaxiDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/driver/taxi/earnings" element={<ProtectedRoute><FeatureErrorBoundary featureName="Me"><DriverTaxiEarningsPage /></FeatureErrorBoundary></ProtectedRoute>} />

                  {/* Seller & Business */}
                  <Route path="/seller" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><SellerDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/seller/boost" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><BoostDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/business" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><MyBusinessHub /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/claim-shop/:merchantId" element={<ClaimShopPage />} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/*  PRO BACK OFFICE CONSOLE                       */}
                  {/* ═══════════════════════════════════════════════ */}
                  <Route path="/pro" element={<ProtectedRoute><FeatureErrorBoundary featureName="Pro"><ProShell /></FeatureErrorBoundary></ProtectedRoute>}>
                    <Route index element={<ProDashboard />} />
                    <Route path="onboarding" element={<ProOnboarding />} />
                    <Route path="profile" element={<ProProfile />} />
                    <Route path="media" element={<ProMedia />} />
                    <Route path="catalog" element={<ProCatalog />} />
                    <Route path="availability" element={<ProAvailability />} />
                    <Route path="pricing" element={<ProPricing />} />
                    <Route path="orders" element={<ProOrders />} />
                    <Route path="inbox" element={<ProInbox />} />
                    <Route path="reviews" element={<ProReviews />} />
                    <Route path="wallet" element={<ProWallet />} />
                    <Route path="team" element={<ProTeam />} />
                    <Route path="analytics" element={<ProAnalytics />} />
                    <Route path="monitor" element={<ProLiveMonitor />} />
                    <Route path="settings" element={<ProSettings />} />
                    <Route path="compliance" element={<ProCompliance />} />
                  </Route>

                  {/* ═══════════════════════════════════════════════ */}
                  {/*  ADMIN PANEL — Canonical routes only           */}
                  {/*  (Duplicate/redundant routes removed; legacy   */}
                  {/*   URLs redirect to canonical equivalents)      */}
                  {/* ═══════════════════════════════════════════════ */}
                  {/* ══ DevOS / Builder ══ */}
                  <Route path="/builder" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><DevOSDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/builder/architecture" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><ArchitectureMapPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/builder/audit" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AuditCenterPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/builder/repair" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><RepairCenterPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/builder/memory" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><MemoryCenterPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/builder/deploy" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><DeployCenterPage /></FeatureErrorBoundary></ProtectedRoute>} />

                  {/* ══ Admin ══ */}
                  <Route path="/admin" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminDashboard /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/control-room" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminControlRoomPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/engine-control-room" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><EngineControlRoomPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/engines" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminEnginesDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/autonomy" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminAutonomyDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/ops-dashboard" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminOpsDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/fraud-detection" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminFraudDetectionPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/disputes" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminDisputesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/financial-recon" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><FinancialReconPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/menu" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><MenuAdminPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/support-inbox" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><SupportInboxPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/driver-live" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><DriverLivePage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/driver-monitor" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminDriverMonitorPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/realtime-control" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminRealtimeControlPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/loyalty-redeem" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><LoyaltyRedeemPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/alerts" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminAlertCenterPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/wallet-diagnostics" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminWalletDiagnosticsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/execution-proof" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><ExecutionProofPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/review-queue" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminReviewQueuePage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/growth-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminGrowthOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/qr-generate" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><QrGeneratePage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/master-control" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminMasterControlPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/ui-engine" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminUiEnginePage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/marketplace-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminMarketplaceOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/pipeline" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminPipelinePage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/ai-control-center" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminAIControlCenter /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/support-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminSupportOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/delivery-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminDeliveryOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/merchant-health" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminMerchantHealthPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/merchant-approval-queue" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminMerchantApprovalQueuePage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/payments-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminPaymentsOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/notification-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminNotificationOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/seed-tools" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminSeedToolsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/shop-import" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminShopImportPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/shop-quality" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminShopQualityPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/content-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminContentOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/analytics-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminAnalyticsOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/quality-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminQualityOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/crm-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminCrmOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/retention-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminRetentionOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/support-sla" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminSupportSlaPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/source-audit" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminSourceAuditPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/user-lookup" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminUserLookupPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/finance-summary" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminFinanceSummaryPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/order-watch" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminOrderWatchPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/refund-queue" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminRefundQueuePage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/system-health" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminSystemHealthPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/platform-health" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminPlatformHealthPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/data-quality" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminDataQualityPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/command-control" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><CommandControlDashboard /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/food-checkout" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><FoodOrderCheckoutPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/delivery-proof/:orderId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><DeliveryProofPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/kyc" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminKycReviewPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/super-dashboard" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminSuperDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/*  ONBOARDING WIZARDS                            */}
                  {/* ═══════════════════════════════════════════════ */}
                  <Route path="/onboarding/hotel" element={<ProtectedRoute><FeatureErrorBoundary featureName="Onboarding"><HotelOnboardingWizard /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/onboarding/taxi" element={<ProtectedRoute><FeatureErrorBoundary featureName="Onboarding"><TaxiDriverOnboardingWizard /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="/onboarding/service-provider" element={<ProtectedRoute><FeatureErrorBoundary featureName="Onboarding"><ServiceProviderOnboardingWizard /></FeatureErrorBoundary></ProtectedRoute>} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/*  DEEP LINKS · QR · PUBLIC                      */}
                  {/* ═══════════════════════════════════════════════ */}
                  <Route path="/add-contact" element={<AddContactPage />} />
                  <Route path="/u/:userId" element={<UserProfilePage />} />
                  <Route path="/product/:productId" element={<ProductDetailPage />} />
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
                  <Route path="/sl/:code" element={<ShortLinkResolvePage />} />
                  <Route path="/qr/entry/:targetCode" element={<QrEntryPage />} />
                  <Route path="/qr/track" element={<QrTrackingPage />} />
                  <Route path="/qr/pickup" element={<QrPickupPage />} />
                  <Route path="/claim/:token" element={<ClaimPage />} />
                  <Route path="/go/:slug" element={<SlugResolver />} />
                  <Route path="/go/:slug/:category" element={<SlugCategoryResolver />} />

                  {/* ═══════════════════════════════════════════════ */}
                  {/*  SEO · MARKETPLACE · LOCATIONS                 */}
                  {/* ═══════════════════════════════════════════════ */}
                  <Route path="/browse/services" element={<ServicesPage />} />
                  <Route path="/browse/services/:providerId" element={<ServiceProviderPage />} />
                  <Route path="/marketplace-services" element={<MarketplaceServicesPage />} />
                  <Route path="/activities-booking" element={<ActivitiesPage />} />
                  <Route path="/seasonal-rentals-booking" element={<SeasonalRentalsPage />} />
                  <Route path="/seasonal-rentals" element={<Navigate to="/seasonal-rentals-booking" replace />} />
                  <Route path="/long-term-rentals" element={<LongTermRentalsPage />} />
                  <Route path="/property-owner-software" element={<CoreSEOPages />} />
                  <Route path="/property-management-platform" element={<PropertyManagementPlatformPage />} />
                  <Route path="/rental-management-software" element={<RentalManagementSoftwarePage />} />
                  <Route path="/guide/:citySlug" element={<CityGuidePage />} />
                  <Route path="/best/:serviceSlug/in/:citySlug" element={<BestServiceCityPage />} />
                  <Route path="/compare/:serviceSlug/in/:citySlug" element={<CompareServiceCityPage />} />
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
                  <Route path="/marketplace/c2c" element={<Pages.C2CMarketplace />} />
                  <Route path="/marketplace/c2c/:id" element={<Pages.C2CListingDetail />} />
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
        <Suspense fallback={null}><MainBottomNav /></Suspense>
        <Suspense fallback={null}>
          <SmartInstallBanner />
          <FloatingCTAButton />
          <OrbitPromptOverlay />
          <SmartCloseFlowSheet />
          <GlobalSearchTrigger />
        </Suspense>
    </AppLockGuardShell>
    </DeferredServicesProvider>
    <Suspense fallback={null}><GlobalOverlayRenderer /></Suspense>
    <Suspense fallback={null}><InAppNavigationView /></Suspense>
    </SplashScreen>
    </AuthProvider>
  </CoreProviders>
);

export default App;
