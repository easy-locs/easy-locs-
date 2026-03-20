import EmergencyRenderTestPage from "@/pages/EmergencyRenderTestPage";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CallProvider } from "@/components/call/CallProvider";
import { useOrbitSessionInit } from "@/hooks/useOrbitSessionInit";
import { useRealtimeHub } from "@/hooks/useRealtimeHub";
import { useOrchestration } from "@/hooks/useOrchestration";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "next-themes";
import { Suspense, lazy, type ComponentType } from "react";
import AppLockGuard from "@/components/security/AppLockGuard";
import SplashScreen from "@/components/brand/SplashScreen";
import BrandSuccessFlash from "@/components/brand/BrandSuccessFlash";
import BrandLoadingSpinner from "@/components/brand/BrandLoadingSpinner";
import EasyLocsLogo from "@/components/brand/EasyLocsLogo";
import UpdateNotification from "@/components/UpdateNotification";
import { SkipLink } from "@/components/ui/a11y";
import SmartInstallBanner from "@/components/pwa/SmartInstallBanner";
import OrbitCallRoot from "@/components/orbit/OrbitCallRoot";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import ChunkRecoveryBoundary from "@/components/system/ChunkRecoveryBoundary";
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

// Real Estate Module
const RealEstateModulePage = safeLazy(() => import("./pages/real-estate/RealEstateModule"), "RealEstateModule");
const REPropertiesPage = safeLazy(() => import("./pages/real-estate/PropertiesPage"), "REProperties");
const REUnitsPage = safeLazy(() => import("./pages/real-estate/UnitsPage"), "REUnits");
const RETenantsPage = safeLazy(() => import("./pages/real-estate/TenantsPage"), "RETenants");
const RELeasesPage = safeLazy(() => import("./pages/real-estate/LeasesPage"), "RELeases");
const REPaymentsPage = safeLazy(() => import("./pages/real-estate/PaymentsPage"), "REPayments");
const REDocumentsPage = safeLazy(() => import("./pages/real-estate/DocumentsPage"), "REDocuments");
const REPropertyDetailPage = safeLazy(() => import("./pages/real-estate/PropertyDetailPage"), "REPropertyDetail");
const RELeaseDetailPage = safeLazy(() => import("./pages/real-estate/LeaseDetailPage"), "RELeaseDetail");

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
const SuperMapRadarPage = safeLazy(() => import("./pages/GlobalMapPage"), "GlobalMapPage");
const DinoAuditPage = safeLazy(() => import("./pages/admin/DinoAuditPage"), "DinoAuditPage");
const DinoDashboardPage = safeLazy(() => import("./pages/admin/DinoDashboardPage"), "DinoDashboardPage");
const AdminUiEnginePage = safeLazy(() => import("./pages/admin/AdminUiEnginePage"), "AdminUiEnginePage");
const GlobalRadarPage = safeLazy(() => import("./pages/GlobalRadarPage"), "GlobalRadarPage");
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
const RideSearchPage = safeLazy(() => import("./pages/RideSearchPage"), "RideSearchPage");
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
const OrbitContactsPage = safeLazy(() => import("./components/orbit/OrbitContactsDirectory"), "OrbitContactsPage");
const TeamCommandCenterPage = safeLazy(() => import("./pages/TeamCommandCenterPage"), "TeamCommandCenterPage");
const AdminTrustGraphPage = safeLazy(() => import("./pages/AdminTrustGraphPage"), "AdminTrustGraphPage");
const ExecutiveKPIBoardPage = safeLazy(() => import("./pages/ExecutiveKPIBoardPage"), "ExecutiveKPIBoardPage");
const TeamPermissionsPage = safeLazy(() => import("./pages/TeamPermissionsPage"), "TeamPermissionsPage");
const AIOpsChatPage = safeLazy(() => import("./pages/AIOpsChatPage"), "AIOpsChatPage");
const FinancialReconPage = safeLazy(() => import("./pages/FinancialReconPage"), "FinancialReconPage");
const ReconAlertsPage = safeLazy(() => import("./pages/ReconAlertsPage"), "ReconAlertsPage");
const CallSessionPage = safeLazy(() => import("./pages/CallSessionPage"), "CallSessionPage");
const OrbitIdentityPage = safeLazy(() => import("./pages/OrbitIdentityPage"), "OrbitIdentityPage");
const WalletHubPage = safeLazy(() => import("./pages/WalletHubPage"), "WalletHubPage");
const PredictiveDispatchPage = safeLazy(() => import("./pages/PredictiveDispatchPage"), "PredictiveDispatchPage");
const MerchantOnboardingPage = safeLazy(() => import("./pages/MerchantOnboardingPage"), "MerchantOnboardingPage");
const MerchantOnboardingAdminPage = safeLazy(() => import("./pages/MerchantOnboardingAdminPage"), "MerchantOnboardingAdminPage");
const ExecutiveDashboard = safeLazy(() => import("./pages/ExecutiveDashboard"), "ExecutiveDashboard");
const GhostCallPage = safeLazy(() => import("./pages/GhostCallPage"), "GhostCallPage");
// Ghost V2/V3 pages
const GhostInboxPage = safeLazy(() => import("./pages/ghost/GhostInboxPage"), "GhostInboxPage");
const GhostThreadPage = safeLazy(() => import("./pages/ghost/GhostThreadPage"), "GhostThreadPage");
const GhostCallPageV2 = safeLazy(() => import("./pages/ghost/GhostCallPageV2"), "GhostCallPageV2");
const GhostSettingsPage = safeLazy(() => import("./pages/ghost/GhostSettingsPage"), "GhostSettingsPage");
const GhostContactsPage = safeLazy(() => import("./pages/ghost/GhostContactsPage"), "GhostContactsPage");
const SalesSequencePage = safeLazy(() => import("./pages/SalesSequencePage"), "SalesSequencePage");
const WorkspaceBootstrapPage = safeLazy(() => import("./pages/WorkspaceBootstrapPage"), "WorkspaceBootstrapPage");
const MenuAdminPage = safeLazy(() => import("./pages/MenuAdminPage"), "MenuAdminPage");
const DispatchBoardPage = safeLazy(() => import("./pages/DispatchBoardPage"), "DispatchBoardPage");
const SupportInboxPage = safeLazy(() => import("./pages/SupportInboxPage"), "SupportInboxPage");
const AdminHomeV1Page = safeLazy(() => import("./pages/AdminHomeV1Page"), "AdminHomeV1Page");
const DriverLivePage = safeLazy(() => import("./pages/DriverLivePage"), "DriverLivePage");
const DriverPickerPage = safeLazy(() => import("./pages/DriverPickerPage"), "DriverPickerPage");
const FoodOrderCheckoutPage = safeLazy(() => import("./pages/FoodOrderCheckoutPage"), "FoodOrderCheckoutPage");
const CheckoutPage = safeLazy(() => import("./pages/CheckoutPage"), "CheckoutPage");
const OrdersPage = safeLazy(() => import("./pages/OrdersPage"), "OrdersPage");
const TrackingPage = safeLazy(() => import("./pages/TrackingPage"), "TrackingPage");
const DeliveryProofPage = safeLazy(() => import("./pages/DeliveryProofPage"), "DeliveryProofPage");
const GuestCheckoutPage = safeLazy(() => import("./pages/GuestCheckoutPage"), "GuestCheckoutPage");
const PaymentPage = safeLazy(() => import("./pages/PaymentPage"), "PaymentPage");
const KpiChartsPage = safeLazy(() => import("./pages/KpiChartsPage"), "KpiChartsPage");
const PublicStorefrontBySlugPage = safeLazy(() => import("./pages/PublicStorefrontBySlugPage"), "PublicStorefrontBySlugPage");
const DriverHeatmapMapPage = safeLazy(() => import("./pages/DriverHeatmapMapPage"), "DriverHeatmapMapPage");
const BatchDeliveryPlannerPage = safeLazy(() => import("./pages/BatchDeliveryPlannerPage"), "BatchDeliveryPlannerPage");
const AdminRealtimeControlPage = safeLazy(() => import("./pages/AdminRealtimeControlPage"), "AdminRealtimeControlPage");
const DeploymentChecklistPage = safeLazy(() => import("./pages/DeploymentChecklistPage"), "DeploymentChecklistPage");
const LoyaltyRedeemPage = safeLazy(() => import("./pages/LoyaltyRedeemPage"), "LoyaltyRedeemPage");
const AbandonedCartOpsPage = safeLazy(() => import("./pages/AbandonedCartOpsPage"), "AbandonedCartOpsPage");
const AdminAlertCenterPage = safeLazy(() => import("./pages/AdminAlertCenterPage"), "AdminAlertCenterPage");
const IncidentDashboardPage = safeLazy(() => import("./pages/IncidentDashboardPage"), "IncidentDashboardPage");
const StripeElementsPage = safeLazy(() => import("./pages/StripeElementsPage"), "StripeElementsPage");
const AuditDebugPanelPage = safeLazy(() => import("./pages/AuditDebugPanelPage"), "AuditDebugPanelPage");
const OpsWallboardPage = safeLazy(() => import("./pages/OpsWallboardPage"), "OpsWallboardPage");
const MerchantClaimPage = safeLazy(() => import("./pages/MerchantClaimPage"), "MerchantClaimPage");
const MerchantDashboardPage = safeLazy(() => import("./pages/MerchantDashboardPage"), "MerchantDashboardPage");
const AdminOutreachPage = safeLazy(() => import("./pages/AdminOutreachPage"), "AdminOutreachPage");
const MerchantPosPage = safeLazy(() => import("./pages/MerchantPosPage"), "MerchantPosPage");
const MerchantKitchenPage = safeLazy(() => import("./pages/MerchantKitchenPage"), "MerchantKitchenPage");
const MerchantOrdersPage = safeLazy(() => import("./pages/MerchantOrdersPage"), "MerchantOrdersPage");
const WalletCommerceTestPage = safeLazy(() => import("./pages/WalletCommerceTestPage"), "WalletCommerceTestPage");
const AdminWalletDiagnosticsPage = safeLazy(() => import("./pages/AdminWalletDiagnosticsPage"), "AdminWalletDiagnosticsPage");
const AdminDispatchDiagnosticsPage = safeLazy(() => import("./pages/AdminDispatchDiagnosticsPage"), "AdminDispatchDiagnosticsPage");
const AdminAutomationsPage = safeLazy(() => import("./pages/AdminAutomationsPage"), "AdminAutomationsPage");
const DriverEarningsPage = safeLazy(() => import("./pages/DriverEarningsPage"), "DriverEarningsPage");
const DriverMissionInboxPage = safeLazy(() => import("./pages/DriverMissionInboxPage"), "DriverMissionInboxPage");
const DriverActiveMissionPage = safeLazy(() => import("./pages/DriverActiveMissionPage"), "DriverActiveMissionPage");
const CustomerDeliveryTrackingPage = safeLazy(() => import("./pages/CustomerDeliveryTrackingPage"), "CustomerDeliveryTrackingPage");
const MerchantDeliveryMonitorPage = safeLazy(() => import("./pages/MerchantDeliveryMonitorPage"), "MerchantDeliveryMonitorPage");
const AdminOpsExceptionsPage = safeLazy(() => import("./pages/AdminOpsExceptionsPage"), "AdminOpsExceptionsPage");
const AdminAutomationHealthPage = safeLazy(() => import("./pages/AdminAutomationHealthPage"), "AdminAutomationHealthPage");
const AdminReviewQueuePage = safeLazy(() => import("./pages/AdminReviewQueuePage"), "AdminReviewQueuePage");
const AdminGrowthDashboard = safeLazy(() => import("./pages/AdminGrowthDashboard"), "AdminGrowthDashboard");
const ComingSoonMerchantPage = safeLazy(() => import("./pages/ComingSoonMerchantPage"), "ComingSoonMerchantPage");
const CityMarketplacePage = safeLazy(() => import("./pages/CityMarketplacePage"), "CityMarketplacePage");
const AdminGrowthEnginePage = safeLazy(() => import("./pages/AdminGrowthEnginePage"), "AdminGrowthEnginePage");
const CityVerticalPage = safeLazy(() => import("./pages/CityVerticalPage"), "CityVerticalPage");

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

// Food sub-pages (Careem-style drill-down)
const FoodTypePage = safeLazy(() => import("./pages/food/FoodTypePage"), "FoodTypePage");
const CuisineListPage = safeLazy(() => import("./pages/food/CuisineListPage"), "CuisineListPage");
const FoodRestaurantPage = safeLazy(() => import("./pages/food/RestaurantPage"), "FoodRestaurantPage");

// Settings sub-pages
const SettingsHomePage = safeLazy(() => import("./pages/settings/SettingsHome"), "SettingsHome");
const SettingsAccountPage = safeLazy(() => import("./pages/settings/SettingsAccount"), "SettingsAccount");
const SettingsOrbitPage = safeLazy(() => import("./pages/settings/SettingsOrbit"), "SettingsOrbit");
const SettingsBusinessPage = safeLazy(() => import("./pages/settings/SettingsBusiness"), "SettingsBusiness");
const SettingsWalletPage = safeLazy(() => import("./pages/settings/SettingsWallet"), "SettingsWallet");
const SettingsAddressesPage = safeLazy(() => import("./pages/settings/SettingsAddresses"), "SettingsAddresses");
const SettingsNotificationsPage = safeLazy(() => import("./pages/settings/SettingsNotifications"), "SettingsNotifications");
const SettingsSecurityPage = safeLazy(() => import("./pages/settings/SettingsSecurity"), "SettingsSecurity");
const SettingsPreferencesPage = safeLazy(() => import("./pages/settings/SettingsPreferences"), "SettingsPreferences");
const SettingsSupportPage = safeLazy(() => import("./pages/settings/SettingsSupport"), "SettingsSupport");

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
const DubaiRestaurantImportPage = safeLazy(() => import("./pages/DubaiRestaurantImportPage"), "DubaiRestaurantImportPage");
const QrEntryPage = safeLazy(() => import("./pages/QrEntryPage"), "QrEntryPage");
const AppNotFoundPage = safeLazy(() => import("./pages/AppNotFoundPage"), "AppNotFoundPage");
const AdminImportTestBatchesPage = safeLazy(() => import("./pages/AdminImportTestBatchesPage"), "AdminImportTestBatchesPage");
const QrGeneratePage = safeLazy(() => import("./pages/QrGeneratePage"), "QrGeneratePage");
const RouteAuditPage = safeLazy(() => import("./pages/RouteAuditPage"), "RouteAuditPage");
const OrbitCallTestPage = safeLazy(() => import("./pages/OrbitCallTestPage"), "OrbitCallTestPage");
const AdminRestaurantTestSeederPage = safeLazy(() => import("./pages/AdminRestaurantTestSeederPage"), "AdminRestaurantTestSeederPage");
const AdminRuntimeAuditPage = safeLazy(() => import("./pages/AdminRuntimeAuditPage"), "AdminRuntimeAuditPage");
const AdminRuntimeQuickLinksPage = safeLazy(() => import("./pages/AdminRuntimeQuickLinksPage"), "AdminRuntimeQuickLinksPage");
const AdminMasterDebugPage = safeLazy(() => import("./pages/AdminMasterDebugPage"), "AdminMasterDebugPage");
const AdminDinoControlPanel = safeLazy(() => import("./pages/admin/AdminDinoControlPanel"), "AdminDinoControlPanel");
const AdminMarketplaceOpsPage = safeLazy(() => import("./pages/admin/AdminMarketplaceOpsPage"), "AdminMarketplaceOpsPage");
const SettingsPaymentMethodsPage = safeLazy(() => import("./pages/settings/SettingsPaymentMethods"), "SettingsPaymentMethods");
const MerchantMenuPageNew = safeLazy(() => import("./pages/merchant/MerchantMenuPage"), "MerchantMenuPageNew");
const DriverDashboardPageNew = safeLazy(() => import("./pages/driver/DriverDashboardPage"), "DriverDashboardPageNew");
const AdminOpsDashboardPage = safeLazy(() => import("./pages/admin/AdminOpsDashboardPage"), "AdminOpsDashboardPage");
const AdminOrchestrationPage = safeLazy(() => import("./pages/admin/AdminOrchestrationPage"), "AdminOrchestrationPage");
const AdminSupportOpsPage = safeLazy(() => import("./pages/admin/AdminSupportOpsPage"), "AdminSupportOpsPage");
const AdminDeliveryOpsPage = safeLazy(() => import("./pages/admin/AdminDeliveryOpsPage"), "AdminDeliveryOpsPage");
const SupportTicketsPage = safeLazy(() => import("./pages/support/SupportTicketsPage"), "SupportTicketsPage");
const SupportTicketDetailPage = safeLazy(() => import("./pages/support/SupportTicketDetailPage"), "SupportTicketDetailPage");
const DriverMissionsPage = safeLazy(() => import("./pages/driver/DriverMissionsPage"), "DriverMissionsPage");
const DriverMissionDetailPage = safeLazy(() => import("./pages/driver/DriverMissionDetailPage"), "DriverMissionDetailPage");
const DriverProofPage = safeLazy(() => import("./pages/driver/DriverProofPage"), "DriverProofPage");
const AdminMerchantAutofillPage = safeLazy(() => import("./pages/admin/AdminMerchantAutofillPage"), "AdminMerchantAutofillPage");
const AdminSuperDashboardPage = safeLazy(() => import("./pages/admin/AdminSuperDashboardPage"), "AdminSuperDashboardPage");
const MerchantStoreSettingsPage = safeLazy(() => import("./pages/merchant/MerchantStoreSettingsPage"), "MerchantStoreSettingsPage");
const MerchantPromoManagerPage = safeLazy(() => import("./pages/merchant/MerchantPromoManagerPage"), "MerchantPromoManagerPage");
const AdminPaymentsOpsPage = safeLazy(() => import("./pages/admin/AdminPaymentsOpsPage"), "AdminPaymentsOpsPage");
const AdminBulkMerchantImportPage = safeLazy(() => import("./pages/admin/AdminBulkMerchantImportPage"), "AdminBulkMerchantImportPage");
const FavoritesPage = safeLazy(() => import("./pages/FavoritesPage"), "FavoritesPage");
const AdminSeedToolsPage = safeLazy(() => import("./pages/admin/AdminSeedToolsPage"), "AdminSeedToolsPage");
const SearchResultsPage = safeLazy(() => import("./pages/SearchResultsPage"), "SearchResultsPage");
const AdminContentOpsPage = safeLazy(() => import("./pages/admin/AdminContentOpsPage"), "AdminContentOpsPage");

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
  <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6" style={{ background: "hsl(var(--background, 220 45% 8%))" }}>
    <EasyLocsLogo variant="splash" size="md" animate />
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
/** Install orchestration engine */
const OrchestrationGuard = () => { useOrchestration(); return null; };

// Apply lightweight mode class on slow devices
if (typeof window !== "undefined") {
  import("@/lib/performance").then(({ isLightweightMode }) => {
    if (isLightweightMode()) {
      document.documentElement.classList.add("lightweight-mode");
    }
  });
}

/** Route "/" → OrbitHome (authenticated) or Index (guest) */
function HomeRouter() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Suspense fallback={<PageLoader />}><Index /></Suspense>;
  return <Suspense fallback={<PageLoader />}><OrbitAppShell><OrbitHome /></OrbitAppShell></Suspense>;
}

const App = () => (
  <ChunkRecoveryBoundary>
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
           <SplashScreen>
           <BrandSuccessFlash />
            <OrchestrationGuard />
            <OrbitSessionGuard />
           <RealtimeHubGuard />
           <UpdateNotification />
           <OrbitCallRoot />
          
           <SkipLink />
           <Suspense fallback={<PageLoader />}>
            <main id="main-content">
            <Routes>
              {/* Emergency render test — no wrappers */}
              <Route path="/emergency-test" element={<EmergencyRenderTestPage />} />

              {/* ══════ PUBLIC WEBSITE ══════ */}
              {/* Homepage */}
              <Route path="/" element={<HomeRouter />} />
              <Route path="/home" element={<Index />} />

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
              <Route path="/qr/entry/:targetCode" element={<QrEntryPage />} />

              {/* V7 Public pillars */}
              {/* Redirects */}
              <Route path="/discover" element={<Navigate to="/explore" replace />} />
              <Route path="/search" element={<DiscoverPage />} />

              {/* Universe hubs */}
              <Route path="/food" element={<FoodHub />} />
              <Route path="/food/restaurant/:restaurantId" element={<FoodRestaurantPage />} />
              <Route path="/food/:type" element={<FoodTypePage />} />
              <Route path="/food/:type/:cuisine" element={<CuisineListPage />} />
              <Route path="/grocery" element={<GroceryHub />} />
              <Route path="/services-hub" element={<ServicesHub />} />

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
              <Route path="/ride" element={<RidePage />} />
              <Route path="/ride/search" element={<RideSearchPage />} />
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
              <Route path="/orbit/contacts" element={<OrbitContactsPage />} />
              <Route path="/team/command-center" element={<TeamCommandCenterPage />} />
              <Route path="/admin/executive-kpi" element={<ExecutiveKPIBoardPage />} />
              <Route path="/team/permissions" element={<TeamPermissionsPage />} />
              <Route path="/admin/ai-ops-chat" element={<AIOpsChatPage />} />
              <Route path="/admin/financial-recon" element={<FinancialReconPage />} />
              <Route path="/admin/recon-alerts" element={<ReconAlertsPage />} />
              <Route path="/call/:callSessionId" element={<CallSessionPage />} />
              <Route path="/orbit/identity" element={<OrbitIdentityPage />} />
              <Route path="/wallet/hub" element={<WalletHubPage />} />
              <Route path="/dispatch/predictive" element={<PredictiveDispatchPage />} />
              <Route path="/merchant/onboarding" element={<MerchantOnboardingPage />} />
              <Route path="/admin/merchant-onboarding" element={<MerchantOnboardingAdminPage />} />
              <Route path="/admin/executive-dashboard" element={<ExecutiveDashboard />} />
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
              <Route path="/map" element={<SuperMapRadarPage />} />
              <Route path="/radar" element={<GlobalRadarPage />} />
              <Route path="/shops" element={<ShopsPage />} />
              <Route path="/s/:slug" element={<ShopPage />} />
              <Route path="/s/:slug/:categorySlug" element={<ShopCategoryPage />} />
              <Route path="/business" element={<MyBusinessHub />} />
              <Route path="/property-hub" element={<PropertyManagementHub />} />
              <Route path="/pos" element={<POSPage />} />
              <Route path="/my-orders" element={<MyOrdersPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/order/:orderId" element={<UnifiedOrderDetailPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/tracking/:orderId" element={<TrackingPage />} />

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

              {/* Real Estate Module */}
              <Route path="/real-estate" element={<RealEstateModulePage />}>
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
              <Route path="/admin/ghost-call" element={<ProtectedRoute><GhostCallPage /></ProtectedRoute>} />

              {/* ══════ GHOST V2/V3 ══════ */}
              <Route path="/ghost" element={<Navigate to="/ghost/inbox" replace />} />
              <Route path="/ghost/inbox" element={<ProtectedRoute><GhostInboxPage /></ProtectedRoute>} />
              <Route path="/ghost/thread/:threadId" element={<ProtectedRoute><GhostThreadPage /></ProtectedRoute>} />
              <Route path="/ghost/call/:callId" element={<ProtectedRoute><GhostCallPageV2 /></ProtectedRoute>} />
              <Route path="/ghost/settings" element={<ProtectedRoute><GhostSettingsPage /></ProtectedRoute>} />
              <Route path="/ghost/contacts" element={<ProtectedRoute><GhostContactsPage /></ProtectedRoute>} />
              <Route path="/admin/sales-sequences" element={<ProtectedRoute><SalesSequencePage /></ProtectedRoute>} />
              <Route path="/admin/workspace-bootstrap" element={<ProtectedRoute><WorkspaceBootstrapPage /></ProtectedRoute>} />
              <Route path="/admin/menu" element={<ProtectedRoute><MenuAdminPage /></ProtectedRoute>} />
              <Route path="/admin/dispatch-board" element={<ProtectedRoute><DispatchBoardPage /></ProtectedRoute>} />
              <Route path="/admin/support-inbox" element={<ProtectedRoute><SupportInboxPage /></ProtectedRoute>} />
              <Route path="/admin/home-v1" element={<ProtectedRoute><AdminHomeV1Page /></ProtectedRoute>} />
              <Route path="/admin/driver-live" element={<ProtectedRoute><DriverLivePage /></ProtectedRoute>} />
              <Route path="/admin/driver-picker" element={<ProtectedRoute><DriverPickerPage /></ProtectedRoute>} />
              <Route path="/admin/food-checkout" element={<ProtectedRoute><FoodOrderCheckoutPage /></ProtectedRoute>} />
              <Route path="/admin/delivery-proof/:orderId" element={<ProtectedRoute><DeliveryProofPage /></ProtectedRoute>} />
              <Route path="/admin/kpi-charts" element={<ProtectedRoute><KpiChartsPage /></ProtectedRoute>} />
              <Route path="/admin/driver-heatmap" element={<ProtectedRoute><DriverHeatmapMapPage /></ProtectedRoute>} />
              <Route path="/admin/batch-delivery" element={<ProtectedRoute><BatchDeliveryPlannerPage /></ProtectedRoute>} />
              <Route path="/admin/realtime-control" element={<ProtectedRoute><AdminRealtimeControlPage /></ProtectedRoute>} />
              <Route path="/admin/deployment-checklist" element={<ProtectedRoute><DeploymentChecklistPage /></ProtectedRoute>} />
              <Route path="/admin/loyalty-redeem" element={<ProtectedRoute><LoyaltyRedeemPage /></ProtectedRoute>} />
              <Route path="/admin/abandoned-cart-ops" element={<ProtectedRoute><AbandonedCartOpsPage /></ProtectedRoute>} />
              <Route path="/admin/alerts" element={<ProtectedRoute><AdminAlertCenterPage /></ProtectedRoute>} />
              <Route path="/admin/incidents" element={<ProtectedRoute><IncidentDashboardPage /></ProtectedRoute>} />
              <Route path="/payments/stripe-elements" element={<ProtectedRoute><StripeElementsPage /></ProtectedRoute>} />
              <Route path="/admin/audit-debug" element={<ProtectedRoute><AuditDebugPanelPage /></ProtectedRoute>} />
              <Route path="/admin/ops-wallboard" element={<ProtectedRoute><OpsWallboardPage /></ProtectedRoute>} />
              <Route path="/admin/dubai-import" element={<ProtectedRoute><DubaiRestaurantImportPage /></ProtectedRoute>} />
              <Route path="/admin/outreach" element={<ProtectedRoute><AdminOutreachPage /></ProtectedRoute>} />

              {/* Merchant claim & dashboard */}
              <Route path="/merchant/claim" element={<MerchantClaimPage />} />
              <Route path="/merchant/dashboard" element={<ProtectedRoute><MerchantDashboardPage /></ProtectedRoute>} />
              <Route path="/merchant/pos" element={<ProtectedRoute><MerchantPosPage /></ProtectedRoute>} />
              <Route path="/merchant/kitchen" element={<ProtectedRoute><MerchantKitchenPage /></ProtectedRoute>} />
              <Route path="/merchant/orders" element={<ProtectedRoute><MerchantOrdersPage /></ProtectedRoute>} />
              <Route path="/admin/wallet-test" element={<ProtectedRoute><WalletCommerceTestPage /></ProtectedRoute>} />
              <Route path="/admin/wallet-diagnostics" element={<ProtectedRoute><AdminWalletDiagnosticsPage /></ProtectedRoute>} />
              <Route path="/admin/dispatch-diagnostics" element={<ProtectedRoute><AdminDispatchDiagnosticsPage /></ProtectedRoute>} />
              <Route path="/admin/automations" element={<ProtectedRoute><AdminAutomationsPage /></ProtectedRoute>} />
              <Route path="/driver/earnings" element={<ProtectedRoute><DriverEarningsPage /></ProtectedRoute>} />
              <Route path="/driver/missions" element={<ProtectedRoute><DriverMissionInboxPage /></ProtectedRoute>} />
              <Route path="/driver/mission/:dispatchJobId" element={<ProtectedRoute><DriverActiveMissionPage /></ProtectedRoute>} />
              <Route path="/tracking/order/:orderId" element={<CustomerDeliveryTrackingPage />} />
              <Route path="/merchant/delivery-monitor" element={<ProtectedRoute><MerchantDeliveryMonitorPage /></ProtectedRoute>} />
              <Route path="/admin/ops-exceptions" element={<ProtectedRoute><AdminOpsExceptionsPage /></ProtectedRoute>} />
              <Route path="/admin/automation-health" element={<ProtectedRoute><AdminAutomationHealthPage /></ProtectedRoute>} />
              <Route path="/admin/review-queue" element={<ProtectedRoute><AdminReviewQueuePage /></ProtectedRoute>} />
              <Route path="/admin/growth" element={<ProtectedRoute><AdminGrowthDashboard /></ProtectedRoute>} />
              <Route path="/coming-soon/:slug" element={<ComingSoonMerchantPage />} />
              <Route path="/city-market/:citySlug" element={<CityMarketplacePage />} />
              <Route path="/admin/growth-engine" element={<ProtectedRoute><AdminGrowthEnginePage /></ProtectedRoute>} />
              <Route path="/admin/import-test-batches" element={<ProtectedRoute><AdminImportTestBatchesPage /></ProtectedRoute>} />
              <Route path="/admin/qr-generate" element={<ProtectedRoute><QrGeneratePage /></ProtectedRoute>} />
              <Route path="/admin/route-audit" element={<ProtectedRoute><RouteAuditPage /></ProtectedRoute>} />
              <Route path="/admin/dino" element={<ProtectedRoute><DinoAuditPage /></ProtectedRoute>} />
              <Route path="/admin/dino-dashboard" element={<ProtectedRoute><DinoDashboardPage /></ProtectedRoute>} />
              <Route path="/orbit/call-test" element={<ProtectedRoute><OrbitCallTestPage /></ProtectedRoute>} />
              <Route path="/admin/test-restaurants" element={<ProtectedRoute><AdminRestaurantTestSeederPage /></ProtectedRoute>} />
              <Route path="/admin/runtime-audit" element={<ProtectedRoute><AdminRuntimeAuditPage /></ProtectedRoute>} />
              <Route path="/admin/runtime-links" element={<ProtectedRoute><AdminRuntimeQuickLinksPage /></ProtectedRoute>} />
               <Route path="/admin/master-debug" element={<ProtectedRoute><AdminMasterDebugPage /></ProtectedRoute>} />
               <Route path="/admin/dino-control" element={<ProtectedRoute><AdminDinoControlPanel /></ProtectedRoute>} />
               <Route path="/admin/ui-engine" element={<ProtectedRoute><AdminUiEnginePage /></ProtectedRoute>} />
               <Route path="/admin/marketplace-ops" element={<ProtectedRoute><AdminMarketplaceOpsPage /></ProtectedRoute>} />
               <Route path="/settings/payment-methods" element={<ProtectedRoute><SettingsPaymentMethodsPage /></ProtectedRoute>} />
               <Route path="/merchant/menu" element={<ProtectedRoute><MerchantMenuPageNew /></ProtectedRoute>} />
               <Route path="/merchant/menu/:merchantId" element={<ProtectedRoute><MerchantMenuPageNew /></ProtectedRoute>} />
               <Route path="/driver/dashboard" element={<ProtectedRoute><DriverDashboardPageNew /></ProtectedRoute>} />
               <Route path="/admin/ops-dashboard" element={<ProtectedRoute><AdminOpsDashboardPage /></ProtectedRoute>} />
               <Route path="/admin/orchestration" element={<ProtectedRoute><AdminOrchestrationPage /></ProtectedRoute>} />
               <Route path="/admin/support-ops" element={<ProtectedRoute><AdminSupportOpsPage /></ProtectedRoute>} />
               <Route path="/admin/delivery-ops" element={<ProtectedRoute><AdminDeliveryOpsPage /></ProtectedRoute>} />
               <Route path="/support/tickets" element={<ProtectedRoute><SupportTicketsPage /></ProtectedRoute>} />
               <Route path="/support/tickets/:ticketId" element={<ProtectedRoute><SupportTicketDetailPage /></ProtectedRoute>} />
               <Route path="/driver/missions-board" element={<ProtectedRoute><DriverMissionsPage /></ProtectedRoute>} />
               <Route path="/driver/missions-board/:orderId" element={<ProtectedRoute><DriverMissionDetailPage /></ProtectedRoute>} />
               <Route path="/driver/proof/:orderId" element={<ProtectedRoute><DriverProofPage /></ProtectedRoute>} />
               <Route path="/admin/merchant-autofill" element={<ProtectedRoute><AdminMerchantAutofillPage /></ProtectedRoute>} />
               <Route path="/admin/super-dashboard" element={<ProtectedRoute><AdminSuperDashboardPage /></ProtectedRoute>} />
               <Route path="/merchant/store-settings/:merchantId" element={<ProtectedRoute><MerchantStoreSettingsPage /></ProtectedRoute>} />
                <Route path="/merchant/promos/:merchantId" element={<ProtectedRoute><MerchantPromoManagerPage /></ProtectedRoute>} />
                <Route path="/admin/payments-ops" element={<ProtectedRoute><AdminPaymentsOpsPage /></ProtectedRoute>} />
                <Route path="/admin/bulk-merchant-import" element={<ProtectedRoute><AdminBulkMerchantImportPage /></ProtectedRoute>} />
                <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
                <Route path="/admin/seed-tools" element={<ProtectedRoute><AdminSeedToolsPage /></ProtectedRoute>} />
                <Route path="/search-results" element={<SearchResultsPage />} />
                <Route path="/admin/content-ops" element={<ProtectedRoute><AdminContentOpsPage /></ProtectedRoute>} />
              <Route path="/city/:countryCode/:city/:vertical/:locale" element={<CityVerticalPage />} />

              {/* Guest / Public */}
              <Route path="/guest/checkout/:cartId" element={<GuestCheckoutPage />} />
              <Route path="/payment/:orderId" element={<PaymentPage />} />
              <Route path="/store/:publicSlug" element={<PublicStorefrontBySlugPage />} />

              <Route path="/app/orbit" element={<Navigate to="/" replace />} />
              <Route path="/app/*" element={<Navigate to="/" replace />} />

              {/* SEO catch-all */}
              <Route path="/seo/*" element={<SEOCatchAll />} />

              {/* Fallback */}
              <Route path="/index" element={<Navigate to="/" replace />} />
              <Route path="*" element={<AppNotFoundPage />} />
            </Routes>
            </main>
           </Suspense>
           <SmartInstallBanner />
           </SplashScreen>
           </AppLockGuard>
          </UnifiedPaymentProvider>
           </CallProvider>
        </AuthProvider>
    </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
  </ThemeProvider>
  </ErrorBoundary>
  </ChunkRecoveryBoundary>
);

export default App;
