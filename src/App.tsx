import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "next-themes";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import FloatingAIAssistant from "@/components/ai/FloatingAIAssistant";
import CountryGuard from "@/components/dashboard/CountryGuard";
import { Suspense, lazy } from "react";
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
const Install = lazy(() => import("./pages/Install"));
const ChannelManager = lazy(() => import("./pages/ChannelManager"));
const Accounting = lazy(() => import("./pages/Accounting"));
const DynamicPricing = lazy(() => import("./pages/DynamicPricing"));
const PropertyCalendar = lazy(() => import("./pages/PropertyCalendar"));
const RealEstateListings = lazy(() => import("./pages/RealEstateListings"));
const PublicRealEstateListing = lazy(() => import("./pages/PublicRealEstateListing"));
const PropertiesShowcase = lazy(() => import("./pages/PropertiesShowcase"));
const AccountShowcase = lazy(() => import("./pages/AccountShowcase"));
const Explore = lazy(() => import("./pages/Explore"));

const Collaboration = lazy(() => import("./pages/Collaboration"));
const DeveloperPortal = lazy(() => import("./pages/DeveloperPortal"));
const AuditTrail = lazy(() => import("./pages/AuditTrail"));
const CountryWorkspace = lazy(() => import("./pages/CountryWorkspace"));
const AddProperty = lazy(() => import("./pages/AddProperty"));
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
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const seoPublicPrefixes = [
  "/book/", "/listing/", "/host/", "/provider/", "/showcase/", "/store/", "/shop/",
  "/services/", "/activities/", "/locations", "/country/", "/city/", "/marketplace",
  "/explore",
];

const RouteAwareAssistant = () => {
  const { pathname } = useLocation();
  const hideAssistant =
    pathname === "/guest" ||
    pathname.startsWith("/r/") ||
    seoPublicPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (hideAssistant) return null;
  return <FloatingAIAssistant />;
};

const App = () => (
  <ErrorBoundary>
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false} storageKey="easylocs-theme">
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <RouteAwareAssistant />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/tenant-signup" element={<TenantSignup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
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
              <Route path="/explore" element={<Explore />} />
              <Route path="/properties" element={<PropertiesShowcase />} />
              <Route path="/properties/:slug" element={<PublicRealEstateListing />} />
              <Route path="/property/:slug" element={<PublicRealEstateListing />} />
              <Route path="/agency/:accountSlug" element={<AccountShowcase />} />
              <Route path="/agency/:accountSlug/:slug" element={<PublicRealEstateListing />} />
              <Route path="/install" element={<Install />} />
              <Route path="/vision" element={<PlatformVision />} />
              <Route path="/property-management" element={<PropertyManagement />} />
              <Route path="/rental-management" element={<PropertyManagement />} />
              <Route path="/landlord-software" element={<PropertyManagement />} />
              <Route path="/long-term-rentals" element={<LongTermRentalsPage />} />
              <Route path="/property-owner-software" element={<CoreSEOPages />} />
              <Route path="/property-management-platform" element={<PropertyManagementPlatformPage />} />
              <Route path="/rental-management-software" element={<RentalManagementSoftwarePage />} />
              <Route path="/concierge-services" element={<ConciergeServicesPage />} />
              <Route path="/marketplace-services" element={<MarketplaceServicesPage />} />

              {/* ══════ PROGRAMMATIC SEO ROUTES ══════ */}

              {/* /locations — Global hub */}
              <Route path="/locations" element={<LocationsPage />} />

              {/* /country/:country — Country hub */}
              <Route path="/country/:country" element={<CountryHubPage />} />

              {/* /city/:city — City hub + sub-pages */}
              <Route path="/city/:city" element={<CityHubPage />} />
              <Route path="/city/:city/services" element={<CityServicesPage />} />
              <Route path="/city/:city/activities" element={<CityActivitiesPage />} />
              <Route path="/city/:city/concierge" element={<CityConciergePage />} />

              {/* /services — Services directory */}
              <Route path="/services" element={<ServicesHubPage />} />
              <Route path="/services/:service" element={<ServiceCategoryPage />} />
              <Route path="/services/:service/:city" element={<ServiceCityPage />} />

              {/* /marketplace — Marketplace directory */}
              <Route path="/marketplace" element={<MarketplaceHubPage />} />
              <Route path="/marketplace/:city" element={<MarketplaceCityPage />} />
              <Route path="/marketplace/:service/:city" element={<MarketplaceServiceCityPage />} />

              {/* /provider/:slug — Provider SEO landing (new) + legacy storefront */}
              <Route path="/provider/:providerSlug" element={<ProviderSEOPage />} />

              {/* /activities — Activities hub + city combinations */}
              <Route path="/activities" element={<ActivitiesPage />} />
              <Route path="/activities/:activityCity" element={<ActivityCitySEOPage />} />

              {/* Legacy SEO routes — backward compatible */}
              <Route path="/seasonal-rentals" element={<SeasonalRentalsPage />} />
              {/* /services/:serviceCity handled by legacy route for hyphenated slugs */}

              {/* Legal / Info pages */}
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
              <Route path="/dashboard/receipts" element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
              <Route path="/dashboard/reminders" element={<ProtectedRoute><CountryGuard><Reminders /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/documents" element={<ProtectedRoute><CountryGuard><Documents /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
              <Route path="/dashboard/leases" element={<ProtectedRoute><CountryGuard><Leases /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/company" element={<ProtectedRoute><Company /></ProtectedRoute>} />
              <Route path="/dashboard/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
              <Route path="/dashboard/tenants" element={<ProtectedRoute><CountryGuard><Tenants /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/properties" element={<ProtectedRoute><RentalManagement /></ProtectedRoute>} />
              <Route path="/dashboard/rental" element={<ProtectedRoute><CountryGuard><RentalManagement /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/finances" element={<ProtectedRoute><CountryGuard><Finances /></CountryGuard></ProtectedRoute>} />
              
              <Route path="/dashboard/tasks" element={<ProtectedRoute><CountryGuard><Tasks /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/dashboard/communication" element={<ProtectedRoute><CommunicationCenter /></ProtectedRoute>} />
              <Route path="/dashboard/charges" element={<ProtectedRoute><CountryGuard><ChargesRegularization /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/fiscal" element={<ProtectedRoute><CountryGuard><FiscalReport /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/expenses" element={<ProtectedRoute><CountryGuard><Expenses /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/candidates" element={<ProtectedRoute><CountryGuard><Candidates /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/seasonal" element={<ProtectedRoute><SeasonalRentals /></ProtectedRoute>} />
              <Route path="/dashboard/notices" element={<ProtectedRoute><CountryGuard><PaymentNotices /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/dunning" element={<ProtectedRoute><CountryGuard><DunningLetters /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/furniture" element={<ProtectedRoute><CountryGuard><FurnitureInventory /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/buildings" element={<ProtectedRoute><CountryGuard><Buildings /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/dashboard/vault" element={<ProtectedRoute><CountryGuard><Vault /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/import" element={<ProtectedRoute><DataImport /></ProtectedRoute>} />
              <Route path="/dashboard/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
              <Route path="/dashboard/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/channel-manager" element={<ProtectedRoute><ChannelManager /></ProtectedRoute>} />
              <Route path="/dashboard/accounting" element={<ProtectedRoute><CountryGuard><Accounting /></CountryGuard></ProtectedRoute>} />
              <Route path="/dashboard/pricing" element={<ProtectedRoute><DynamicPricing /></ProtectedRoute>} />
              <Route path="/dashboard/marketplace" element={<ProtectedRoute><ActivitiesMarketplace /></ProtectedRoute>} />
              <Route path="/dashboard/collaboration" element={<ProtectedRoute><Collaboration /></ProtectedRoute>} />
              <Route path="/dashboard/developers" element={<ProtectedRoute><DeveloperPortal /></ProtectedRoute>} />
              <Route path="/dashboard/audit" element={<ProtectedRoute><AuditTrail /></ProtectedRoute>} />
              <Route path="/dashboard/local-services" element={<ProtectedRoute><LocalServices /></ProtectedRoute>} />
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

              {/* Catch-all — legacy SEO + 404 */}
              <Route path="*" element={<SEOCatchAll />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
  </ThemeProvider>
  </ErrorBoundary>
);

export default App;
