import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "next-themes";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
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
const Interventions = lazy(() => import("./pages/Interventions"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Messages = lazy(() => import("./pages/Messages"));
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
const PropertyManagement = lazy(() => import("./pages/PropertyManagement"));
const LandlordProfile = lazy(() => import("./pages/LandlordProfile"));
const Referrals = lazy(() => import("./pages/Referrals"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Install = lazy(() => import("./pages/Install"));
const ChannelManager = lazy(() => import("./pages/ChannelManager"));
const Accounting = lazy(() => import("./pages/Accounting"));
const DynamicPricing = lazy(() => import("./pages/DynamicPricing"));
const ServiceMarketplace = lazy(() => import("./pages/ServiceMarketplace"));
const Collaboration = lazy(() => import("./pages/Collaboration"));
const DeveloperPortal = lazy(() => import("./pages/DeveloperPortal"));
const AuditTrail = lazy(() => import("./pages/AuditTrail"));
const CountryWorkspace = lazy(() => import("./pages/CountryWorkspace"));
const LocalServices = lazy(() => import("./pages/LocalServices"));
const RentalCatalog = lazy(() => import("./pages/RentalCatalog"));
const HostCatalog = lazy(() => import("./pages/HostCatalog"));
// Legal pages
const TermsPage = lazy(() => import("./pages/legal/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/legal/PrivacyPage"));
const CookiePage = lazy(() => import("./pages/legal/CookiePage"));
const LegalNoticePage = lazy(() => import("./pages/legal/LegalNoticePage"));
const AboutPage = lazy(() => import("./pages/legal/AboutPage"));
const ContactPage = lazy(() => import("./pages/legal/ContactPage"));
const HelpPage = lazy(() => import("./pages/legal/HelpPage"));

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
              <Route path="/landlord/:slug" element={<LandlordProfile />} />
              <Route path="/install" element={<Install />} />
              <Route path="/property-management" element={<PropertyManagement />} />
              <Route path="/property-management-:country" element={<PropertyManagement />} />
              <Route path="/rental-management" element={<PropertyManagement />} />
              <Route path="/landlord-software" element={<PropertyManagement />} />

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
              <Route path="/dashboard/receipts" element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
              <Route path="/dashboard/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
              <Route path="/dashboard/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
              <Route path="/dashboard/assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
              <Route path="/dashboard/leases" element={<ProtectedRoute><Leases /></ProtectedRoute>} />
              <Route path="/dashboard/company" element={<ProtectedRoute><Company /></ProtectedRoute>} />
              <Route path="/dashboard/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
              <Route path="/dashboard/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
              <Route path="/dashboard/rental" element={<ProtectedRoute><RentalManagement /></ProtectedRoute>} />
              <Route path="/dashboard/finances" element={<ProtectedRoute><Finances /></ProtectedRoute>} />
              <Route path="/dashboard/interventions" element={<ProtectedRoute><Interventions /></ProtectedRoute>} />
              <Route path="/dashboard/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
              <Route path="/dashboard/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/dashboard/charges" element={<ProtectedRoute><ChargesRegularization /></ProtectedRoute>} />
              <Route path="/dashboard/fiscal" element={<ProtectedRoute><FiscalReport /></ProtectedRoute>} />
              <Route path="/dashboard/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
              <Route path="/dashboard/candidates" element={<ProtectedRoute><Candidates /></ProtectedRoute>} />
              <Route path="/dashboard/seasonal" element={<ProtectedRoute><SeasonalRentals /></ProtectedRoute>} />
              <Route path="/dashboard/notices" element={<ProtectedRoute><PaymentNotices /></ProtectedRoute>} />
              <Route path="/dashboard/dunning" element={<ProtectedRoute><DunningLetters /></ProtectedRoute>} />
              <Route path="/dashboard/furniture" element={<ProtectedRoute><FurnitureInventory /></ProtectedRoute>} />
              <Route path="/dashboard/buildings" element={<ProtectedRoute><Buildings /></ProtectedRoute>} />
              <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/dashboard/vault" element={<ProtectedRoute><Vault /></ProtectedRoute>} />
              <Route path="/dashboard/import" element={<ProtectedRoute><DataImport /></ProtectedRoute>} />
              <Route path="/dashboard/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
              <Route path="/dashboard/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/channel-manager" element={<ProtectedRoute><ChannelManager /></ProtectedRoute>} />
              <Route path="/dashboard/accounting" element={<ProtectedRoute><Accounting /></ProtectedRoute>} />
              <Route path="/dashboard/pricing" element={<ProtectedRoute><DynamicPricing /></ProtectedRoute>} />
              <Route path="/dashboard/marketplace" element={<ProtectedRoute><ServiceMarketplace /></ProtectedRoute>} />
              <Route path="/dashboard/collaboration" element={<ProtectedRoute><Collaboration /></ProtectedRoute>} />
              <Route path="/dashboard/developers" element={<ProtectedRoute><DeveloperPortal /></ProtectedRoute>} />
              <Route path="/dashboard/audit" element={<ProtectedRoute><AuditTrail /></ProtectedRoute>} />
              <Route path="/dashboard/local-services" element={<ProtectedRoute><LocalServices /></ProtectedRoute>} />

              {/* Protected — Tenant portal */}
              <Route path="/tenant" element={<ProtectedRoute><TenantDashboard /></ProtectedRoute>} />
              <Route path="/tenant/receipts" element={<ProtectedRoute><TenantReceipts /></ProtectedRoute>} />
              <Route path="/tenant/documents" element={<ProtectedRoute><TenantDocuments /></ProtectedRoute>} />
              <Route path="/tenant/messages" element={<ProtectedRoute><TenantMessages /></ProtectedRoute>} />
              <Route path="/tenant/pay" element={<ProtectedRoute><TenantPay /></ProtectedRoute>} />
              <Route path="/tenant/settings" element={<ProtectedRoute><TenantSettings /></ProtectedRoute>} />
              <Route path="/tenant/reviews" element={<ProtectedRoute><TenantReviews /></ProtectedRoute>} />
              <Route path="/tenant/requests" element={<ProtectedRoute><TenantRequests /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
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
