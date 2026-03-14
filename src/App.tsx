import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CallProvider } from "@/components/call/CallProvider";
import RealtimeMessageToast from "@/components/communication/RealtimeMessageToast";
import { useOrbitSessionInit } from "@/hooks/useOrbitSessionInit";
import { usePresence } from "@/hooks/usePresence";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "next-themes";
import { Suspense, lazy } from "react";
import AppLockGuard from "@/components/security/AppLockGuard";
import UpdateNotification from "@/components/UpdateNotification";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import CountryGuard from "@/components/dashboard/CountryGuard";
const Explore = lazy(() => import("./pages/Explore"));
import { Loader2 } from "lucide-react";

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Receipts = lazy(() => import("./pages/Receipts"));
const Reminders = lazy(() => import("./pages/Reminders"));
const Documents = lazy(() => import("./pages/Documents"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const Leases = lazy(() => import("./pages/Leases"));
const Company = lazy(() => import("./pages/Company"));
const Billing = lazy(() => import("./pages/Billing"));
const Settings = lazy(() => import("./pages/Settings"));
const Tenants = lazy(() => import("./pages/Tenants"));
const RentalManagement = lazy(() => import("./pages/RentalManagement"));
const Finances = lazy(() => import("./pages/Finances"));
const Interventions = lazy(() => import("./pages/Interventions"));

const Tasks = lazy(() => import("./pages/Tasks"));
const Messages = lazy(() => import("./pages/Messages"));
const CommunicationCenter = lazy(() => import("./pages/CommunicationCenter"));
const ChargesRegularization = lazy(() => import("./pages/ChargesRegularization"));
const FiscalReport = lazy(() => import("./pages/FiscalReport"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Candidates = lazy(() => import("./pages/Candidates"));
const SeasonalRentals = lazy(() => import("./pages/SeasonalRentals"));
const PaymentNotices = lazy(() => import("./pages/PaymentNotices"));
const DunningLetters = lazy(() => import("./pages/DunningLetters"));
const FurnitureInventory = lazy(() => import("./pages/FurnitureInventory"));
const Buildings = lazy(() => import("./pages/Buildings"));
const Vault = lazy(() => import("./pages/Vault"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DataImport = lazy(() => import("./pages/DataImport"));
const TenantDashboard = lazy(() => import("./pages/tenant/TenantDashboard"));
const TenantReceipts = lazy(() => import("./pages/tenant/TenantReceipts"));
const TenantDocuments = lazy(() => import("./pages/tenant/TenantDocuments"));
const TenantMessages = lazy(() => import("./pages/tenant/TenantMessages"));
const TenantPay = lazy(() => import("./pages/tenant/TenantPay"));
const TenantSettings = lazy(() => import("./pages/tenant/TenantSettings"));
const TenantSignup = lazy(() => import("./pages/TenantSignup"));
const TenantReviews = lazy(() => import("./pages/tenant/TenantReviews"));
const TenantRequests = lazy(() => import("./pages/tenant/TenantRequests"));
const PublicListing = lazy(() => import("./pages/PublicListing"));
const PublicServiceBooking = lazy(() => import("./pages/PublicServiceBooking"));
const PropertyManagement = lazy(() => import("./pages/PropertyManagement"));
const LandlordProfile = lazy(() => import("./pages/LandlordProfile"));
const Referrals = lazy(() => import("./pages/Referrals"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AIQualityDashboard = lazy(() => import("./pages/AIQualityDashboard"));
const Install = lazy(() => import("./pages/Install"));
const SavedListings = lazy(() => import("./pages/SavedListings"));
const CVGenerator = lazy(() => import("./pages/CVGenerator"));
const CategorySubscriptions = lazy(() => import("./pages/CategorySubscriptions"));
const ChannelManager = lazy(() => import("./pages/ChannelManager"));
const Accounting = lazy(() => import("./pages/Accounting"));
const DynamicPricing = lazy(() => import("./pages/DynamicPricing"));
const PropertyCalendar = lazy(() => import("./pages/PropertyCalendar"));
const RealEstateListings = lazy(() => import("./pages/RealEstateListings"));
const PublicRealEstateListing = lazy(() => import("./pages/PublicRealEstateListing"));
const PropertiesShowcase = lazy(() => import("./pages/PropertiesShowcase"));
const AccountShowcase = lazy(() => import("./pages/AccountShowcase"));

const ClientDashboard = lazy(() => import("./pages/client/ClientDashboard"));
const ClientBookings = lazy(() => import("./pages/client/ClientBookings"));
const ClientMessages = lazy(() => import("./pages/client/ClientMessages"));
const ClientDocuments = lazy(() => import("./pages/client/ClientDocuments"));
const ClientPayments = lazy(() => import("./pages/client/ClientPayments"));
const ClientSettings = lazy(() => import("./pages/client/ClientSettings"));

const Collaboration = lazy(() => import("./pages/Collaboration"));
const DeveloperPortal = lazy(() => import("./pages/DeveloperPortal"));
const AuditTrail = lazy(() => import("./pages/AuditTrail"));
const CountryWorkspace = lazy(() => import("./pages/CountryWorkspace"));

// Orbit App Shell & Home
const OrbitAppShell = lazy(() => import("./components/orbit/OrbitAppShell"));
const OrbitHome = lazy(() => import("./pages/OrbitHome"));
const AddProperty = lazy(() => import("./pages/AddProperty"));
const PropertyDetailHub = lazy(() => import("./pages/PropertyDetailHub"));
const CreateListing = lazy(() => import("./pages/CreateListing"));
const LocalServices = lazy(() => import("./pages/LocalServices"));
const RentalCatalog = lazy(() => import("./pages/RentalCatalog"));
const HostCatalog = lazy(() => import("./pages/HostCatalog"));
const ActivitiesMarketplace = lazy(() => import("./pages/ActivitiesMarketplace"));
const GuestPortal = lazy(() => import("./pages/GuestPortal"));
const ProviderStorefront = lazy(() => import("./components/marketplace/ProviderStorefront"));
const StorePage = lazy(() => import("./pages/StorePage"));
const ShopCategoryPage = lazy(() => import("./pages/ShopCategoryPage"));
// Legal pages
const TermsPage = lazy(() => import("./pages/legal/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/legal/PrivacyPage"));
const CookiePage = lazy(() => import("./pages/legal/CookiePage"));
const LegalNoticePage = lazy(() => import("./pages/legal/LegalNoticePage"));
const AboutPage = lazy(() => import("./pages/legal/AboutPage"));
const ContactPage = lazy(() => import("./pages/legal/ContactPage"));
const HelpPage = lazy(() => import("./pages/legal/HelpPage"));
const PlatformVision = lazy(() => import("./pages/PlatformVision"));
const ConciergeServicesPage = lazy(() => import("./pages/seo/ConciergeServicesPage"));
const MarketplaceServicesPage = lazy(() => import("./pages/seo/MarketplaceServicesPage"));
const ActivitiesPage = lazy(() => import("./pages/seo/ActivitiesPage"));
const SeasonalRentalsPage = lazy(() => import("./pages/seo/SeasonalRentalsPage"));
// SEO Layer pages
const SEOCatchAll = lazy(() => import("./pages/seo/SEOCatchAll"));
const LongTermRentalsPage = lazy(() => import("./pages/seo/LongTermRentalsPage"));
const ServiceCitySEOPage = lazy(() => import("./pages/seo/ServiceCitySEOPage"));
const ActivityCitySEOPage = lazy(() => import("./pages/seo/ActivityCitySEOPage"));
const CoreSEOPages = lazy(() => import("./pages/seo/CoreSEOPages").then(m => ({ default: m.PropertyOwnerSoftwarePage })));
const PropertyManagementPlatformPage = lazy(() => import("./pages/seo/CoreSEOPages").then(m => ({ default: m.PropertyManagementPlatformPage })));
const RentalManagementSoftwarePage = lazy(() => import("./pages/seo/CoreSEOPages").then(m => ({ default: m.RentalManagementSoftwarePage })));
// Programmatic SEO pages
const LocationsPage = lazy(() => import("./pages/seo/LocationsPage"));
const CountryHubPage = lazy(() => import("./pages/seo/CountryHubPage"));
const CityHubPage = lazy(() => import("./pages/seo/CityHubPage"));
const MarketplaceHubPage = lazy(() => import("./pages/seo/MarketplaceCityPage").then(m => ({ default: m.MarketplaceHubPage })));
const MarketplaceCityPage = lazy(() => import("./pages/seo/MarketplaceCityPage").then(m => ({ default: m.MarketplaceCityPage })));
const MarketplaceServiceCityPage = lazy(() => import("./pages/seo/MarketplaceCityPage").then(m => ({ default: m.MarketplaceServiceCityPage })));
const ServicesHubPage = lazy(() => import("./pages/seo/ServiceHubPage").then(m => ({ default: m.ServicesHubPage })));
const ServiceCategoryPage = lazy(() => import("./pages/seo/ServiceHubPage").then(m => ({ default: m.ServiceCategoryPage })));
const ServiceCityPage = lazy(() => import("./pages/seo/ServiceHubPage").then(m => ({ default: m.ServiceCityPage })));
const ProviderSEOPage = lazy(() => import("./pages/seo/ProviderSEOPage"));
const SlugResolver = lazy(() => import("./pages/seo/SEOShortUrlResolver").then(m => ({ default: m.SlugResolver })));
const SlugCategoryResolver = lazy(() => import("./pages/seo/SEOShortUrlResolver").then(m => ({ default: m.SlugCategoryResolver })));

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
const OrbitPresenceGuard = () => { usePresence(); return null; };

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
           <OrbitPresenceGuard />
           <RealtimeMessageToast />
           <UpdateNotification />
          
           <Suspense fallback={<PageLoader />}>
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
              <Route path="/shop/:categoryCity" element={<ShopCategoryPage />} />
              <Route path="/landlord/:slug" element={<LandlordProfile />} />
              <Route path="/agency/:accountSlug" element={<AccountShowcase />} />
              <Route path="/agency/:accountSlug/:slug" element={<PublicRealEstateListing />} />
              <Route path="/install" element={<Install />} />
              <Route path="/saved" element={<SavedListings />} />
              <Route path="/cv-generator" element={<CVGenerator />} />
              <Route path="/category-notifications" element={<CategorySubscriptions />} />
              <Route path="/vision" element={<PlatformVision />} />

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
              <Route path="/dashboard/pricing" element={<ProtectedRoute><DynamicPricing /></ProtectedRoute>} />
              <Route path="/dashboard/marketplace" element={<ProtectedRoute><ActivitiesMarketplace /></ProtectedRoute>} />
              <Route path="/dashboard/collaboration" element={<ProtectedRoute><Collaboration /></ProtectedRoute>} />
              <Route path="/dashboard/developers" element={<ProtectedRoute><DeveloperPortal /></ProtectedRoute>} />
              <Route path="/dashboard/audit" element={<ProtectedRoute><AuditTrail /></ProtectedRoute>} />
              
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
