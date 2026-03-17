import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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
const ShopPage = safeLazy(() => import("./pages/ShopPage"), "ShopPage");
const MyShopPage = safeLazy(() => import("./pages/MyShopPage"), "MyShopPage");
const DiscoverPage = safeLazy(() => import("./pages/DiscoverPage"), "DiscoverPage");
const OpsCenter = safeLazy(() => import("./pages/OpsCenter"), "OpsCenter");
const ShopsPage = safeLazy(() => import("./pages/ShopsPage"), "ShopsPage");
const MyOrdersPage = safeLazy(() => import("./pages/MyOrdersPage"), "MyOrdersPage");
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

// City sub-page wrappers
const CityServicesPage = () => <CityHubPage subPage="services" />;
const CityActivitiesPage = () => <CityHubPage subPage="activities" />;
const CityConciergePage = () => <CityHubPage subPage="concierge" />;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min cache
      gcTime: 10 * 60 * 1000,   // 10 min garbage collection
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
      <BrowserRouter>
        <AuthProvider>
          <CallProvider>
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

              {/* Discovery */}
              <Route path="/explore" element={<Explore />} />
              <Route path="/properties" element={<PropertiesShowcase />} />
              <Route path="/properties/:slug" element={<PublicRealEstateListing />} />
              <Route path="/property/:slug" element={<PublicRealEstateListing />} />

              {/* Public listings */}
              <Route path="/listing/:slug" element={<PublicListing />} />
              <Route path="/r/:country/:city/:propertySlug" element={<PublicListing />} />
              <Route path="/rentals" element={<RentalCatalog />} />
              <Route path="/rentals/:country" element={<RentalCatalog />} />
              <Route path="/rentals/:country/:city" element={<RentalCatalog />} />
              <Route path="/host/:hostSlug" element={<HostCatalog />} />
              <Route path="/guest" element={<GuestPortal />} />
              <Route path="/book/:slug" element={<PublicServiceBooking />} />
              <Route path="/showcase/:orgSlug" element={<ProviderStorefront />} />
              <Route path="/store/:storeSlug" element={<StorePage />} />
              <Route path="/s/:shopSlug" element={<ShopPage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/shops" element={<ShopsPage />} />
              <Route path="/search" element={<DiscoverPage />} />
              <Route path="/trending" element={<DiscoverPage />} />
              <Route path="/nearby" element={<DiscoverPage />} />
              <Route path="/top-rated" element={<DiscoverPage />} />
              <Route path="/landlord/:slug" element={<LandlordProfile />} />
              <Route path="/agency/:accountSlug" element={<AccountShowcase />} />
              <Route path="/agency/:accountSlug/:slug" element={<PublicRealEstateListing />} />
              <Route path="/install" element={<Install />} />
              <Route path="/saved" element={<SavedListings />} />
              <Route path="/cv-generator" element={<CVGenerator />} />
              <Route path="/category-notifications" element={<CategorySubscriptions />} />
               <Route path="/vision" element={<PlatformVision />} />
               <Route path="/my-orders" element={<MyOrdersPage />} />
               <Route path="/pos" element={<POSPage />} />

              {/* SEO landing pages */}
              <Route path="/property-management" element={<PropertyManagement />} />
              <Route path="/rental-management" element={<PropertyManagement />} />
              <Route path="/landlord-software" element={<PropertyManagement />} />
              <Route path="/long-term-rentals" element={<LongTermRentalsPage />} />
              <Route path="/property-owner-software" element={<CoreSEOPages />} />
              <Route path="/property-management-platform" element={<PropertyManagementPlatformPage />} />
              <Route path="/rental-management-software" element={<RentalManagementSoftwarePage />} />
              <Route path="/concierge-services" element={<ConciergeServicesPage />} />
              <Route path="/marketplace-services" element={<MarketplaceServicesPage />} />
              <Route path="/seasonal-rentals" element={<SeasonalRentalsPage />} />

              {/* Programmatic SEO */}
              <Route path="/locations" element={<LocationsPage />} />
              <Route path="/country/:country" element={<CountryHubPage />} />
              <Route path="/city/:city" element={<CityHubPage />} />
              <Route path="/city/:city/services" element={<CityServicesPage />} />
              <Route path="/city/:city/activities" element={<CityActivitiesPage />} />
              <Route path="/city/:city/concierge" element={<CityConciergePage />} />
              <Route path="/services" element={<ServicesHubPage />} />
              <Route path="/services/:service" element={<ServiceCategoryPage />} />
              <Route path="/services/:service/:city" element={<ServiceCityPage />} />
              <Route path="/marketplace" element={<MarketplaceHubPage />} />
              <Route path="/marketplace/:city" element={<MarketplaceCityPage />} />
              <Route path="/marketplace/:service/:city" element={<MarketplaceServiceCityPage />} />
              <Route path="/provider/:providerSlug" element={<ProviderSEOPage />} />
              <Route path="/activities" element={<ActivitiesPage />} />
              <Route path="/activities/:activityCity" element={<ActivityCitySEOPage />} />

              {/* Clean URL resolvers */}
              <Route path="/:slug" element={<SlugResolver />} />
              <Route path="/:slug/:category" element={<SlugCategoryResolver />} />

              {/* Legal */}
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/cookies" element={<CookiePage />} />
              <Route path="/legal-notice" element={<LegalNoticePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/help" element={<HelpPage />} />

              {/* Protected — Landlord */}
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/country/:code" element={<ProtectedRoute><CountryWorkspace /></ProtectedRoute>} />
              <Route path="/dashboard/add-property" element={<ProtectedRoute><AddProperty /></ProtectedRoute>} />
              <Route path="/dashboard/create-listing" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
              {/* receipts moved below with CountryGuard */}
              <Route path="/dashboard/reminders" element={<ProtectedRoute><CountryGuard><Reminders /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/documents" element={<ProtectedRoute><CountryGuard><Documents /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
              <Route path="/dashboard/leases" element={<ProtectedRoute><CountryGuard><Leases /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/company" element={<ProtectedRoute><Company /></ProtectedRoute>} />
              <Route path="/dashboard/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
              <Route path="/dashboard/tenants" element={<ProtectedRoute><CountryGuard><Tenants /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/properties" element={<ProtectedRoute><RentalManagement /></ProtectedRoute>} />
              <Route path="/dashboard/rental" element={<ProtectedRoute><CountryGuard><RentalManagement /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/property/:propertyId" element={<ProtectedRoute><PropertyDetailHub /></ProtectedRoute>} />
              <Route path="/dashboard/finances" element={<ProtectedRoute><CountryGuard><Finances /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/wallet" element={<ProtectedRoute><WalletHub /></ProtectedRoute>} />
              <Route path="/dashboard/tasks" element={<ProtectedRoute><CountryGuard><Tasks /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/interventions" element={<ProtectedRoute><CountryGuard><Interventions /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/dashboard/communication" element={<ProtectedRoute><CommunicationCenter /></ProtectedRoute>} />
              <Route path="/dashboard/charges" element={<ProtectedRoute><CountryGuard><ChargesRegularization /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/fiscal" element={<ProtectedRoute><CountryGuard><FiscalReport /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/expenses" element={<ProtectedRoute><CountryGuard><Expenses /></CountryGuard></ProtectedRoute>} />
              {/* Candidates route removed */}
              <Route path="/dashboard/seasonal" element={<ProtectedRoute><SeasonalRentals /></ProtectedRoute>} />
              <Route path="/dashboard/notices" element={<ProtectedRoute><CountryGuard><PaymentNotices /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/receipts" element={<ProtectedRoute><CountryGuard><Receipts /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/dunning" element={<ProtectedRoute><CountryGuard><DunningLetters /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/furniture" element={<ProtectedRoute><CountryGuard><FurnitureInventory /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/buildings" element={<ProtectedRoute><CountryGuard><Buildings /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/dashboard/vault" element={<ProtectedRoute><CountryGuard><Vault /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/import" element={<ProtectedRoute><DataImport /></ProtectedRoute>} />
              <Route path="/dashboard/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
              <Route path="/dashboard/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/ai-quality" element={<ProtectedRoute><AIQualityDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/channel-manager" element={<ProtectedRoute><ChannelManager /></ProtectedRoute>} />
              <Route path="/dashboard/accounting" element={<ProtectedRoute><CountryGuard><Accounting /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/reporting" element={<ProtectedRoute><ReportingDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/pricing" element={<ProtectedRoute><DynamicPricing /></ProtectedRoute>} />
              <Route path="/dashboard/marketplace" element={<ProtectedRoute><ActivitiesMarketplace /></ProtectedRoute>} />
              <Route path="/dashboard/collaboration" element={<ProtectedRoute><Collaboration /></ProtectedRoute>} />
              <Route path="/dashboard/developers" element={<ProtectedRoute><DeveloperPortal /></ProtectedRoute>} />
              <Route path="/dashboard/audit" element={<ProtectedRoute><AuditTrail /></ProtectedRoute>} />
              <Route path="/dashboard/deals" element={<ProtectedRoute><DealAnalyticsPage /></ProtectedRoute>} />
              <Route path="/dashboard/tracking" element={<ProtectedRoute><ServiceTrackingPage /></ProtectedRoute>} />
              
              <Route path="/dashboard/seller" element={<ProtectedRoute><SellerHubPage /></ProtectedRoute>} />
              <Route path="/dashboard/my-shop" element={<ProtectedRoute><MyShopPage /></ProtectedRoute>} />
              <Route path="/business/ops" element={<ProtectedRoute><OpsCenter /></ProtectedRoute>} />
              <Route path="/dashboard/ops" element={<ProtectedRoute><OpsCenter /></ProtectedRoute>} />
              <Route path="/dashboard/driver" element={<ProtectedRoute><DriverDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/activities" element={<ProtectedRoute><ActivitiesMarketplace /></ProtectedRoute>} />
              <Route path="/dashboard/calendar" element={<ProtectedRoute><PropertyCalendar /></ProtectedRoute>} />
              <Route path="/dashboard/real-estate" element={<ProtectedRoute><RealEstateListings /></ProtectedRoute>} />

              {/* Protected — Tenant portal */}
              <Route path="/tenant" element={<ProtectedRoute><TenantDashboard /></ProtectedRoute>} />
              <Route path="/tenant/receipts" element={<ProtectedRoute><TenantReceipts /></ProtectedRoute>} />
              <Route path="/tenant/documents" element={<ProtectedRoute><TenantDocuments /></ProtectedRoute>} />
              <Route path="/tenant/messages" element={<ProtectedRoute><TenantMessages /></ProtectedRoute>} />
              <Route path="/tenant/pay" element={<ProtectedRoute><TenantPay /></ProtectedRoute>} />
              <Route path="/tenant/settings" element={<ProtectedRoute><TenantSettings /></ProtectedRoute>} />
              <Route path="/tenant/reviews" element={<ProtectedRoute><TenantReviews /></ProtectedRoute>} />
              <Route path="/tenant/requests" element={<ProtectedRoute><TenantRequests /></ProtectedRoute>} />

              {/* Protected — Client portal */}
              <Route path="/client" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
              <Route path="/client/bookings" element={<ProtectedRoute><ClientBookings /></ProtectedRoute>} />
              <Route path="/client/messages" element={<ProtectedRoute><ClientMessages /></ProtectedRoute>} />
              <Route path="/client/documents" element={<ProtectedRoute><ClientDocuments /></ProtectedRoute>} />
              <Route path="/client/payments" element={<ProtectedRoute><ClientPayments /></ProtectedRoute>} />
              <Route path="/client/settings" element={<ProtectedRoute><ClientSettings /></ProtectedRoute>} />

              {/* ══════ ORBIT APP ══════ */}
              <Route path="/app" element={<ProtectedRoute><OrbitAppShell /></ProtectedRoute>}>
                <Route path="orbit" element={<OrbitHome />} />
              </Route>

              {/* Catch-all — legacy SEO + 404 */}
              <Route path="*" element={<SEOCatchAll />} />
            </Routes>
            </main>
            <SmartInstallBanner />
          </Suspense>
           </AppLockGuard>
          </CallProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
  </ThemeProvider>
  </ErrorBoundary>
);

export default App;
