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
// Geo: GeoBoot is the single GPS lifecycle manager
import { GeoBoot } from "@/lib/geo/GeoBoot";
import { PermissionBootstrap } from "@/components/boot/PermissionBootstrap";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import ChunkRecoveryBoundary from "@/components/system/ChunkRecoveryBoundary";
import CountryGuard from "@/components/dashboard/CountryGuard";
import { UnifiedPaymentProvider } from "@/payments/UnifiedPaymentSystem";
import V1BootBridge from "@/app/V1BootBridge";
import { useUnifiedNotificationStore } from "@/stores/unifiedNotificationStore";
import { startUnifiedNotificationDispatcher, stopUnifiedNotificationDispatcher } from "@/lib/notifications/dispatcher";
import AppBootstrapGuardDirect from "@/components/app/AppBootstrapGuard";
import { AppInit } from "@/components/system/AppInit";

// V2 test pages — removed (Batch B purge)

// V2 Suite 4 pages
// V2 Suite 4 pages — all removed, routes redirect to canonical paths
const ClaimPage = safeLazy(() => import("./pages/ClaimPage"), "ClaimPage");


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

// Explore — dead, redirected to /radar. Import removed.

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
const ExplorePage = safeLazy(() => import("./pages/ExplorePage"), "ExplorePage");
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
const WalletHub = safeLazy(() => import("./pages/WalletHubPage"), "WalletHubPage");
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
const SellerDashboardPage = safeLazy(() => import("./pages/seller/SellerDashboardPage"), "SellerDashboardPage");
const DriverDashboard = safeLazy(() => import("./pages/DriverDashboard"), "DriverDashboard");
const DeliveryCommandCenter = safeLazy(() => import("./pages/DeliveryCommandCenter"), "DeliveryCommandCenter");
const ShopPage = safeLazy(() => import("./pages/ShopPage"), "ShopPage");
const MyShopPage = safeLazy(() => import("./pages/MyShopPage"), "MyShopPage");
const OpsCenter = safeLazy(() => import("./pages/OpsCenter"), "OpsCenter");
const ShopsPage = safeLazy(() => import("./pages/ShopsPage"), "ShopsPage");
const AdminUiEnginePage = safeLazy(() => import("./pages/admin/AdminUiEnginePage"), "AdminUiEnginePage");
const RadarViewPage = safeLazy(() => import("./pages/RadarViewPage"), "RadarViewPage");
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
const TrackRidePage = safeLazy(() => import("./pages/TrackRidePage"), "TrackRidePage");
const PayRidePage = safeLazy(() => import("./pages/PayRidePage"), "PayRidePage");
const RideReceiptPage = safeLazy(() => import("./pages/RideReceiptPage"), "RideReceiptPage");
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
// OrbitLiveCallPage removed — legacy, calls handled by CallProvider
const OrbitContactsPage = safeLazy(() => import("./components/orbit/OrbitContactsDirectory"), "OrbitContactsPage");
const TeamCommandCenterPage = safeLazy(() => import("./pages/TeamCommandCenterPage"), "TeamCommandCenterPage");
const AdminTrustGraphPage = safeLazy(() => import("./pages/AdminTrustGraphPage"), "AdminTrustGraphPage");
const ExecutiveKPIBoardPage = safeLazy(() => import("./pages/ExecutiveKPIBoardPage"), "ExecutiveKPIBoardPage");
const TeamPermissionsPage = safeLazy(() => import("./pages/TeamPermissionsPage"), "TeamPermissionsPage");
const AIOpsChatPage = safeLazy(() => import("./pages/AIOpsChatPage"), "AIOpsChatPage");
const FinancialReconPage = safeLazy(() => import("./pages/FinancialReconPage"), "FinancialReconPage");
const ReconAlertsPage = safeLazy(() => import("./pages/ReconAlertsPage"), "ReconAlertsPage");
// CallSessionPage — removed (orphan, bypassed CallProvider)
const OrbitIdentityPage = safeLazy(() => import("./pages/OrbitIdentityPage"), "OrbitIdentityPage");
const WalletHubPage = safeLazy(() => import("./pages/WalletHubPage"), "WalletHubPage");
const MerchantOnboardingPage = safeLazy(() => import("./pages/MerchantOnboardingPage"), "MerchantOnboardingPage");
const MerchantOnboardingAdminPage = safeLazy(() => import("./pages/MerchantOnboardingAdminPage"), "MerchantOnboardingAdminPage");
const ExecutiveDashboard = safeLazy(() => import("./pages/ExecutiveDashboard"), "ExecutiveDashboard");
// GhostCallPage — removed (orphan, bypassed CallProvider)
const WorkspaceBootstrapPage = safeLazy(() => import("./pages/WorkspaceBootstrapPage"), "WorkspaceBootstrapPage");
const MenuAdminPage = safeLazy(() => import("./pages/MenuAdminPage"), "MenuAdminPage");
const SupportInboxPage = safeLazy(() => import("./pages/SupportInboxPage"), "SupportInboxPage");
const AdminHomeV1Page = safeLazy(() => import("./pages/AdminHomeV1Page"), "AdminHomeV1Page");
const DriverLivePage = safeLazy(() => import("./pages/DriverLivePage"), "DriverLivePage");
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
const ShopQrCenterPage = safeLazy(() => import("./pages/merchant/ShopQrCenterPage"), "ShopQrCenterPage");
const ShopOrderPage = safeLazy(() => import("./pages/merchant/ShopOrderPage"), "ShopOrderPage");
// WalletCommerceTestPage removed — legacy test page
const AdminWalletDiagnosticsPage = safeLazy(() => import("./pages/AdminWalletDiagnosticsPage"), "AdminWalletDiagnosticsPage");
const DriverEarningsPage = safeLazy(() => import("./pages/DriverEarningsPage"), "DriverEarningsPage");
const AdminOpsExceptionsPage = safeLazy(() => import("./pages/AdminOpsExceptionsPage"), "AdminOpsExceptionsPage");
const AdminReviewQueuePage = safeLazy(() => import("./pages/AdminReviewQueuePage"), "AdminReviewQueuePage");
const AdminGrowthDashboard = safeLazy(() => import("./pages/AdminGrowthDashboard"), "AdminGrowthDashboard");
const CityMarketplacePage = safeLazy(() => import("./pages/CityMarketplacePage"), "CityMarketplacePage");
const BoostDashboardPage = safeLazy(() => import("./pages/boost/BoostDashboardPage"), "BoostDashboardPage");

// Travel universe
const TravelHub = safeLazy(() => import("./pages/travel/TravelHub"), "TravelHub");
const TravelFlights = safeLazy(() => import("./pages/travel/TravelFlights"), "TravelFlights");
const TravelStays = safeLazy(() => import("./pages/travel/TravelStayHub"), "TravelStayHub");
const TravelHotelDetail = safeLazy(() => import("./pages/travel/TravelHotelDetail"), "TravelHotelDetail");
const TravelStayDetail = safeLazy(() => import("./pages/travel/TravelStayDetail"), "TravelStayDetail");
const TravelFlightDetail = safeLazy(() => import("./pages/travel/TravelFlightDetail"), "TravelFlightDetail");

// Universe hubs
const FoodHub = safeLazy(() => import("./pages/universe/FoodHub"), "FoodHub");
const GroceryHub = safeLazy(() => import("./pages/universe/GroceryHub"), "GroceryHub");
const ServicesHub = safeLazy(() => import("./pages/universe/ServicesHub"), "ServicesHub");
const RetailHub = safeLazy(() => import("./pages/universe/RetailHub"), "RetailHub");
const PropertyHubUniverse = safeLazy(() => import("./pages/universe/PropertyHub"), "PropertyHubUniverse");
const DiscoverPage = safeLazy(() => import("./pages/universe/DiscoverPage"), "DiscoverPage");
const HealthcareHub = safeLazy(() => import("./pages/universe/HealthcareHub"), "HealthcareHub");
const ElectronicsHub = safeLazy(() => import("./pages/universe/ElectronicsHub"), "ElectronicsHub");
const GiftsHub = safeLazy(() => import("./pages/universe/GiftsHub"), "GiftsHub");
const PetsHub = safeLazy(() => import("./pages/universe/PetsHub"), "PetsHub");
const BrowseVerticalPage = safeLazy(() => import("./pages/universe/BrowseVerticalPage"), "BrowseVerticalPage");

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
const QrEntryPage = safeLazy(() => import("./pages/QrEntryPage"), "QrEntryPage");
const QrTrackingPage = safeLazy(() => import("./pages/qr/QrTrackingPage"), "QrTrackingPage");
const QrPickupPage = safeLazy(() => import("./pages/qr/QrPickupPage"), "QrPickupPage");
const AppNotFoundPage = safeLazy(() => import("./pages/AppNotFoundPage"), "AppNotFoundPage");
const QrGeneratePage = safeLazy(() => import("./pages/QrGeneratePage"), "QrGeneratePage");
const RouteAuditPage = safeLazy(() => import("./pages/RouteAuditPage"), "RouteAuditPage");
// OrbitCallTestPage removed — legacy test page
const AdminRestaurantTestSeederPage = safeLazy(() => import("./pages/AdminRestaurantTestSeederPage"), "AdminRestaurantTestSeederPage");
const AdminRuntimeAuditPage = safeLazy(() => import("./pages/AdminRuntimeAuditPage"), "AdminRuntimeAuditPage");
const AdminRuntimeQuickLinksPage = safeLazy(() => import("./pages/AdminRuntimeQuickLinksPage"), "AdminRuntimeQuickLinksPage");
const AdminMasterDebugPage = safeLazy(() => import("./pages/AdminMasterDebugPage"), "AdminMasterDebugPage");
// AdminDinoControlPanel removed — legacy dino system
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
const AdminBulkSeedPage = safeLazy(() => import("./pages/admin/AdminBulkSeedPage"), "AdminBulkSeedPage");
const AdminSuperDashboardPage = safeLazy(() => import("./pages/admin/AdminSuperDashboardPage"), "AdminSuperDashboardPage");
const MerchantStoreSettingsPage = safeLazy(() => import("./pages/merchant/MerchantStoreSettingsPage"), "MerchantStoreSettingsPage");
const MerchantPromoManagerPage = safeLazy(() => import("./pages/merchant/MerchantPromoManagerPage"), "MerchantPromoManagerPage");
const AdminPaymentsOpsPage = safeLazy(() => import("./pages/admin/AdminPaymentsOpsPage"), "AdminPaymentsOpsPage");
const AdminBulkMerchantImportPage = safeLazy(() => import("./pages/admin/AdminBulkMerchantImportPage"), "AdminBulkMerchantImportPage");
const FavoritesPage = safeLazy(() => import("./pages/FavoritesPage"), "FavoritesPage");
const AdminSeedToolsPage = safeLazy(() => import("./pages/admin/AdminSeedToolsPage"), "AdminSeedToolsPage");
const SearchResultsPage = safeLazy(() => import("./pages/SearchResultsPage"), "SearchResultsPage");
const AdminContentOpsPage = safeLazy(() => import("./pages/admin/AdminContentOpsPage"), "AdminContentOpsPage");
const ReorderPage = safeLazy(() => import("./pages/ReorderPage"), "ReorderPage");
const MerchantOrderBoardPage = safeLazy(() => import("./pages/merchant/MerchantOrderBoardPage"), "MerchantOrderBoardPage");
const AdminAnalyticsOpsPage = safeLazy(() => import("./pages/admin/AdminAnalyticsOpsPage"), "AdminAnalyticsOpsPage");
const MeCommandCenter = safeLazy(() => import("./pages/MeCommandCenter"), "MeCommandCenter");
const NotificationPreferencesPage = safeLazy(() => import("./pages/settings/NotificationPreferencesPage"), "NotificationPreferencesPage");
const AdminQualityOpsPage = safeLazy(() => import("./pages/admin/AdminQualityOpsPage"), "AdminQualityOpsPage");
const AdminUaeOpsDashboard = safeLazy(() => import("./pages/admin/AdminUaeOpsDashboard"), "AdminUaeOpsDashboard");
const MerchantReviewRepliesPage = safeLazy(() => import("./pages/merchant/MerchantReviewRepliesPage"), "MerchantReviewRepliesPage");
const AdminCrmOpsPage = safeLazy(() => import("./pages/admin/AdminCrmOpsPage"), "AdminCrmOpsPage");
const AdminHomeEnginePage = safeLazy(() => import("./pages/admin/AdminHomeEnginePage"), "AdminHomeEnginePage");
const AdminMapEnginePage = safeLazy(() => import("./pages/admin/AdminMapEnginePage"), "AdminMapEnginePage");
const AdminNotificationEnginePage = safeLazy(() => import("./pages/admin/AdminNotificationEnginePage"), "AdminNotificationEnginePage");
const MerchantInventoryPage = safeLazy(() => import("./pages/merchant/MerchantInventoryPage"), "MerchantInventoryPage");
const MerchantLiveControlPage = safeLazy(() => import("./pages/merchant/MerchantLiveControlPage"), "MerchantLiveControlPage");
const MerchantCouponManagerPage = safeLazy(() => import("./pages/merchant/MerchantCouponManagerPage"), "MerchantCouponManagerPage");
const AdminGrowthOpsPage = safeLazy(() => import("./pages/admin/AdminGrowthOpsPage"), "AdminGrowthOpsPage");
const NotificationCenterPage = safeLazy(() => import("./pages/notifications/NotificationCenterPage"), "NotificationCenterPage");
const AdminRetentionOpsPage = safeLazy(() => import("./pages/admin/AdminRetentionOpsPage"), "AdminRetentionOpsPage");
const DriverEarningsPageNew = safeLazy(() => import("./pages/driver/DriverEarningsPageNew"), "DriverEarningsPageNew");
const OrderReceiptPage = safeLazy(() => import("./pages/OrderReceiptPage"), "OrderReceiptPage");
const MerchantBasicAnalyticsPage = safeLazy(() => import("./pages/merchant/MerchantBasicAnalyticsPage"), "MerchantBasicAnalyticsPage");
const AdminOperationsLaunchpadPage = safeLazy(() => import("./pages/admin/AdminOperationsLaunchpadPage"), "AdminOperationsLaunchpadPage");
const MerchantCustomersPage = safeLazy(() => import("./pages/merchant/MerchantCustomersPage"), "MerchantCustomersPage");
const AdminMerchantHealthPage = safeLazy(() => import("./pages/admin/AdminMerchantHealthPage"), "AdminMerchantHealthPage");
const WalletTopUpPage = safeLazy(() => import("./pages/wallet/WalletTopUpPage"), "WalletTopUpPage");
const WalletTransferPage = safeLazy(() => import("./pages/wallet/WalletTransferPage"), "WalletTransferPage");
const WalletRequestPage = safeLazy(() => import("./pages/wallet/WalletRequestPage"), "WalletRequestPage");
const PaymentLinkResolverPage = safeLazy(() => import("./pages/pay/PaymentLinkResolverPage"), "PaymentLinkResolverPage");
const PaymentConfirmPage = safeLazy(() => import("./pages/pay/PaymentConfirmPage"), "PaymentConfirmPage");
const OrderRefundRequestPage = safeLazy(() => import("./pages/orders/OrderRefundRequestPage"), "OrderRefundRequestPage");
const MerchantPromoBannerEditorPage = safeLazy(() => import("./pages/merchant/MerchantPromoBannerEditorPage"), "MerchantPromoBannerEditorPage");
const AdminDriverMonitorPage = safeLazy(() => import("./pages/admin/AdminDriverMonitorPage"), "AdminDriverMonitorPage");
const AdminUserLookupPage = safeLazy(() => import("./pages/admin/AdminUserLookupPage"), "AdminUserLookupPage");
const AdminNotificationOpsPage = safeLazy(() => import("./pages/admin/AdminNotificationOpsPage"), "AdminNotificationOpsPage");
const AdminFinanceSummaryPage = safeLazy(() => import("./pages/admin/AdminFinanceSummaryPage"), "AdminFinanceSummaryPage");
const CustomerSpendingInsightsPage = safeLazy(() => import("./pages/CustomerSpendingInsightsPage"), "CustomerSpendingInsightsPage");
const AdminPlatformAlertsPage = safeLazy(() => import("./pages/admin/AdminPlatformAlertsPage"), "AdminPlatformAlertsPage");
const CustomerAddressBookPage = safeLazy(() => import("./pages/customer/CustomerAddressBookPage"), "CustomerAddressBookPage");
const MerchantBusinessSummaryPage = safeLazy(() => import("./pages/merchant/MerchantBusinessSummaryPage"), "MerchantBusinessSummaryPage");
const AdminOrderWatchPage = safeLazy(() => import("./pages/admin/AdminOrderWatchPage"), "AdminOrderWatchPage");
const CustomerLoyaltyHistoryPage = safeLazy(() => import("./pages/customer/CustomerLoyaltyHistoryPage"), "CustomerLoyaltyHistoryPage");
const AdminSearchWatchPage = safeLazy(() => import("./pages/admin/AdminSearchWatchPage"), "AdminSearchWatchPage");
const CustomerActiveOrdersPage = safeLazy(() => import("./pages/customer/CustomerActiveOrdersPage"), "CustomerActiveOrdersPage");
const MerchantClosingModePage = safeLazy(() => import("./pages/merchant/MerchantClosingModePage"), "MerchantClosingModePage");
const AdminMerchantPromoWatchPage = safeLazy(() => import("./pages/admin/AdminMerchantPromoWatchPage"), "AdminMerchantPromoWatchPage");
const DriverEarningsSummaryPage = safeLazy(() => import("./pages/driver/DriverEarningsSummaryPage"), "DriverEarningsSummaryPage");
const AdminRefundWatchPage = safeLazy(() => import("./pages/admin/AdminRefundWatchPage"), "AdminRefundWatchPage");
const CustomerSupportShortcutsPage = safeLazy(() => import("./pages/customer/CustomerSupportShortcutsPage"), "CustomerSupportShortcutsPage");
const MerchantCustomerInsightsPage = safeLazy(() => import("./pages/merchant/MerchantCustomerInsightsPage"), "MerchantCustomerInsightsPage");
const AdminDriverHeatmapPage = safeLazy(() => import("./pages/admin/AdminDriverHeatmapPage"), "AdminDriverHeatmapPage");
const CustomerOrderArchivePage = safeLazy(() => import("./pages/customer/CustomerOrderArchivePage"), "CustomerOrderArchivePage");
const MerchantProductPerformancePage = safeLazy(() => import("./pages/merchant/MerchantProductPerformancePage"), "MerchantProductPerformancePage");
const AdminWalletWatchPage = safeLazy(() => import("./pages/admin/AdminWalletWatchPage"), "AdminWalletWatchPage");
const AdminPlatformRecoveryPage = safeLazy(() => import("./pages/admin/AdminPlatformRecoveryPage"), "AdminPlatformRecoveryPage");
const AdminShopImportPage = safeLazy(() => import("./pages/admin/AdminShopImportPage"), "AdminShopImportPage");
const AdminVisualQualityPage = safeLazy(() => import("./pages/admin/AdminVisualQualityPage"), "AdminVisualQualityPage");
const AdminRankingControlPage = safeLazy(() => import("./pages/admin/AdminRankingControlPage"), "AdminRankingControlPage");
const CustomerReorderPage = safeLazy(() => import("./pages/customer/CustomerReorderPage"), "CustomerReorderPage");
const MerchantAutoAcceptSettingsPage = safeLazy(() => import("./pages/merchant/MerchantAutoAcceptSettingsPage"), "MerchantAutoAcceptSettingsPage");
const AdminSystemHealthPage = safeLazy(() => import("./pages/admin/AdminSystemHealthPage"), "AdminSystemHealthPage");
const CustomerLiveLocationPage = safeLazy(() => import("./pages/customer/CustomerLiveLocationPage"), "CustomerLiveLocationPage");
const DriverActiveMissionsPage = safeLazy(() => import("./pages/driver/DriverActiveMissionsPage"), "DriverActiveMissionsPage");
const AdminFraudDetectionPage = safeLazy(() => import("./pages/admin/AdminFraudDetectionPage"), "AdminFraudDetectionPage");
const CustomerSavedCardsPage = safeLazy(() => import("./pages/customer/CustomerSavedCardsPage"), "CustomerSavedCardsPage");
const MerchantInventoryAlertsPage = safeLazy(() => import("./pages/merchant/MerchantInventoryAlertsPage"), "MerchantInventoryAlertsPage");
const AdminOrderTimelinePage = safeLazy(() => import("./pages/admin/AdminOrderTimelinePage"), "AdminOrderTimelinePage");
const CustomerQuickHelpPage = safeLazy(() => import("./pages/customer/CustomerQuickHelpPage"), "CustomerQuickHelpPage");
const DriverShiftPage = safeLazy(() => import("./pages/driver/DriverShiftPage"), "DriverShiftPage");
const AdminMerchantApprovalQueuePage = safeLazy(() => import("./pages/admin/AdminMerchantApprovalQueuePage"), "AdminMerchantApprovalQueuePage");
const CustomerDeliveryNotesPage = safeLazy(() => import("./pages/customer/CustomerDeliveryNotesPage"), "CustomerDeliveryNotesPage");
const MerchantStaffAccessPage = safeLazy(() => import("./pages/merchant/MerchantStaffAccessPage"), "MerchantStaffAccessPage");
const AdminFailedPaymentsPage = safeLazy(() => import("./pages/admin/AdminFailedPaymentsPage"), "AdminFailedPaymentsPage");
const CustomerReferFriendPage = safeLazy(() => import("./pages/customer/CustomerReferFriendPage"), "CustomerReferFriendPage");
const DriverDocumentsPage = safeLazy(() => import("./pages/driver/DriverDocumentsPage"), "DriverDocumentsPage");
const AdminSupportSlaPage = safeLazy(() => import("./pages/admin/AdminSupportSlaPage"), "AdminSupportSlaPage");
const CustomerAddressSelectorPage = safeLazy(() => import("./pages/customer/CustomerAddressSelectorPage"), "CustomerAddressSelectorPage");
const MerchantDailySalesPage = safeLazy(() => import("./pages/merchant/MerchantDailySalesPage"), "MerchantDailySalesPage");
const AdminDeliveryIncidentsPage = safeLazy(() => import("./pages/admin/AdminDeliveryIncidentsPage"), "AdminDeliveryIncidentsPage");
const CustomerPaymentActivityPage = safeLazy(() => import("./pages/customer/CustomerPaymentActivityPage"), "CustomerPaymentActivityPage");
const DriverAvailabilityZonesPage = safeLazy(() => import("./pages/driver/DriverAvailabilityZonesPage"), "DriverAvailabilityZonesPage");
const AdminGrowthDashboardPage = safeLazy(() => import("./pages/admin/AdminGrowthDashboardPage"), "AdminGrowthDashboardPage");
const CustomerOrderReceiptsPage = safeLazy(() => import("./pages/customer/CustomerOrderReceiptsPage"), "CustomerOrderReceiptsPage");
const MerchantRefundRequestsPage = safeLazy(() => import("./pages/merchant/MerchantRefundRequestsPage"), "MerchantRefundRequestsPage");
const AdminCouponOversightPage = safeLazy(() => import("./pages/admin/AdminCouponOversightPage"), "AdminCouponOversightPage");
const CustomerNotificationCenterPage = safeLazy(() => import("./pages/customer/CustomerNotificationCenterPage"), "CustomerNotificationCenterPage");
const DriverCompletedDeliveriesPage = safeLazy(() => import("./pages/driver/DriverCompletedDeliveriesPage"), "DriverCompletedDeliveriesPage");
const AdminActiveSessionsPage = safeLazy(() => import("./pages/admin/AdminActiveSessionsPage"), "AdminActiveSessionsPage");
const MerchantMenuBulkEditPage = safeLazy(() => import("./pages/merchant/MerchantMenuBulkEditPage"), "MerchantMenuBulkEditPage");
const AdminFraudMonitorPage = safeLazy(() => import("./pages/admin/AdminFraudMonitorPage"), "AdminFraudMonitorPage");
const CustomerLiveTrackingPage = safeLazy(() => import("./pages/customer/CustomerLiveTrackingPage"), "CustomerLiveTrackingPage");
const MerchantRealtimeOrdersBoard = safeLazy(() => import("./pages/merchant/MerchantRealtimeOrdersBoard"), "MerchantRealtimeOrdersBoard");
const AdminGlobalHeatmapPage = safeLazy(() => import("./pages/admin/AdminGlobalHeatmapPage"), "AdminGlobalHeatmapPage");
const CustomerQuickReorderPage = safeLazy(() => import("./pages/customer/CustomerQuickReorderPage"), "CustomerQuickReorderPage");
const DriverLiveMissionsPage = safeLazy(() => import("./pages/driver/DriverLiveMissionsPage"), "DriverLiveMissionsPage");
const AdminRealtimeAlertsPage = safeLazy(() => import("./pages/admin/AdminRealtimeAlertsPage"), "AdminRealtimeAlertsPage");
// FA-FF block
const CustomerOrderSchedulePage = safeLazy(() => import("./pages/customer/CustomerOrderSchedulePage"), "CustomerOrderSchedulePage");
const MerchantOpenClosePage = safeLazy(() => import("./pages/merchant/MerchantOpenClosePage"), "MerchantOpenClosePage");
const AdminRetentionDashboardPage = safeLazy(() => import("./pages/admin/AdminRetentionDashboardPage"), "AdminRetentionDashboardPage");
const CustomerPromoWalletPage = safeLazy(() => import("./pages/customer/CustomerPromoWalletPage"), "CustomerPromoWalletPage");
const DriverBreakModePage = safeLazy(() => import("./pages/driver/DriverBreakModePage"), "DriverBreakModePage");
const AdminMerchantPerformancePage = safeLazy(() => import("./pages/admin/AdminMerchantPerformancePage"), "AdminMerchantPerformancePage");
// FG-FL block
const CustomerFamilyProfilesPage = safeLazy(() => import("./pages/customer/CustomerFamilyProfilesPage"), "CustomerFamilyProfilesPage");
const MerchantPrepTimePage = safeLazy(() => import("./pages/merchant/MerchantPrepTimePage"), "MerchantPrepTimePage");
const AdminRefundControlPage = safeLazy(() => import("./pages/admin/AdminRefundControlPage"), "AdminRefundControlPage");
const CustomerTippingPage = safeLazy(() => import("./pages/customer/CustomerTippingPage"), "CustomerTippingPage");
const DriverAcceptanceRatePage = safeLazy(() => import("./pages/driver/DriverAcceptanceRatePage"), "DriverAcceptanceRatePage");
const AdminDriverPerformancePage = safeLazy(() => import("./pages/admin/AdminDriverPerformancePage"), "AdminDriverPerformancePage");
// FM-FR block
const CustomerSubscriptionsPage = safeLazy(() => import("./pages/customer/CustomerSubscriptionsPage"), "CustomerSubscriptionsPage");
const MerchantPromoSchedulerPage = safeLazy(() => import("./pages/merchant/MerchantPromoSchedulerPage"), "MerchantPromoSchedulerPage");
const AdminDisputeCenterPage = safeLazy(() => import("./pages/admin/AdminDisputeCenterPage"), "AdminDisputeCenterPage");
const CustomerFavoriteOrdersPage = safeLazy(() => import("./pages/customer/CustomerFavoriteOrdersPage"), "CustomerFavoriteOrdersPage");
const DriverShiftSchedulerPage = safeLazy(() => import("./pages/driver/DriverShiftSchedulerPage"), "DriverShiftSchedulerPage");
const AdminGlobalFinancePage = safeLazy(() => import("./pages/admin/AdminGlobalFinancePage"), "AdminGlobalFinancePage");
// FS-FX block
const AdminCoreEnginePage = safeLazy(() => import("./pages/admin/AdminCoreEnginePage"), "AdminCoreEnginePage");
// FY-GD block
const CustomerGroupOrderPage = safeLazy(() => import("./pages/customer/CustomerGroupOrderPage"), "CustomerGroupOrderPage");
const MerchantAutoAcceptPage = safeLazy(() => import("./pages/merchant/MerchantAutoAcceptPage"), "MerchantAutoAcceptPage");
const AdminCashflowMonitorPage = safeLazy(() => import("./pages/admin/AdminCashflowMonitorPage"), "AdminCashflowMonitorPage");
const CustomerAddressBookPageV2 = safeLazy(() => import("./pages/customer/CustomerAddressBookPageV2"), "CustomerAddressBookPageV2");
const DriverNavigationModePage = safeLazy(() => import("./pages/driver/DriverNavigationModePage"), "DriverNavigationModePage");
const AdminCityOpsPage = safeLazy(() => import("./pages/admin/AdminCityOpsPage"), "AdminCityOpsPage");
// GE-GJ block
const CustomerMealPlannerPage = safeLazy(() => import("./pages/customer/CustomerMealPlannerPage"), "CustomerMealPlannerPage");
const MerchantDeliveryZonesPage = safeLazy(() => import("./pages/merchant/MerchantDeliveryZonesPage"), "MerchantDeliveryZonesPage");
const AdminOperatorNotesPage = safeLazy(() => import("./pages/admin/AdminOperatorNotesPage"), "AdminOperatorNotesPage");
const CustomerReceiptVaultPage = safeLazy(() => import("./pages/customer/CustomerReceiptVaultPage"), "CustomerReceiptVaultPage");
const DriverVehicleProfilePage = safeLazy(() => import("./pages/driver/DriverVehicleProfilePage"), "DriverVehicleProfilePage");
const AdminNetworkStatusPage = safeLazy(() => import("./pages/admin/AdminNetworkStatusPage"), "AdminNetworkStatusPage");
// GK-GP block
const CustomerSharedWalletPage = safeLazy(() => import("./pages/customer/CustomerSharedWalletPage"), "CustomerSharedWalletPage");
const AdminSlaMonitorPage = safeLazy(() => import("./pages/admin/AdminSlaMonitorPage"), "AdminSlaMonitorPage");
const CustomerOrderGiftsPage = safeLazy(() => import("./pages/customer/CustomerOrderGiftsPage"), "CustomerOrderGiftsPage");
const AdminIncidentCenterPage = safeLazy(() => import("./pages/admin/AdminIncidentCenterPage"), "AdminIncidentCenterPage");
// GQ-GV block
const CustomerSplitBillPage = safeLazy(() => import("./pages/customer/CustomerSplitBillPage"), "CustomerSplitBillPage");
const MerchantKitchenDisplayPage = safeLazy(() => import("./pages/merchant/MerchantKitchenDisplayPage"), "MerchantKitchenDisplayPage");
const AdminOrderAuditPage = safeLazy(() => import("./pages/admin/AdminOrderAuditPage"), "AdminOrderAuditPage");
const CustomerDeliveryInstructionsPage = safeLazy(() => import("./pages/customer/CustomerDeliveryInstructionsPage"), "CustomerDeliveryInstructionsPage");
const DriverDailyTargetPage = safeLazy(() => import("./pages/driver/DriverDailyTargetPage"), "DriverDailyTargetPage");
const AdminMarketExpansionPage = safeLazy(() => import("./pages/admin/AdminMarketExpansionPage"), "AdminMarketExpansionPage");
// GW-HB block
const CustomerSavedCartsPage2 = safeLazy(() => import("./pages/customer/CustomerSavedCartsPage"), "CustomerSavedCartsPage2");
const MerchantOutOfStockPage = safeLazy(() => import("./pages/merchant/MerchantOutOfStockPage"), "MerchantOutOfStockPage");
const AdminFraudWatchPage = safeLazy(() => import("./pages/admin/AdminFraudWatchPage"), "AdminFraudWatchPage");
const CustomerContactlessPage = safeLazy(() => import("./pages/customer/CustomerContactlessPage"), "CustomerContactlessPage");
const DriverHotZonesPage = safeLazy(() => import("./pages/driver/DriverHotZonesPage"), "DriverHotZonesPage");
const AdminDemandForecastPage = safeLazy(() => import("./pages/admin/AdminDemandForecastPage"), "AdminDemandForecastPage");
// HC-HH block
const CustomerAutoRepeatPage = safeLazy(() => import("./pages/customer/CustomerAutoRepeatPage"), "CustomerAutoRepeatPage");
const MerchantRushModePage = safeLazy(() => import("./pages/merchant/MerchantRushModePage"), "MerchantRushModePage");
const AdminRefundQueuePage = safeLazy(() => import("./pages/admin/AdminRefundQueuePage"), "AdminRefundQueuePage");
const CustomerPartyOrderPage = safeLazy(() => import("./pages/customer/CustomerPartyOrderPage"), "CustomerPartyOrderPage");
const DriverEarningsBreakdownPage = safeLazy(() => import("./pages/driver/DriverEarningsBreakdownPage"), "DriverEarningsBreakdownPage");
const AdminPlatformHealthPage = safeLazy(() => import("./pages/admin/AdminPlatformHealthPage"), "AdminPlatformHealthPage");
// HI-HN block
const CustomerOfficeLunchPage = safeLazy(() => import("./pages/customer/CustomerOfficeLunchPage"), "CustomerOfficeLunchPage");
const MerchantDeliveryFeesPage = safeLazy(() => import("./pages/merchant/MerchantDeliveryFeesPage"), "MerchantDeliveryFeesPage");
const AdminDriverCompliancePage = safeLazy(() => import("./pages/admin/AdminDriverCompliancePage"), "AdminDriverCompliancePage");
const CustomerRewardRedemptionPage = safeLazy(() => import("./pages/customer/CustomerRewardRedemptionPage"), "CustomerRewardRedemptionPage");
const DriverFuelCostPage = safeLazy(() => import("./pages/driver/DriverFuelCostPage"), "DriverFuelCostPage");
const AdminExecutiveOverviewPage = safeLazy(() => import("./pages/admin/AdminExecutiveOverviewPage"), "AdminExecutiveOverviewPage");
// HO-HT block
const AdminSystemLivePanelPage = safeLazy(() => import("./pages/admin/AdminSystemLivePanelPage"), "AdminSystemLivePanelPage");
// HU-HZ block
const AdminRestaurantFillPage = safeLazy(() => import("./pages/admin/AdminRestaurantFillPage"), "AdminRestaurantFillPage");
// IA-IF block
const StripeCheckoutHandlerPage = safeLazy(() => import("./pages/payments/StripeCheckoutHandlerPage"), "StripeCheckoutHandlerPage");
const AdminPaymentGoLivePage = safeLazy(() => import("./pages/admin/AdminPaymentGoLivePage"), "AdminPaymentGoLivePage");
const AdminGoLiveReadinessPage = safeLazy(() => import("./pages/admin/AdminGoLiveReadinessPage"), "AdminGoLiveReadinessPage");
// IG-IL block
const AdminUiFinalizerPage = safeLazy(() => import("./pages/admin/AdminUiFinalizerPage"), "AdminUiFinalizerPage");
// IM-IR block
// AppBootstrapGuard imported directly (not lazy) — it's a tiny null component
const AdminMasterControlPage = safeLazy(() => import("./pages/admin/AdminMasterControlPage"), "AdminMasterControlPage");
// IS-IX block
const AdminProductionChecklistPage = safeLazy(() => import("./pages/admin/AdminProductionChecklistPage"), "AdminProductionChecklistPage");
const AdminFinalWrapPage = safeLazy(() => import("./pages/admin/AdminFinalWrapPage"), "AdminFinalWrapPage");
// JA-JF block
const AdminQaCommandPage = safeLazy(() => import("./pages/admin/AdminQaCommandPage"), "AdminQaCommandPage");
// KA-KF block
const LiveTrackingPageNew = safeLazy(() => import("./pages/live/LiveTrackingPage"), "LiveTrackingPageNew");
// LG-LR block
const DriverFuelCostsPage = safeLazy(() => import("./pages/driver/DriverFuelCostsPage"), "DriverFuelCostsPage");
const DriverCompliancePage = safeLazy(() => import("./pages/driver/DriverCompliancePage"), "DriverCompliancePage");
const DriverBreaksPage = safeLazy(() => import("./pages/driver/DriverBreaksPage"), "DriverBreaksPage");
const DriverShiftPlannerPage = safeLazy(() => import("./pages/driver/DriverShiftPlannerPage"), "DriverShiftPlannerPage");
const AdminDriverComplianceOpsPage = safeLazy(() => import("./pages/admin/AdminDriverComplianceOpsPage"), "AdminDriverComplianceOpsPage");
const AdminMarketplaceExperimentsPage = safeLazy(() => import("./pages/admin/AdminMarketplaceExperimentsPage"), "AdminMarketplaceExperimentsPage");
const CustomerScheduledOrderPage = safeLazy(() => import("./pages/customer/CustomerScheduledOrderPage"), "CustomerScheduledOrderPage");
const MerchantStaffRolesPage = safeLazy(() => import("./pages/merchant/MerchantStaffRolesPage"), "MerchantStaffRolesPage");
const MerchantPermissionsMatrixPage = safeLazy(() => import("./pages/merchant/MerchantPermissionsMatrixPage"), "MerchantPermissionsMatrixPage");
const MerchantBusinessHoursPage = safeLazy(() => import("./pages/merchant/MerchantBusinessHoursPage"), "MerchantBusinessHoursPage");
// MA-MW block
const AdminRegionPerformancePage = safeLazy(() => import("./pages/admin/AdminRegionPerformancePage"), "AdminRegionPerformancePage");
const AdminCourierHeatmapPage = safeLazy(() => import("./pages/admin/AdminCourierHeatmapPage"), "AdminCourierHeatmapPage");
const AdminCustomerRetentionPage = safeLazy(() => import("./pages/admin/AdminCustomerRetentionPage"), "AdminCustomerRetentionPage");
const CustomerPartySplitLinksPage = safeLazy(() => import("./pages/customer/CustomerPartySplitLinksPage"), "CustomerPartySplitLinksPage");
const CustomerShareCartPage = safeLazy(() => import("./pages/customer/CustomerShareCartPage"), "CustomerShareCartPage");
const MerchantRushPricingPage = safeLazy(() => import("./pages/merchant/MerchantRushPricingPage"), "MerchantRushPricingPage");
const AdminGrowthCampaignsPage = safeLazy(() => import("./pages/admin/AdminGrowthCampaignsPage"), "AdminGrowthCampaignsPage");
const AdminPromoPerformancePage = safeLazy(() => import("./pages/admin/AdminPromoPerformancePage"), "AdminPromoPerformancePage");
const CustomerPaymentMethodsHubPage = safeLazy(() => import("./pages/customer/CustomerPaymentMethodsHubPage"), "CustomerPaymentMethodsHubPage");
const CustomerOrderPreferencesPage = safeLazy(() => import("./pages/customer/CustomerOrderPreferencesPage"), "CustomerOrderPreferencesPage");
const MerchantPackagingSettingsPage = safeLazy(() => import("./pages/merchant/MerchantPackagingSettingsPage"), "MerchantPackagingSettingsPage");
const MerchantOrderThrottlePage = safeLazy(() => import("./pages/merchant/MerchantOrderThrottlePage"), "MerchantOrderThrottlePage");
const AdminAcquisitionFunnelPage = safeLazy(() => import("./pages/admin/AdminAcquisitionFunnelPage"), "AdminAcquisitionFunnelPage");
const AdminDriverIncentivesPage = safeLazy(() => import("./pages/admin/AdminDriverIncentivesPage"), "AdminDriverIncentivesPage");
const CustomerFamilyProfilePage = safeLazy(() => import("./pages/customer/CustomerFamilyProfilePage"), "CustomerFamilyProfilePage");
const CustomerFavoriteItemsPage = safeLazy(() => import("./pages/customer/CustomerFavoriteItemsPage"), "CustomerFavoriteItemsPage");
const MerchantCancellationRulesPage = safeLazy(() => import("./pages/merchant/MerchantCancellationRulesPage"), "MerchantCancellationRulesPage");
const MerchantCustomerChatSettingsPage = safeLazy(() => import("./pages/merchant/MerchantCustomerChatSettingsPage"), "MerchantCustomerChatSettingsPage");
// MX-OG block
const AdminCityLaunchChecklistPage = safeLazy(() => import("./pages/admin/AdminCityLaunchChecklistPage"), "AdminCityLaunchChecklistPage");
const AdminRestaurantAutofillPage2 = safeLazy(() => import("./pages/admin/AdminRestaurantAutofillPage"), "AdminRestaurantAutofillPage2");
const AdminSystemLiveStatusPage = safeLazy(() => import("./pages/admin/AdminSystemLiveStatusPage"), "AdminSystemLiveStatusPage");
const CustomerQuickReorderHubPage = safeLazy(() => import("./pages/customer/CustomerQuickReorderHubPage"), "CustomerQuickReorderHubPage");
const MerchantLiveOpsPanelPage = safeLazy(() => import("./pages/merchant/MerchantLiveOpsPanelPage"), "MerchantLiveOpsPanelPage");
const CentralControlPanelPage = safeLazy(() => import("./pages/admin/CentralControlPanelPage"), "CentralControlPanelPage");
const AdminLiveIncidentFeedPage = safeLazy(() => import("./pages/admin/AdminLiveIncidentFeedPage"), "AdminLiveIncidentFeedPage");
const AdminRiskScoreboardPage = safeLazy(() => import("./pages/admin/AdminRiskScoreboardPage"), "AdminRiskScoreboardPage");
const AdminStoreReadinessMatrixPage = safeLazy(() => import("./pages/admin/AdminStoreReadinessMatrixPage"), "AdminStoreReadinessMatrixPage");
const CustomerBulkPartyBuilderPage = safeLazy(() => import("./pages/customer/CustomerBulkPartyBuilderPage"), "CustomerBulkPartyBuilderPage");
const CustomerDinnerPlannerPage = safeLazy(() => import("./pages/customer/CustomerDinnerPlannerPage"), "CustomerDinnerPlannerPage");
const MerchantAutoAcceptRulesPage = safeLazy(() => import("./pages/merchant/MerchantAutoAcceptRulesPage"), "MerchantAutoAcceptRulesPage");
const MerchantDriverHandoffPage = safeLazy(() => import("./pages/merchant/MerchantDriverHandoffPage"), "MerchantDriverHandoffPage");
// OH-PI block
const AdminDispatchTuningPage = safeLazy(() => import("./pages/admin/AdminDispatchTuningPage"), "AdminDispatchTuningPage");
const AdminPaymentWatchPage = safeLazy(() => import("./pages/admin/AdminPaymentWatchPage"), "AdminPaymentWatchPage");
const CustomerWeeklyMealPlanPage = safeLazy(() => import("./pages/customer/CustomerWeeklyMealPlanPage"), "CustomerWeeklyMealPlanPage");
const CustomerKidsMealProfilePage = safeLazy(() => import("./pages/customer/CustomerKidsMealProfilePage"), "CustomerKidsMealProfilePage");
const MerchantMenuCategoryManagerPage = safeLazy(() => import("./pages/merchant/MerchantMenuCategoryManagerPage"), "MerchantMenuCategoryManagerPage");
const MerchantItemBadgesPage = safeLazy(() => import("./pages/merchant/MerchantItemBadgesPage"), "MerchantItemBadgesPage");
const MerchantInstructionsPolicyPage = safeLazy(() => import("./pages/merchant/MerchantInstructionsPolicyPage"), "MerchantInstructionsPolicyPage");
const AdminMenuQualityPage = safeLazy(() => import("./pages/admin/AdminMenuQualityPage"), "AdminMenuQualityPage");
const AdminDeliveryLatencyPage = safeLazy(() => import("./pages/admin/AdminDeliveryLatencyPage"), "AdminDeliveryLatencyPage");
const CustomerLunchSubscriptionPage = safeLazy(() => import("./pages/customer/CustomerLunchSubscriptionPage"), "CustomerLunchSubscriptionPage");
const CustomerFamilyNightPage = safeLazy(() => import("./pages/customer/CustomerFamilyNightPage"), "CustomerFamilyNightPage");
const MerchantMenuClonerPage = safeLazy(() => import("./pages/merchant/MerchantMenuClonerPage"), "MerchantMenuClonerPage");
const MerchantFeaturedItemsPage = safeLazy(() => import("./pages/merchant/MerchantFeaturedItemsPage"), "MerchantFeaturedItemsPage");
const MerchantHolidaySchedulePage = safeLazy(() => import("./pages/merchant/MerchantHolidaySchedulePage"), "MerchantHolidaySchedulePage");
const AdminDriverPayoutsPage = safeLazy(() => import("./pages/admin/AdminDriverPayoutsPage"), "AdminDriverPayoutsPage");
const AdminMerchantPayoutsPage = safeLazy(() => import("./pages/admin/AdminMerchantPayoutsPage"), "AdminMerchantPayoutsPage");
const AdminWalletReconPage = safeLazy(() => import("./pages/admin/AdminWalletReconPage"), "AdminWalletReconPage");
const CustomerGuestCheckoutProfilePage = safeLazy(() => import("./pages/customer/CustomerGuestCheckoutProfilePage"), "CustomerGuestCheckoutProfilePage");
const CustomerDinnerBudgetPage = safeLazy(() => import("./pages/customer/CustomerDinnerBudgetPage"), "CustomerDinnerBudgetPage");
const MerchantStoreAnnouncementPage = safeLazy(() => import("./pages/merchant/MerchantStoreAnnouncementPage"), "MerchantStoreAnnouncementPage");
const MerchantTemporaryClosurePage = safeLazy(() => import("./pages/merchant/MerchantTemporaryClosurePage"), "MerchantTemporaryClosurePage");
const MerchantQueueLimitPage = safeLazy(() => import("./pages/merchant/MerchantQueueLimitPage"), "MerchantQueueLimitPage");
// PJ-PO block
const AdminNotificationCampaignsPage = safeLazy(() => import("./pages/admin/AdminNotificationCampaignsPage"), "AdminNotificationCampaignsPage");
const AdminCustomerSegmentsPage = safeLazy(() => import("./pages/admin/AdminCustomerSegmentsPage"), "AdminCustomerSegmentsPage");
const AdminMerchantSegmentsPage = safeLazy(() => import("./pages/admin/AdminMerchantSegmentsPage"), "AdminMerchantSegmentsPage");
// V1WalletHubPage removed — legacy redirect

const AuthCallbackPage = safeLazy(() => import("./pages/AuthCallbackPage"), "AuthCallbackPage");
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
/** Unified notification dispatcher — starts realtime listener for current user */
const NotificationsRealtimeGuard = () => {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    startUnifiedNotificationDispatcher(user.id);
    return () => stopUnifiedNotificationDispatcher();
  }, [user?.id]);
  return null;
};

// Apply lightweight mode class on slow devices
if (typeof window !== "undefined") {
  import("@/lib/performance").then(({ isLightweightMode }) => {
    if (isLightweightMode()) {
      document.documentElement.classList.add("lightweight-mode");
    }
  });
}

/** Route "/" → Onboarding (if needed) or Dashboard (authenticated) or Index (guest) */
function HomeRouter() {
  const { user, loading, profileLoaded, onboardingCompleted, emailVerified, activeRole } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Suspense fallback={<PageLoader />}><Index /></Suspense>;
  // Wait for profile to load before making onboarding decision — prevents flicker
  if (!profileLoaded) return <PageLoader />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  if (!onboardingCompleted) return <Navigate to="/onboarding" replace />;
  // Redirect to role-appropriate dashboard
  if (activeRole === "tenant") return <Navigate to="/tenant" replace />;
  if (activeRole === "client") return <Navigate to="/client" replace />;
  return <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>;
}

/** Route "/home" → OrbitHome marketplace hub (authenticated) or Index (guest) */
function MarketplaceHomeRouter() {
  const { user, loading, profileLoaded, onboardingCompleted, emailVerified } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Suspense fallback={<PageLoader />}><Index /></Suspense>;
  if (!profileLoaded) return <PageLoader />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  if (!onboardingCompleted) return <Navigate to="/onboarding" replace />;
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
             
             <V1BootBridge />
            <OrbitSessionGuard />
           <RealtimeHubGuard />
           <NotificationsRealtimeGuard />
           <UpdateNotification />
                <AppInit />
                <GeoBoot />
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
              <Route path="/track/:rideRequestId" element={<TrackRidePage />} />
              <Route path="/wallet/pay/:threadId" element={<PayRidePage />} />
              <Route path="/wallet/accounts" element={<Navigate to="/settings/wallet" replace />} />
              <Route path="/call/:threadId" element={<CallDriverPage />} />
              <Route path="/driver/payout" element={<DriverPayoutPage />} />
              <Route path="/admin/disputes" element={<AdminDisputesPage />} />
              <Route path="/driver/heatmap" element={<DemandHeatmapPage />} />
              <Route path="/driver/positioning" element={<DriverPositioningPage />} />
              <Route path="/admin/fraud" element={<AdminFraudPage />} />
              <Route path="/admin/live-ops" element={<AdminLiveOpsPage />} />
              <Route path="/subscription/priority" element={<RiderPrioritySubscriptionPage />} />
              <Route path="/admin/sla" element={<AdminSLAPage />} />
              <Route path="/admin/trust-graph" element={<AdminTrustGraphPage />} />
              <Route path="/refund/:rideRequestId" element={<RefundRequestPage />} />
              {/* orbit/call route removed — calls handled by CallProvider */}
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
              <Route path="/travel/stay/:id" element={<TravelStayDetail />} />
              <Route path="/travel/flight/:id" element={<TravelFlightDetail />} />

              <Route path="/super-map" element={<Navigate to="/radar" replace />} />
              <Route path="/map" element={<Navigate to="/radar" replace />} />
              <Route path="/radar" element={<RadarViewPage />} />
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
              <Route path="/marketplace" element={<MarketplaceHubPage />} />
              <Route path="/marketplace/:citySlug" element={<MarketplaceCityPage />} />
              <Route path="/marketplace/:citySlug/:serviceSlug" element={<MarketplaceServiceCityPage />} />
              <Route path="/services" element={<Navigate to="/services-hub" replace />} />
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
              <Route path="/admin/abandoned-cart-ops" element={<ProtectedRoute><AbandonedCartOpsPage /></ProtectedRoute>} />
              <Route path="/admin/alerts" element={<ProtectedRoute><AdminAlertCenterPage /></ProtectedRoute>} />
              <Route path="/admin/incidents" element={<ProtectedRoute><IncidentDashboardPage /></ProtectedRoute>} />
              <Route path="/payments/stripe-elements" element={<ProtectedRoute><StripeElementsPage /></ProtectedRoute>} />
              <Route path="/admin/audit-debug" element={<ProtectedRoute><AuditDebugPanelPage /></ProtectedRoute>} />
              <Route path="/admin/ops-wallboard" element={<ProtectedRoute><OpsWallboardPage /></ProtectedRoute>} />
              <Route path="/admin/outreach" element={<ProtectedRoute><AdminOutreachPage /></ProtectedRoute>} />
              <Route path="/admin/uae-ops" element={<ProtectedRoute><AdminUaeOpsDashboard /></ProtectedRoute>} />

              {/* Merchant claim & dashboard */}
              <Route path="/merchant/claim" element={<MerchantClaimPage />} />
              <Route path="/merchant/dashboard" element={<ProtectedRoute><MerchantDashboardPage /></ProtectedRoute>} />
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
                <Route path="/admin/operations-launchpad" element={<ProtectedRoute><AdminOperationsLaunchpadPage /></ProtectedRoute>} />
                <Route path="/merchant/customers/:merchantId" element={<ProtectedRoute><MerchantCustomersPage /></ProtectedRoute>} />
                <Route path="/admin/merchant-health" element={<ProtectedRoute><AdminMerchantHealthPage /></ProtectedRoute>} />
                <Route path="/admin/platform-recovery" element={<ProtectedRoute><AdminPlatformRecoveryPage /></ProtectedRoute>} />
                <Route path="/admin/shop-import" element={<ProtectedRoute><AdminShopImportPage /></ProtectedRoute>} />
                <Route path="/admin/visual-quality" element={<ProtectedRoute><AdminVisualQualityPage /></ProtectedRoute>} />
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
                <Route path="/support/shortcuts" element={<ProtectedRoute><CustomerSupportShortcutsPage /></ProtectedRoute>} />
                <Route path="/merchant/customer-insights/:merchantId" element={<ProtectedRoute><MerchantCustomerInsightsPage /></ProtectedRoute>} />
                <Route path="/admin/driver-heatmap" element={<ProtectedRoute><AdminDriverHeatmapPage /></ProtectedRoute>} />
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
                <Route path="/me/quick-help" element={<ProtectedRoute><CustomerQuickHelpPage /></ProtectedRoute>} />
                <Route path="/driver/shift" element={<ProtectedRoute><DriverShiftPage /></ProtectedRoute>} />
                <Route path="/admin/merchant-approval-queue" element={<ProtectedRoute><AdminMerchantApprovalQueuePage /></ProtectedRoute>} />
                <Route path="/me/delivery-notes" element={<ProtectedRoute><CustomerDeliveryNotesPage /></ProtectedRoute>} />
                <Route path="/merchant/staff-access/:merchantId" element={<ProtectedRoute><MerchantStaffAccessPage /></ProtectedRoute>} />
                <Route path="/admin/failed-payments" element={<ProtectedRoute><AdminFailedPaymentsPage /></ProtectedRoute>} />
                <Route path="/me/refer-friend" element={<ProtectedRoute><CustomerReferFriendPage /></ProtectedRoute>} />
                <Route path="/driver/documents" element={<ProtectedRoute><DriverDocumentsPage /></ProtectedRoute>} />
                <Route path="/admin/support-sla" element={<ProtectedRoute><AdminSupportSlaPage /></ProtectedRoute>} />
                <Route path="/checkout/address-selector" element={<ProtectedRoute><CustomerAddressSelectorPage /></ProtectedRoute>} />
                <Route path="/merchant/daily-sales/:merchantId" element={<ProtectedRoute><MerchantDailySalesPage /></ProtectedRoute>} />
                <Route path="/admin/delivery-incidents" element={<ProtectedRoute><AdminDeliveryIncidentsPage /></ProtectedRoute>} />
                <Route path="/me/payment-activity" element={<ProtectedRoute><CustomerPaymentActivityPage /></ProtectedRoute>} />
                <Route path="/driver/availability-zones" element={<ProtectedRoute><DriverAvailabilityZonesPage /></ProtectedRoute>} />
                <Route path="/admin/growth-dashboard" element={<ProtectedRoute><AdminGrowthDashboardPage /></ProtectedRoute>} />
                <Route path="/me/order-receipts" element={<ProtectedRoute><CustomerOrderReceiptsPage /></ProtectedRoute>} />
                <Route path="/merchant/refund-requests/:merchantId" element={<ProtectedRoute><MerchantRefundRequestsPage /></ProtectedRoute>} />
                <Route path="/admin/coupon-oversight" element={<ProtectedRoute><AdminCouponOversightPage /></ProtectedRoute>} />
                <Route path="/me/notification-center" element={<ProtectedRoute><CustomerNotificationCenterPage /></ProtectedRoute>} />
                <Route path="/driver/completed-deliveries" element={<ProtectedRoute><DriverCompletedDeliveriesPage /></ProtectedRoute>} />
                <Route path="/admin/active-sessions" element={<ProtectedRoute><AdminActiveSessionsPage /></ProtectedRoute>} />
                <Route path="/merchant/menu-bulk/:merchantId" element={<ProtectedRoute><MerchantMenuBulkEditPage /></ProtectedRoute>} />
                <Route path="/admin/fraud-monitor" element={<ProtectedRoute><AdminFraudMonitorPage /></ProtectedRoute>} />
                <Route path="/tracking-live/:orderId" element={<ProtectedRoute><CustomerLiveTrackingPage /></ProtectedRoute>} />
                <Route path="/merchant/live-orders/:merchantId" element={<ProtectedRoute><MerchantRealtimeOrdersBoard /></ProtectedRoute>} />
                <Route path="/admin/heatmap" element={<ProtectedRoute><AdminGlobalHeatmapPage /></ProtectedRoute>} />
                <Route path="/quick-reorder" element={<ProtectedRoute><CustomerQuickReorderPage /></ProtectedRoute>} />
                <Route path="/driver/live-missions" element={<ProtectedRoute><DriverLiveMissionsPage /></ProtectedRoute>} />
                <Route path="/admin/realtime-alerts" element={<ProtectedRoute><AdminRealtimeAlertsPage /></ProtectedRoute>} />
                <Route path="/checkout/schedule" element={<ProtectedRoute><CustomerOrderSchedulePage /></ProtectedRoute>} />
                <Route path="/merchant/open-close/:merchantId" element={<ProtectedRoute><MerchantOpenClosePage /></ProtectedRoute>} />
                <Route path="/admin/retention-dashboard" element={<ProtectedRoute><AdminRetentionDashboardPage /></ProtectedRoute>} />
                <Route path="/me/promo-wallet" element={<ProtectedRoute><CustomerPromoWalletPage /></ProtectedRoute>} />
                <Route path="/driver/break-mode" element={<ProtectedRoute><DriverBreakModePage /></ProtectedRoute>} />
                <Route path="/admin/merchant-performance" element={<ProtectedRoute><AdminMerchantPerformancePage /></ProtectedRoute>} />
                <Route path="/me/family-profiles" element={<ProtectedRoute><CustomerFamilyProfilesPage /></ProtectedRoute>} />
                <Route path="/merchant/prep-time/:merchantId" element={<ProtectedRoute><MerchantPrepTimePage /></ProtectedRoute>} />
                <Route path="/admin/refund-control" element={<ProtectedRoute><AdminRefundControlPage /></ProtectedRoute>} />
                <Route path="/checkout/tip" element={<ProtectedRoute><CustomerTippingPage /></ProtectedRoute>} />
                <Route path="/driver/acceptance-rate" element={<ProtectedRoute><DriverAcceptanceRatePage /></ProtectedRoute>} />
                <Route path="/admin/driver-performance" element={<ProtectedRoute><AdminDriverPerformancePage /></ProtectedRoute>} />
                <Route path="/me/subscriptions" element={<ProtectedRoute><CustomerSubscriptionsPage /></ProtectedRoute>} />
                <Route path="/merchant/promo-scheduler/:merchantId" element={<ProtectedRoute><MerchantPromoSchedulerPage /></ProtectedRoute>} />
                <Route path="/admin/dispute-center" element={<ProtectedRoute><AdminDisputeCenterPage /></ProtectedRoute>} />
                <Route path="/me/favorite-orders" element={<ProtectedRoute><CustomerFavoriteOrdersPage /></ProtectedRoute>} />
                <Route path="/driver/shift-scheduler" element={<ProtectedRoute><DriverShiftSchedulerPage /></ProtectedRoute>} />
                <Route path="/admin/global-finance" element={<ProtectedRoute><AdminGlobalFinancePage /></ProtectedRoute>} />
                {/* FS-FX */}
                <Route path="/admin/core-engine" element={<ProtectedRoute><AdminCoreEnginePage /></ProtectedRoute>} />
                {/* FY-GD */}
                <Route path="/checkout/group-order" element={<ProtectedRoute><CustomerGroupOrderPage /></ProtectedRoute>} />
                <Route path="/merchant/auto-accept-v2/:merchantId" element={<ProtectedRoute><MerchantAutoAcceptPage /></ProtectedRoute>} />
                <Route path="/admin/cashflow-monitor" element={<ProtectedRoute><AdminCashflowMonitorPage /></ProtectedRoute>} />
                <Route path="/me/address-book-v2" element={<ProtectedRoute><CustomerAddressBookPageV2 /></ProtectedRoute>} />
                <Route path="/driver/navigation-mode" element={<ProtectedRoute><DriverNavigationModePage /></ProtectedRoute>} />
                <Route path="/admin/city-ops" element={<ProtectedRoute><AdminCityOpsPage /></ProtectedRoute>} />
                {/* GE-GJ */}
                <Route path="/me/meal-planner" element={<ProtectedRoute><CustomerMealPlannerPage /></ProtectedRoute>} />
                <Route path="/merchant/delivery-zones/:merchantId" element={<ProtectedRoute><MerchantDeliveryZonesPage /></ProtectedRoute>} />
                <Route path="/admin/operator-notes" element={<ProtectedRoute><AdminOperatorNotesPage /></ProtectedRoute>} />
                <Route path="/me/receipt-vault" element={<ProtectedRoute><CustomerReceiptVaultPage /></ProtectedRoute>} />
                <Route path="/driver/vehicle-profile" element={<ProtectedRoute><DriverVehicleProfilePage /></ProtectedRoute>} />
                <Route path="/admin/network-status" element={<ProtectedRoute><AdminNetworkStatusPage /></ProtectedRoute>} />
                {/* GK-GP */}
                <Route path="/me/shared-wallet" element={<ProtectedRoute><CustomerSharedWalletPage /></ProtectedRoute>} />
                <Route path="/admin/sla-monitor" element={<ProtectedRoute><AdminSlaMonitorPage /></ProtectedRoute>} />
                <Route path="/checkout/gift-order" element={<ProtectedRoute><CustomerOrderGiftsPage /></ProtectedRoute>} />
                <Route path="/admin/incident-center" element={<ProtectedRoute><AdminIncidentCenterPage /></ProtectedRoute>} />
                {/* GQ-GV */}
                <Route path="/checkout/split-bill" element={<ProtectedRoute><CustomerSplitBillPage /></ProtectedRoute>} />
                <Route path="/merchant/kitchen-display/:merchantId" element={<ProtectedRoute><MerchantKitchenDisplayPage /></ProtectedRoute>} />
                <Route path="/admin/order-audit" element={<ProtectedRoute><AdminOrderAuditPage /></ProtectedRoute>} />
                <Route path="/checkout/delivery-instructions" element={<ProtectedRoute><CustomerDeliveryInstructionsPage /></ProtectedRoute>} />
                <Route path="/driver/daily-target" element={<ProtectedRoute><DriverDailyTargetPage /></ProtectedRoute>} />
                <Route path="/admin/market-expansion" element={<ProtectedRoute><AdminMarketExpansionPage /></ProtectedRoute>} />
                {/* GW-HB */}
                <Route path="/me/saved-carts" element={<ProtectedRoute><CustomerSavedCartsPage2 /></ProtectedRoute>} />
                <Route path="/merchant/out-of-stock/:merchantId" element={<ProtectedRoute><MerchantOutOfStockPage /></ProtectedRoute>} />
                <Route path="/admin/fraud-watch" element={<ProtectedRoute><AdminFraudWatchPage /></ProtectedRoute>} />
                <Route path="/checkout/contactless" element={<ProtectedRoute><CustomerContactlessPage /></ProtectedRoute>} />
                <Route path="/driver/hot-zones" element={<ProtectedRoute><DriverHotZonesPage /></ProtectedRoute>} />
                <Route path="/admin/demand-forecast" element={<ProtectedRoute><AdminDemandForecastPage /></ProtectedRoute>} />
                {/* HC-HH */}
                <Route path="/me/auto-repeat" element={<ProtectedRoute><CustomerAutoRepeatPage /></ProtectedRoute>} />
                <Route path="/merchant/rush-mode/:merchantId" element={<ProtectedRoute><MerchantRushModePage /></ProtectedRoute>} />
                <Route path="/admin/refund-queue" element={<ProtectedRoute><AdminRefundQueuePage /></ProtectedRoute>} />
                <Route path="/checkout/party-order" element={<ProtectedRoute><CustomerPartyOrderPage /></ProtectedRoute>} />
                <Route path="/driver/earnings-breakdown" element={<ProtectedRoute><DriverEarningsBreakdownPage /></ProtectedRoute>} />
                <Route path="/admin/platform-health" element={<ProtectedRoute><AdminPlatformHealthPage /></ProtectedRoute>} />
                {/* HI-HN */}
                <Route path="/checkout/office-lunch" element={<ProtectedRoute><CustomerOfficeLunchPage /></ProtectedRoute>} />
                <Route path="/merchant/delivery-fees/:merchantId" element={<ProtectedRoute><MerchantDeliveryFeesPage /></ProtectedRoute>} />
                <Route path="/admin/driver-compliance" element={<ProtectedRoute><AdminDriverCompliancePage /></ProtectedRoute>} />
                <Route path="/me/redeem-rewards" element={<ProtectedRoute><CustomerRewardRedemptionPage /></ProtectedRoute>} />
                <Route path="/driver/fuel-costs" element={<ProtectedRoute><DriverFuelCostPage /></ProtectedRoute>} />
                <Route path="/admin/executive-overview" element={<ProtectedRoute><AdminExecutiveOverviewPage /></ProtectedRoute>} />
                {/* HO-HT */}
                <Route path="/admin/system-live" element={<ProtectedRoute><AdminSystemLivePanelPage /></ProtectedRoute>} />
                {/* HU-HZ */}
                <Route path="/admin/restaurant-autofill" element={<ProtectedRoute><AdminRestaurantFillPage /></ProtectedRoute>} />
                {/* IA-IF */}
                <Route path="/payments/stripe-handler" element={<ProtectedRoute><StripeCheckoutHandlerPage /></ProtectedRoute>} />
                <Route path="/admin/payment-go-live" element={<ProtectedRoute><AdminPaymentGoLivePage /></ProtectedRoute>} />
                <Route path="/admin/go-live-readiness" element={<ProtectedRoute><AdminGoLiveReadinessPage /></ProtectedRoute>} />
                {/* IG-IL */}
                <Route path="/admin/ui-finalizer" element={<ProtectedRoute><AdminUiFinalizerPage /></ProtectedRoute>} />
                {/* IM-IR */}
                <Route path="/admin/master-control" element={<ProtectedRoute><AdminMasterControlPage /></ProtectedRoute>} />
                {/* IS-IX */}
                <Route path="/admin/production-checklist" element={<ProtectedRoute><AdminProductionChecklistPage /></ProtectedRoute>} />
                <Route path="/admin/final-wrap" element={<ProtectedRoute><AdminFinalWrapPage /></ProtectedRoute>} />
                {/* JA-JF */}
                <Route path="/admin/qa-command" element={<ProtectedRoute><AdminQaCommandPage /></ProtectedRoute>} />
                {/* KA-KF */}
                <Route path="/live-tracking" element={<ProtectedRoute><LiveTrackingPageNew /></ProtectedRoute>} />
                {/* LG-LR */}
                <Route path="/driver/fuel-costs-v2" element={<ProtectedRoute><DriverFuelCostsPage /></ProtectedRoute>} />
                <Route path="/driver/compliance" element={<ProtectedRoute><DriverCompliancePage /></ProtectedRoute>} />
                <Route path="/driver/breaks" element={<ProtectedRoute><DriverBreaksPage /></ProtectedRoute>} />
                <Route path="/driver/shift-planner" element={<ProtectedRoute><DriverShiftPlannerPage /></ProtectedRoute>} />
                <Route path="/admin/driver-compliance-ops" element={<ProtectedRoute><AdminDriverComplianceOpsPage /></ProtectedRoute>} />
                <Route path="/admin/marketplace-experiments" element={<ProtectedRoute><AdminMarketplaceExperimentsPage /></ProtectedRoute>} />
                <Route path="/checkout/scheduled-order" element={<ProtectedRoute><CustomerScheduledOrderPage /></ProtectedRoute>} />
                <Route path="/merchant/staff-roles/:merchantId" element={<ProtectedRoute><MerchantStaffRolesPage /></ProtectedRoute>} />
                <Route path="/merchant/permissions/:merchantId" element={<ProtectedRoute><MerchantPermissionsMatrixPage /></ProtectedRoute>} />
                <Route path="/merchant/business-hours/:merchantId" element={<ProtectedRoute><MerchantBusinessHoursPage /></ProtectedRoute>} />
                {/* MA-MW */}
                <Route path="/admin/region-performance" element={<ProtectedRoute><AdminRegionPerformancePage /></ProtectedRoute>} />
                <Route path="/admin/courier-heatmap" element={<ProtectedRoute><AdminCourierHeatmapPage /></ProtectedRoute>} />
                <Route path="/admin/customer-retention" element={<ProtectedRoute><AdminCustomerRetentionPage /></ProtectedRoute>} />
                <Route path="/checkout/party-split-links" element={<ProtectedRoute><CustomerPartySplitLinksPage /></ProtectedRoute>} />
                <Route path="/checkout/share-cart" element={<ProtectedRoute><CustomerShareCartPage /></ProtectedRoute>} />
                <Route path="/merchant/rush-pricing/:merchantId" element={<ProtectedRoute><MerchantRushPricingPage /></ProtectedRoute>} />
                <Route path="/admin/growth-campaigns" element={<ProtectedRoute><AdminGrowthCampaignsPage /></ProtectedRoute>} />
                <Route path="/admin/promo-performance" element={<ProtectedRoute><AdminPromoPerformancePage /></ProtectedRoute>} />
                <Route path="/me/payment-methods" element={<ProtectedRoute><CustomerPaymentMethodsHubPage /></ProtectedRoute>} />
                <Route path="/me/order-preferences" element={<ProtectedRoute><CustomerOrderPreferencesPage /></ProtectedRoute>} />
                <Route path="/merchant/packaging/:merchantId" element={<ProtectedRoute><MerchantPackagingSettingsPage /></ProtectedRoute>} />
                <Route path="/merchant/order-throttle/:merchantId" element={<ProtectedRoute><MerchantOrderThrottlePage /></ProtectedRoute>} />
                <Route path="/admin/acquisition-funnel" element={<ProtectedRoute><AdminAcquisitionFunnelPage /></ProtectedRoute>} />
                <Route path="/admin/driver-incentives" element={<ProtectedRoute><AdminDriverIncentivesPage /></ProtectedRoute>} />
                <Route path="/me/family-profile" element={<ProtectedRoute><CustomerFamilyProfilePage /></ProtectedRoute>} />
                <Route path="/me/favorite-items" element={<ProtectedRoute><CustomerFavoriteItemsPage /></ProtectedRoute>} />
                <Route path="/merchant/cancellation-rules/:merchantId" element={<ProtectedRoute><MerchantCancellationRulesPage /></ProtectedRoute>} />
                <Route path="/merchant/chat-settings/:merchantId" element={<ProtectedRoute><MerchantCustomerChatSettingsPage /></ProtectedRoute>} />
                {/* MX-OG */}
                <Route path="/admin/city-launch-checklist" element={<ProtectedRoute><AdminCityLaunchChecklistPage /></ProtectedRoute>} />
                <Route path="/admin/restaurant-autofill-v2" element={<ProtectedRoute><AdminRestaurantAutofillPage2 /></ProtectedRoute>} />
                <Route path="/admin/system-live-status" element={<ProtectedRoute><AdminSystemLiveStatusPage /></ProtectedRoute>} />
                <Route path="/me/quick-reorder" element={<ProtectedRoute><CustomerQuickReorderHubPage /></ProtectedRoute>} />
                <Route path="/merchant/live-ops/:merchantId" element={<ProtectedRoute><MerchantLiveOpsPanelPage /></ProtectedRoute>} />
                <Route path="/admin/central-control" element={<ProtectedRoute><CentralControlPanelPage /></ProtectedRoute>} />
                <Route path="/admin/live-incident-feed" element={<ProtectedRoute><AdminLiveIncidentFeedPage /></ProtectedRoute>} />
                <Route path="/admin/risk-scoreboard" element={<ProtectedRoute><AdminRiskScoreboardPage /></ProtectedRoute>} />
                <Route path="/admin/store-readiness-matrix" element={<ProtectedRoute><AdminStoreReadinessMatrixPage /></ProtectedRoute>} />
                <Route path="/checkout/bulk-party-builder" element={<ProtectedRoute><CustomerBulkPartyBuilderPage /></ProtectedRoute>} />
                <Route path="/checkout/dinner-planner" element={<ProtectedRoute><CustomerDinnerPlannerPage /></ProtectedRoute>} />
                <Route path="/merchant/auto-accept-rules/:merchantId" element={<ProtectedRoute><MerchantAutoAcceptRulesPage /></ProtectedRoute>} />
                <Route path="/merchant/driver-handoff/:merchantId" element={<ProtectedRoute><MerchantDriverHandoffPage /></ProtectedRoute>} />
                {/* OH-PI */}
                <Route path="/admin/dispatch-tuning" element={<ProtectedRoute><AdminDispatchTuningPage /></ProtectedRoute>} />
                <Route path="/admin/payment-watch" element={<ProtectedRoute><AdminPaymentWatchPage /></ProtectedRoute>} />
                <Route path="/me/weekly-meal-plan" element={<ProtectedRoute><CustomerWeeklyMealPlanPage /></ProtectedRoute>} />
                <Route path="/me/kids-meal-profile" element={<ProtectedRoute><CustomerKidsMealProfilePage /></ProtectedRoute>} />
                <Route path="/merchant/menu-categories/:merchantId" element={<ProtectedRoute><MerchantMenuCategoryManagerPage /></ProtectedRoute>} />
                <Route path="/merchant/item-badges/:merchantId" element={<ProtectedRoute><MerchantItemBadgesPage /></ProtectedRoute>} />
                <Route path="/merchant/instructions-policy/:merchantId" element={<ProtectedRoute><MerchantInstructionsPolicyPage /></ProtectedRoute>} />
                <Route path="/admin/menu-quality" element={<ProtectedRoute><AdminMenuQualityPage /></ProtectedRoute>} />
                <Route path="/admin/delivery-latency" element={<ProtectedRoute><AdminDeliveryLatencyPage /></ProtectedRoute>} />
                <Route path="/me/lunch-subscription" element={<ProtectedRoute><CustomerLunchSubscriptionPage /></ProtectedRoute>} />
                <Route path="/checkout/family-night" element={<ProtectedRoute><CustomerFamilyNightPage /></ProtectedRoute>} />
                <Route path="/merchant/menu-cloner/:merchantId" element={<ProtectedRoute><MerchantMenuClonerPage /></ProtectedRoute>} />
                <Route path="/merchant/featured-items/:merchantId" element={<ProtectedRoute><MerchantFeaturedItemsPage /></ProtectedRoute>} />
                <Route path="/merchant/holiday-schedule/:merchantId" element={<ProtectedRoute><MerchantHolidaySchedulePage /></ProtectedRoute>} />
                <Route path="/admin/driver-payouts" element={<ProtectedRoute><AdminDriverPayoutsPage /></ProtectedRoute>} />
                <Route path="/admin/merchant-payouts" element={<ProtectedRoute><AdminMerchantPayoutsPage /></ProtectedRoute>} />
                <Route path="/admin/wallet-recon" element={<ProtectedRoute><AdminWalletReconPage /></ProtectedRoute>} />
                <Route path="/checkout/guest-profile" element={<ProtectedRoute><CustomerGuestCheckoutProfilePage /></ProtectedRoute>} />
                <Route path="/checkout/dinner-budget" element={<ProtectedRoute><CustomerDinnerBudgetPage /></ProtectedRoute>} />
                <Route path="/merchant/store-announcement/:merchantId" element={<ProtectedRoute><MerchantStoreAnnouncementPage /></ProtectedRoute>} />
                <Route path="/merchant/temporary-closure/:merchantId" element={<ProtectedRoute><MerchantTemporaryClosurePage /></ProtectedRoute>} />
                <Route path="/merchant/queue-limit/:merchantId" element={<ProtectedRoute><MerchantQueueLimitPage /></ProtectedRoute>} />
                {/* PJ-PO */}
                <Route path="/admin/notification-campaigns" element={<ProtectedRoute><AdminNotificationCampaignsPage /></ProtectedRoute>} />
                <Route path="/admin/customer-segments" element={<ProtectedRoute><AdminCustomerSegmentsPage /></ProtectedRoute>} />
                <Route path="/admin/merchant-segments" element={<ProtectedRoute><AdminMerchantSegmentsPage /></ProtectedRoute>} />

              {/* Guest / Public */}
              <Route path="/guest/checkout/:cartId" element={<GuestCheckoutPage />} />
              <Route path="/payment/:orderId" element={<PaymentPage />} />
              <Route path="/store/:publicSlug" element={<PublicStorefrontBySlugPage />} />

              <Route path="/app/orbit" element={<Navigate to="/" replace />} />
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
