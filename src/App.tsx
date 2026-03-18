import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CallProvider } from "@/components/call/CallProvider";
import { useOrbitSessionInit } from "@/hooks/useOrbitSessionInit";
import { useRealtimeHub } from "@/hooks/useRealtimeHub";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "next-themes";
import { Suspense, lazy, type ComponentType } from "react";
import { Loader2 } from "lucide-react";
import AppLockGuard from "@/components/security/AppLockGuard";
import UpdateNotification from "@/components/UpdateNotification";
import { SkipLink } from "@/components/ui/a11y";
import SmartInstallBanner from "@/components/pwa/SmartInstallBanner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import CountryGuard from "@/components/dashboard/CountryGuard";
import { UnifiedPaymentProvider } from "@/payments/UnifiedPaymentSystem";

// Safe lazy wrapper that catches chunk failures + missing default export issues
function safeLazy(factory: () => Promise<{ default: ComponentType<any> }>, name: string) {
  return lazy(async () => {
    try {
      const mod = await factory();
      if (!mod?.default) {
        throw new Error(`[lazy] Missing default export for ${name}`);
      }
      return mod;
    } catch (err) {
      console.error(`[lazy] Failed to load chunk: ${name}`, err);
      return {
        default: () => (
          <div className="p-8 text-center text-destructive">
            Failed to load {name}. <button onClick={() => window.location.reload()} className="underline ml-2">Reload</button>
          </div>
        ),
      } as { default: ComponentType<any> };
    }
  });
}

const Explore = safeLazy(() => import("./pages/Explore"), "Explore");

// Lazy load all pages
const Index = safeLazy(() => import("./pages/Index"), "Index");
const Login = safeLazy(() => import("./pages/Login"), "Login");
const Signup = safeLazy(() => import("./pages/Signup"), "Signup");
const ForgotPassword = safeLazy(() => import("./pages/ForgotPassword"), "ForgotPassword");
const ResetPassword = safeLazy(() => import("./pages/ResetPassword"), "ResetPassword");
const VerifyEmail = safeLazy(() => import("./pages/VerifyEmail"), "VerifyEmail");
const Onboarding = safeLazy(() => import("./pages/Onboarding"), "Onboarding");
const Dashboard = safeLazy(() => import("./pages/Dashboard"), "Dashboard");
const Receipts = safeLazy(() => import("./pages/Receipts"), "Receipts");
const Reminders = safeLazy(() => import("./pages/Reminders"), "Reminders");
const Documents = safeLazy(() => import("./pages/Documents"), "Documents");
const AIAssistant = safeLazy(() => import("./pages/AIAssistant"), "AIAssistant");
const Leases = safeLazy(() => import("./pages/Leases"), "Leases");
const Company = safeLazy(() => import("./pages/Company"), "Company");
const Billing = safeLazy(() => import("./pages/Billing"), "Billing");
const Settings = safeLazy(() => import("./pages/Settings"), "Settings");
const Tenants = safeLazy(() => import("./pages/Tenants"), "Tenants");
const RentalManagement = safeLazy(() => import("./pages/RentalManagement"), "RentalManagement");
const Finances = safeLazy(() => import("./pages/Finances"), "Finances");
const Interventions = safeLazy(() => import("./pages/Interventions"), "Interventions");

const Tasks = safeLazy(() => import("./pages/Tasks"), "Tasks");
const Messages = safeLazy(() => import("./pages/Messages"), "Messages");
const CommunicationCenter = safeLazy(() => import("./pages/CommunicationCenter"), "CommunicationCenter");
const ChargesRegularization = safeLazy(() => import("./pages/ChargesRegularization"), "ChargesRegularization");
const FiscalReport = safeLazy(() => import("./pages/FiscalReport"), "FiscalReport");
const Expenses = safeLazy(() => import("./pages/Expenses"), "Expenses");
const Candidates = safeLazy(() => import("./pages/Candidates"), "Candidates");
const SeasonalRentals = safeLazy(() => import("./pages/SeasonalRentals"), "SeasonalRentals");
const PaymentNotices = safeLazy(() => import("./pages/PaymentNotices"), "PaymentNotices");
const DunningLetters = safeLazy(() => import("./pages/DunningLetters"), "DunningLetters");
const FurnitureInventory = safeLazy(() => import("./pages/FurnitureInventory"), "FurnitureInventory");
const Buildings = safeLazy(() => import("./pages/Buildings"), "Buildings");
const Vault = safeLazy(() => import("./pages/Vault"), "Vault");
const NotFound = safeLazy(() => import("./pages/NotFound"), "NotFound");
const DataImport = safeLazy(() => import("./pages/DataImport"), "DataImport");
const TenantDashboard = safeLazy(() => import("./pages/tenant/TenantDashboard"), "TenantDashboard");
const TenantReceipts = safeLazy(() => import("./pages/tenant/TenantReceipts"), "TenantReceipts");
const TenantDocuments = safeLazy(() => import("./pages/tenant/TenantDocuments"), "TenantDocuments");
const TenantMessages = safeLazy(() => import("./pages/tenant/TenantMessages"), "TenantMessages");
const TenantPay = safeLazy(() => import("./pages/tenant/TenantPay"), "TenantPay");
const TenantSettings = safeLazy(() => import("./pages/tenant/TenantSettings"), "TenantSettings");
const TenantSignup = safeLazy(() => import("./pages/TenantSignup"), "TenantSignup");
const TenantReviews = safeLazy(() => import("./pages/tenant/TenantReviews"), "TenantReviews");
const TenantRequests = safeLazy(() => import("./pages/tenant/TenantRequests"), "TenantRequests");
const PublicListing = safeLazy(() => import("./pages/PublicListing"), "PublicListing");
const PublicServiceBooking = safeLazy(() => import("./pages/PublicServiceBooking"), "PublicServiceBooking");
const PropertyManagement = safeLazy(() => import("./pages/PropertyManagement"), "PropertyManagement");
const LandlordProfile = safeLazy(() => import("./pages/LandlordProfile"), "LandlordProfile");
const Referrals = safeLazy(() => import("./pages/Referrals"), "Referrals");
const AdminDashboard = safeLazy(() => import("./pages/AdminDashboard"), "AdminDashboard");
const AIQualityDashboard = safeLazy(() => import("./pages/AIQualityDashboard"), "AIQualityDashboard");
const Install = safeLazy(() => import("./pages/Install"), "Install");
const SavedListings = safeLazy(() => import("./pages/SavedListings"), "SavedListings");
const CVGenerator = safeLazy(() => import("./pages/CVGenerator"), "CVGenerator");
const CategorySubscriptions = safeLazy(() => import("./pages/CategorySubscriptions"), "CategorySubscriptions");
const ChannelManager = safeLazy(() => import("./pages/ChannelManager"), "ChannelManager");
const Accounting = safeLazy(() => import("./pages/Accounting"), "Accounting");
const LandlordRentDashboard = safeLazy(() => import("./pages/LandlordRentDashboard"), "LandlordRentDashboard");
const AccountingEntries = safeLazy(() => import("./pages/AccountingEntries"), "AccountingEntries");
const ReportingDashboard = safeLazy(() => import("./pages/ReportingDashboard"), "ReportingDashboard");
const DynamicPricing = safeLazy(() => import("./pages/DynamicPricing"), "DynamicPricing");
const PropertyCalendar = safeLazy(() => import("./pages/PropertyCalendar"), "PropertyCalendar");
const RealEstateListings = safeLazy(() => import("./pages/RealEstateListings"), "RealEstateListings");
const PublicRealEstateListing = safeLazy(() => import("./pages/PublicRealEstateListing"), "PublicRealEstateListing");
const PropertiesShowcase = safeLazy(() => import("./pages/PropertiesShowcase"), "PropertiesShowcase");
const AccountShowcase = safeLazy(() => import("./pages/AccountShowcase"), "AccountShowcase");

const ClientDashboard = safeLazy(() => import("./pages/client/ClientDashboard"), "ClientDashboard");
const ClientBookings = safeLazy(() => import("./pages/client/ClientBookings"), "ClientBookings");
const ClientMessages = safeLazy(() => import("./pages/client/ClientMessages"), "ClientMessages");
const ClientDocuments = safeLazy(() => import("./pages/client/ClientDocuments"), "ClientDocuments");
const ClientPayments = safeLazy(() => import("./pages/client/ClientPayments"), "ClientPayments");
const ClientSettings = safeLazy(() => import("./pages/client/ClientSettings"), "ClientSettings");

const Collaboration = safeLazy(() => import("./pages/Collaboration"), "Collaboration");
const DeveloperPortal = safeLazy(() => import("./pages/DeveloperPortal"), "DeveloperPortal");
const AuditTrail = safeLazy(() => import("./pages/AuditTrail"), "AuditTrail");
const CountryWorkspace = safeLazy(() => import("./pages/CountryWorkspace"), "CountryWorkspace");

// Orbit App Shell & Home
const OrbitAppShell = safeLazy(() => import("./components/orbit/OrbitAppShell"), "OrbitAppShell");
const OrbitHome = safeLazy(() => import("./pages/OrbitHome"), "OrbitHome");
const WalletHub = safeLazy(() => import("./pages/WalletHub"), "WalletHub");
const AddProperty = safeLazy(() => import("./pages/AddProperty"), "AddProperty");
const PropertyDetailHub = safeLazy(() => import("./pages/PropertyDetailHub"), "PropertyDetailHub");
const CreateListing = safeLazy(() => import("./pages/CreateListing"), "CreateListing");
const LocalServices = safeLazy(() => import("./pages/LocalServices"), "LocalServices");
const RentalCatalog = safeLazy(() => import("./pages/RentalCatalog"), "RentalCatalog");
const StaysCatalog = safeLazy(() => import("./pages/StaysCatalog"), "StaysCatalog");
const HostCatalog = safeLazy(() => import("./pages/HostCatalog"), "HostCatalog");
const ActivitiesMarketplace = safeLazy(() => import("./pages/ActivitiesMarketplace"), "ActivitiesMarketplace");
const GuestPortal = safeLazy(() => import("./pages/GuestPortal"), "GuestPortal");
const ProviderStorefront = safeLazy(() => import("./components/marketplace/ProviderStorefront"), "ProviderStorefront");
const StorePage = safeLazy(() => import("./pages/StorePage"), "StorePage");
const ShopCategoryPage = safeLazy(() => import("./pages/ShopCategoryPage"), "ShopCategoryPage");
// Legal pages
const TermsPage = safeLazy(() => import("./pages/legal/TermsPage"), "TermsPage");
const PrivacyPage = safeLazy(() => import("./pages/legal/PrivacyPage"), "PrivacyPage");
const CookiePage = safeLazy(() => import("./pages/legal/CookiePage"), "CookiePage");
const LegalNoticePage = safeLazy(() => import("./pages/legal/LegalNoticePage"), "LegalNoticePage");
const AboutPage = safeLazy(() => import("./pages/legal/AboutPage"), "AboutPage");
const ContactPage = safeLazy(() => import("./pages/legal/ContactPage"), "ContactPage");
const HelpPage = safeLazy(() => import("./pages/legal/HelpPage"), "HelpPage");
const PlatformVision = safeLazy(() => import("./pages/PlatformVision"), "PlatformVision");
const DealAnalyticsPage = safeLazy(() => import("./pages/DealAnalyticsPage"), "DealAnalyticsPage");
const ServiceTrackingPage = safeLazy(() => import("./pages/ServiceTrackingPage"), "ServiceTrackingPage");
const SellerHubPage = safeLazy(() => import("./pages/SellerHubPage"), "SellerHubPage");
const DriverDashboard = safeLazy(() => import("./pages/DriverDashboard"), "DriverDashboard");
const DeliveryCommandCenter = safeLazy(() => import("./pages/DeliveryCommandCenter"), "DeliveryCommandCenter");
const ShopPage = safeLazy(() => import("./pages/ShopPage"), "ShopPage");
const MyShopPage = safeLazy(() => import("./pages/MyShopPage"), "MyShopPage");
const DiscoverPage = safeLazy(() => import("./pages/DiscoverPage"), "DiscoverPage");
const OpsCenter = safeLazy(() => import("./pages/OpsCenter"), "OpsCenter");
const ShopsPage = safeLazy(() => import("./pages/ShopsPage"), "ShopsPage");
const SuperMapRadarPage = safeLazy(() => import("./pages/SuperMapRadarPage"), "SuperMapRadarPage");
const MyBusinessHub = safeLazy(() => import("./pages/MyBusinessHub"), "MyBusinessHub");
const MyShopsPage = safeLazy(() => import("./pages/MyShopsPage"), "MyShopsPage");
const MyOrdersPage = safeLazy(() => import("./pages/MyOrdersPage"), "MyOrdersPage");
const UnifiedOrderDetailPage = safeLazy(() => import("./pages/UnifiedOrderDetailPage"), "UnifiedOrderDetailPage");
const POSPage = safeLazy(() => import("./pages/POSPage"), "POSPage");
const PropertyManagementHub = safeLazy(() => import("./pages/PropertyManagementHub"), "PropertyManagementHub");
const ConciergeServicesPage = safeLazy(() => import("./pages/seo/ConciergeServicesPage"), "ConciergeServicesPage");
const MarketplaceServicesPage = safeLazy(() => import("./pages/seo/MarketplaceServicesPage"), "MarketplaceServicesPage");
const ActivitiesPage = safeLazy(() => import("./pages/seo/ActivitiesPage"), "ActivitiesPage");
const SeasonalRentalsPage = safeLazy(() => import("./pages/seo/SeasonalRentalsPage"), "SeasonalRentalsPage");
// SEO Layer pages
const SEOCatchAll = safeLazy(() => import("./pages/seo/SEOCatchAll"), "SEOCatchAll");
const LongTermRentalsPage = safeLazy(() => import("./pages/seo/LongTermRentalsPage"), "LongTermRentalsPage");
const ServiceCitySEOPage = safeLazy(() => import("./pages/seo/ServiceCitySEOPage"), "ServiceCitySEOPage");
const ActivityCitySEOPage = safeLazy(() => import("./pages/seo/ActivityCitySEOPage"), "ActivityCitySEOPage");
const CoreSEOPages = safeLazy(() => import("./pages/seo/CoreSEOPages").then(m => ({ default: m.PropertyOwnerSoftwarePage })), "CoreSEOPages");
const PropertyManagementPlatformPage = safeLazy(() => import("./pages/seo/CoreSEOPages").then(m => ({ default: m.PropertyManagementPlatformPage })), "PropertyManagementPlatformPage");
const RentalManagementSoftwarePage = safeLazy(() => import("./pages/seo/CoreSEOPages").then(m => ({ default: m.RentalManagementSoftwarePage })), "RentalManagementSoftwarePage");
// Programmatic SEO pages
const LocationsPage = safeLazy(() => import("./pages/seo/LocationsPage"), "LocationsPage");
const CountryHubPage = safeLazy(() => import("./pages/seo/CountryHubPage"), "CountryHubPage");
const CityHubPage = safeLazy(() => import("./pages/seo/CityHubPage"), "CityHubPage");
const MarketplaceHubPage = safeLazy(() => import("./pages/seo/MarketplaceCityPage").then(m => ({ default: m.MarketplaceHubPage })), "MarketplaceHubPage");
const MarketplaceCityPage = safeLazy(() => import("./pages/seo/MarketplaceCityPage").then(m => ({ default: m.MarketplaceCityPage })), "MarketplaceCityPage");
const MarketplaceServiceCityPage = safeLazy(() => import("./pages/seo/MarketplaceCityPage").then(m => ({ default: m.MarketplaceServiceCityPage })), "MarketplaceServiceCityPage");
const ServicesHubPage = safeLazy(() => import("./pages/seo/ServiceHubPage").then(m => ({ default: m.ServicesHubPage })), "ServicesHubPage");
const ServiceCategoryPage = safeLazy(() => import("./pages/seo/ServiceHubPage").then(m => ({ default: m.ServiceCategoryPage })), "ServiceCategoryPage");
const ServiceCityPage = safeLazy(() => import("./pages/seo/ServiceHubPage").then(m => ({ default: m.ServiceCityPage })), "ServiceCityPage");
const ProviderSEOPage = safeLazy(() => import("./pages/seo/ProviderSEOPage"), "ProviderSEOPage");
const SlugResolver = safeLazy(() => import("./pages/seo/SEOShortUrlResolver").then(m => ({ default: m.SlugResolver })), "SlugResolver");
const SlugCategoryResolver = safeLazy(() => import("./pages/seo/SEOShortUrlResolver").then(m => ({ default: m.SlugCategoryResolver })), "SlugCategoryResolver");
// Ride & Send universes
const RidePage = safeLazy(() => import("./pages/RidePage"), "RidePage");
const SendPage = safeLazy(() => import("./pages/SendPage"), "SendPage");
const TrackRidePage = safeLazy(() => import("./pages/TrackRidePage"), "TrackRidePage");
const PayRidePage = safeLazy(() => import("./pages/PayRidePage"), "PayRidePage");
const RideReceiptPage = safeLazy(() => import("./pages/RideReceiptPage"), "RideReceiptPage");
const RideCompletePage = safeLazy(() => import("./pages/RideCompletePage"), "RideCompletePage");
const CallDriverPage = safeLazy(() => import("./pages/CallDriverPage"), "CallDriverPage");
const DriverPayoutPage = safeLazy(() => import("./pages/DriverPayoutPage"), "DriverPayoutPage");
const AdminDisputesPage = safeLazy(() => import("./pages/AdminDisputesPage"), "AdminDisputesPage");
const DemandHeatmapPage = safeLazy(() => import("./pages/DemandHeatmapPage"), "DemandHeatmapPage");
const AdminFraudPage = safeLazy(() => import("./pages/AdminFraudPage"), "AdminFraudPage");
const AdminLiveOpsPage = safeLazy(() => import("./pages/AdminLiveOpsPage"), "AdminLiveOpsPage");
const DriverPositioningPage = safeLazy(() => import("./pages/DriverPositioningPage"), "DriverPositioningPage");
const RiderPrioritySubscriptionPage = safeLazy(() => import("./pages/RiderPrioritySubscriptionPage"), "RiderPrioritySubscriptionPage");
const AdminDispatchBoardPage = safeLazy(() => import("./pages/AdminDispatchBoardPage"), "AdminDispatchBoardPage");
const AdminSLAPage = safeLazy(() => import("./pages/AdminSLAPage"), "AdminSLAPage");
const RefundRequestPage = safeLazy(() => import("./pages/RefundRequestPage"), "RefundRequestPage");
const OrbitLiveCallPage = safeLazy(() => import("./pages/OrbitLiveCallPage"), "OrbitLiveCallPage");
const TeamCommandCenterPage = safeLazy(() => import("./pages/TeamCommandCenterPage"), "TeamCommandCenterPage");
const AdminTrustGraphPage = safeLazy(() => import("./pages/AdminTrustGraphPage"), "AdminTrustGraphPage");
const ExecutiveKPIBoardPage = safeLazy(() => import("./pages/ExecutiveKPIBoardPage"), "ExecutiveKPIBoardPage");
const TeamPermissionsPage = safeLazy(() => import("./pages/TeamPermissionsPage"), "TeamPermissionsPage");
const AIOpsChatPage = safeLazy(() => import("./pages/AIOpsChatPage"), "AIOpsChatPage");
const FinancialReconPage = safeLazy(() => import("./pages/FinancialReconPage"), "FinancialReconPage");
const ReconAlertsPage = safeLazy(() => import("./pages/ReconAlertsPage"), "ReconAlertsPage");
const CallSessionPage = safeLazy(() => import("./pages/CallSessionPage"), "CallSessionPage");

// Travel universe
const TravelHub = safeLazy(() => import("./pages/travel/TravelHub"), "TravelHub");
const TravelFlights = safeLazy(() => import("./pages/travel/TravelFlights"), "TravelFlights");
const TravelStays = safeLazy(() => import("./pages/travel/TravelStays"), "TravelStays");
const TravelHotelDetail = safeLazy(() => import("./pages/travel/TravelHotelDetail"), "TravelHotelDetail");
const TravelStayDetail = safeLazy(() => import("./pages/travel/TravelStayDetail"), "TravelStayDetail");
const TravelFlightDetail = safeLazy(() => import("./pages/travel/TravelFlightDetail"), "TravelFlightDetail");

// Universe hubs
const FoodHub = safeLazy(() => import("./pages/universe/FoodHub"), "FoodHub");
const GroceryHub = safeLazy(() => import("./pages/universe/GroceryHub"), "GroceryHub");
const ServicesHub = safeLazy(() => import("./pages/universe/ServicesHub"), "ServicesHub");

// Deep-link public pages
const UserProfilePage = safeLazy(() => import("./pages/deep-link/UserProfilePage"), "UserProfilePage");
const ProductPage = safeLazy(() => import("./pages/deep-link/ProductPage"), "ProductPage");
const LivePage = safeLazy(() => import("./pages/deep-link/LivePage"), "LivePage");
const PayPage = safeLazy(() => import("./pages/deep-link/PayPage"), "PayPage");
const QrPayResolver = safeLazy(() => import("./pages/deep-link/QrPayResolver"), "QrPayResolver");
const QrResolvePage = safeLazy(() => import("./pages/deep-link/QrResolvePage"), "QrResolvePage");
const PayRequestPage = safeLazy(() => import("./pages/deep-link/PayRequestPage"), "PayRequestPage");
const QrScannerPage = safeLazy(() => import("./pages/payments/QrScannerPage"), "QrScannerPage");
const GuestPaymentSuccess = safeLazy(() => import("./pages/deep-link/GuestPaymentSuccess"), "GuestPaymentSuccess");

// City sub-page wrappers
const CityServicesPage = () => <CityHubPage subPage="services" />;
const CityActivitiesPage = () => <CityHubPage subPage="activities" />;
const CityConciergePage = () => <CityHubPage subPage="concierge" />;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Expose query client globally for platform bus reactions
(window as any).__REACT_QUERY_CLIENT__ = queryClient;

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-primary/20 overflow-hidden">
      <div className="h-full bg-primary animate-[loader-slide_0.8s_ease-in-out_infinite]" />
    </div>
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    <style>{`@keyframes loader-slide{0%{width:0;margin-left:0}50%{width:50%;margin-left:25%}100%{width:0;margin-left:100%}}`}</style>
  </div>
);

const seoPublicPrefixes = [
  "/book/", "/listing/", "/host/", "/provider/", "/showcase/", "/store/", "/shop/",
  "/services/", "/activities/", "/locations", "/country/", "/city/", "/marketplace",
  "/explore", "/properties",
];

/** Registers device session + suspicious login detection */
const OrbitSessionGuard = () => { useOrbitSessionInit(); return null; };
/** Centralized realtime: replaces usePresence, useOrbitCallSync, RealtimeMessageToast */
const RealtimeHubGuard = () => { useRealtimeHub(); return null; };

const App = () => (
  <ErrorBoundary>
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false} storageKey="easylocs-theme">
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* NOTE: HashRouter is now in main.tsx — no BrowserRouter here */}
        <AuthProvider>
           <CallProvider>
          <UnifiedPaymentProvider>
           <AppLockGuard>
           <OrbitSessionGuard />
           <RealtimeHubGuard />
           <UpdateNotification />
          
           <SkipLink />
           <Suspense fallback={<PageLoader />}>
            <main id="main-content">
            <Routes>
              {/* ══════ PUBLIC WEBSITE ══════ */}
              {/* Homepage */}
              <Route path="/" element={<Index />} />

              {/* Auth */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/tenant-signup" element={<TenantSignup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/install" element={<Install />} />

              {/* Deep-link public pages */}
              <Route path="/u/:userId" element={<UserProfilePage />} />
              <Route path="/p/:productId" element={<ProductPage />} />
              <Route path="/live/:liveId" element={<LivePage />} />
              <Route path="/pay/:payId" element={<PayPage />} />
              <Route path="/pay/request/:requestId" element={<PayRequestPage />} />
              <Route path="/pay/scan" element={<QrScannerPage />} />
              <Route path="/pay/success" element={<GuestPaymentSuccess />} />
              <Route path="/qr/pay/:code" element={<QrPayResolver />} />
              <Route path="/qr/:code" element={<QrResolvePage />} />

              {/* V7 Public pillars */}
              {/* Redirects */}
              <Route path="/discover" element={<Navigate to="/" replace />} />
              <Route path="/search" element={<DiscoverPage />} />

              {/* Universe hubs */}
              <Route path="/food" element={<FoodHub />} />
              <Route path="/grocery" element={<GroceryHub />} />
              <Route path="/services-hub" element={<ServicesHub />} />
              <Route path="/ride" element={<RidePage />} />
              <Route path="/send" element={<SendPage />} />
              <Route path="/track/:rideRequestId" element={<TrackRidePage />} />
              <Route path="/wallet/pay/:threadId" element={<PayRidePage />} />
              <Route path="/ride/receipt/:rideRequestId" element={<RideReceiptPage />} />
              <Route path="/ride/complete/:rideRequestId" element={<RideCompletePage />} />
              <Route path="/call/:threadId" element={<CallDriverPage />} />
              <Route path="/driver/payout" element={<DriverPayoutPage />} />
              <Route path="/admin/disputes" element={<AdminDisputesPage />} />
              <Route path="/driver/heatmap" element={<DemandHeatmapPage />} />
              <Route path="/driver/positioning" element={<DriverPositioningPage />} />
              <Route path="/admin/fraud" element={<AdminFraudPage />} />
              <Route path="/admin/live-ops" element={<AdminLiveOpsPage />} />
              <Route path="/subscription/priority" element={<RiderPrioritySubscriptionPage />} />
              <Route path="/admin/dispatch-board" element={<AdminDispatchBoardPage />} />
              <Route path="/admin/sla" element={<AdminSLAPage />} />
              <Route path="/admin/trust-graph" element={<AdminTrustGraphPage />} />
              <Route path="/refund/:rideRequestId" element={<RefundRequestPage />} />
              <Route path="/orbit/call/:threadId" element={<OrbitLiveCallPage />} />
              <Route path="/team/command-center" element={<TeamCommandCenterPage />} />
              <Route path="/admin/executive-kpi" element={<ExecutiveKPIBoardPage />} />
              <Route path="/team/permissions" element={<TeamPermissionsPage />} />

              {/* Travel */}
              <Route path="/travel" element={<TravelHub />} />
              <Route path="/travel/flights" element={<TravelFlights />} />
              <Route path="/travel/stays" element={<TravelStays />} />
              <Route path="/travel/hotels" element={<Navigate to="/travel/stays" replace />} />
              <Route path="/travel/hotel/:id" element={<TravelHotelDetail />} />
              <Route path="/travel/stay/:id" element={<TravelStayDetail />} />
              <Route path="/travel/flight/:id" element={<TravelFlightDetail />} />

              <Route path="/explore" element={<Explore />} />
              <Route path="/super-map" element={<SuperMapRadarPage />} />
              <Route path="/shops" element={<ShopsPage />} />
              <Route path="/s/:slug" element={<ShopPage />} />
              <Route path="/s/:slug/:categorySlug" element={<ShopCategoryPage />} />
              <Route path="/business" element={<MyBusinessHub />} />
              <Route path="/property-hub" element={<PropertyManagementHub />} />
              <Route path="/pos" element={<POSPage />} />
              <Route path="/my-orders" element={<MyOrdersPage />} />
              <Route path="/order/:orderId" element={<UnifiedOrderDetailPage />} />

              {/* Marketplace & Listings */}
              <Route path="/listing/:id" element={<PublicListing />} />
              <Route path="/book/:slug" element={<PublicServiceBooking />} />
              <Route path="/nearby" element={<LocalServices />} />
              <Route path="/rentals" element={<Navigate to="/property/rent" replace />} />
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

              {/* Real Estate */}
              <Route path="/top-rated" element={<RealEstateListings />} />
              <Route path="/trending" element={<RealEstateListings />} />
              <Route path="/real-estate/:id" element={<PublicRealEstateListing />} />

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
              <Route path="/marketplace" element={<MarketplaceHubPage />} />
              <Route path="/marketplace/:citySlug" element={<MarketplaceCityPage />} />
              <Route path="/marketplace/:citySlug/:serviceSlug" element={<MarketplaceServiceCityPage />} />
              <Route path="/services" element={<ServicesHubPage />} />
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
              <Route path="/wallet" element={<ProtectedRoute><WalletHub /></ProtectedRoute>} />
              <Route path="/dashboard/deals" element={<ProtectedRoute><DealAnalyticsPage /></ProtectedRoute>} />
              <Route path="/dashboard/service-tracking" element={<ProtectedRoute><ServiceTrackingPage /></ProtectedRoute>} />
              <Route path="/dashboard/seller" element={<ProtectedRoute><SellerHubPage /></ProtectedRoute>} />
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

              {/* Orbit (Super-App Shell) */}
              <Route path="/app/orbit" element={<ProtectedRoute><OrbitAppShell><OrbitHome /></OrbitAppShell></ProtectedRoute>} />
              <Route path="/app/*" element={<ProtectedRoute><OrbitAppShell><OrbitHome /></OrbitAppShell></ProtectedRoute>} />

              {/* SEO catch-all */}
              <Route path="/seo/*" element={<SEOCatchAll />} />

              {/* Fallback */}
              <Route path="/index" element={<Index />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </main>
           </Suspense>
           <SmartInstallBanner />
           </AppLockGuard>
          </UnifiedPaymentProvider>
           </CallProvider>
        </AuthProvider>
    </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
  </ThemeProvider>
  </ErrorBoundary>
);

export default App;
