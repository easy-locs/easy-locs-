/**
 * lazy-pages — Centralized lazy-loaded page registry.
 * Single responsibility: chunk import declarations.
 * No logic, no routing — just page references.
 */
import { safeLazy } from "./safe-lazy";

// ── Auth ──
export const Login = safeLazy(() => import("@/pages/Login"), "Login");
export const Signup = safeLazy(() => import("@/pages/Signup"), "Signup");
export const ForgotPassword = safeLazy(() => import("@/pages/ForgotPassword"), "ForgotPassword");
export const ResetPassword = safeLazy(() => import("@/pages/ResetPassword"), "ResetPassword");
export const VerifyEmail = safeLazy(() => import("@/pages/VerifyEmail"), "VerifyEmail");
export const AuthCallbackPage = safeLazy(() => import("@/pages/AuthCallbackPage"), "AuthCallbackPage");
export const TenantSignup = safeLazy(() => import("@/pages/TenantSignup"), "TenantSignup");

// ── Core Pages ──
export const Index = safeLazy(() => import("@/pages/Index"), "Index");
export const Onboarding = safeLazy(() => import("@/pages/Onboarding"), "Onboarding");
export const Dashboard = safeLazy(() => import("@/pages/Dashboard"), "Dashboard");
export const Install = safeLazy(() => import("@/pages/Install"), "Install");
export const NotFound = safeLazy(() => import("@/pages/NotFound"), "NotFound");
export const AppNotFoundPage = safeLazy(() => import("@/pages/AppNotFoundPage"), "AppNotFoundPage");

// ── Dashboard Sub-Pages ──
export const Receipts = safeLazy(() => import("@/pages/Receipts"), "Receipts");
export const Reminders = safeLazy(() => import("@/pages/Reminders"), "Reminders");
export const Documents = safeLazy(() => import("@/pages/Documents"), "Documents");
export const AIAssistant = safeLazy(() => import("@/pages/AIAssistant"), "AIAssistant");
export const Leases = safeLazy(() => import("@/pages/Leases"), "Leases");
export const Company = safeLazy(() => import("@/pages/Company"), "Company");
export const Billing = safeLazy(() => import("@/pages/Billing"), "Billing");
export const Settings = safeLazy(() => import("@/pages/Settings"), "Settings");
export const Tenants = safeLazy(() => import("@/pages/Tenants"), "Tenants");
export const RentalManagement = safeLazy(() => import("@/pages/RentalManagement"), "RentalManagement");
export const Finances = safeLazy(() => import("@/pages/Finances"), "Finances");
export const Interventions = safeLazy(() => import("@/pages/Interventions"), "Interventions");
export const Tasks = safeLazy(() => import("@/pages/Tasks"), "Tasks");
export const Messages = safeLazy(() => import("@/pages/Messages"), "Messages");
export const CommunicationCenter = safeLazy(() => import("@/pages/CommunicationCenter"), "CommunicationCenter");
export const ChargesRegularization = safeLazy(() => import("@/pages/ChargesRegularization"), "ChargesRegularization");
export const FiscalReport = safeLazy(() => import("@/pages/FiscalReport"), "FiscalReport");
export const Expenses = safeLazy(() => import("@/pages/Expenses"), "Expenses");
export const Candidates = safeLazy(() => import("@/pages/Candidates"), "Candidates");
export const SeasonalRentals = safeLazy(() => import("@/pages/SeasonalRentals"), "SeasonalRentals");
export const PaymentNotices = safeLazy(() => import("@/pages/PaymentNotices"), "PaymentNotices");
export const DunningLetters = safeLazy(() => import("@/pages/DunningLetters"), "DunningLetters");
export const FurnitureInventory = safeLazy(() => import("@/pages/FurnitureInventory"), "FurnitureInventory");
export const Buildings = safeLazy(() => import("@/pages/Buildings"), "Buildings");
export const Vault = safeLazy(() => import("@/pages/Vault"), "Vault");
export const DataImport = safeLazy(() => import("@/pages/DataImport"), "DataImport");
export const CVGenerator = safeLazy(() => import("@/pages/CVGenerator"), "CVGenerator");
export const CategorySubscriptions = safeLazy(() => import("@/pages/CategorySubscriptions"), "CategorySubscriptions");
export const ChannelManager = safeLazy(() => import("@/pages/ChannelManager"), "ChannelManager");
export const Accounting = safeLazy(() => import("@/pages/Accounting"), "Accounting");
export const LandlordRentDashboard = safeLazy(() => import("@/pages/LandlordRentDashboard"), "LandlordRentDashboard");
export const AccountingEntries = safeLazy(() => import("@/pages/AccountingEntries"), "AccountingEntries");
export const ReportingDashboard = safeLazy(() => import("@/pages/ReportingDashboard"), "ReportingDashboard");
export const DynamicPricing = safeLazy(() => import("@/pages/DynamicPricing"), "DynamicPricing");
export const PropertyCalendar = safeLazy(() => import("@/pages/PropertyCalendar"), "PropertyCalendar");
export const RealEstateListings = safeLazy(() => import("@/pages/RealEstateListings"), "RealEstateListings");
export const LandlordProfile = safeLazy(() => import("@/pages/LandlordProfile"), "LandlordProfile");
export const Referrals = safeLazy(() => import("@/pages/Referrals"), "Referrals");
export const Collaboration = safeLazy(() => import("@/pages/Collaboration"), "Collaboration");
export const DeveloperPortal = safeLazy(() => import("@/pages/DeveloperPortal"), "DeveloperPortal");
export const AuditTrail = safeLazy(() => import("@/pages/AuditTrail"), "AuditTrail");
export const CountryWorkspace = safeLazy(() => import("@/pages/CountryWorkspace"), "CountryWorkspace");
export const PropertyManagement = safeLazy(() => import("@/pages/PropertyManagement"), "PropertyManagement");
export const AddProperty = safeLazy(() => import("@/pages/AddProperty"), "AddProperty");
export const PropertyDetailHub = safeLazy(() => import("@/pages/PropertyDetailHub"), "PropertyDetailHub");
export const CreateListing = safeLazy(() => import("@/pages/CreateListing"), "CreateListing");

// ── Orbit / Wallet ──
export const OrbitAppShell = safeLazy(() => import("@/components/orbit/OrbitAppShell"), "OrbitAppShell");
export const OrbitHome = safeLazy(() => import("@/pages/OrbitHome"), "OrbitHome");
export const WalletHubPage = safeLazy(() => import("@/pages/WalletHubPage"), "WalletHubPage");
export const OrbitIdentityPage = safeLazy(() => import("@/pages/OrbitIdentityPage"), "OrbitIdentityPage");
export const OrbitContactsPage = safeLazy(() => import("@/pages/OrbitContactsPageV2"), "OrbitContactsPage");

// ── Marketplace / Commerce ──
export const LocalServices = safeLazy(() => import("@/pages/LocalServices"), "LocalServices");
export const RentalCatalog = safeLazy(() => import("@/pages/RentalCatalog"), "RentalCatalog");
export const StaysCatalog = safeLazy(() => import("@/pages/StaysCatalog"), "StaysCatalog");
export const HostCatalog = safeLazy(() => import("@/pages/HostCatalog"), "HostCatalog");
export const ActivitiesMarketplace = safeLazy(() => import("@/pages/ActivitiesMarketplace"), "ActivitiesMarketplace");
export const GuestPortal = safeLazy(() => import("@/pages/GuestPortal"), "GuestPortal");
export const ProviderStorefront = safeLazy(() => import("@/components/marketplace/ProviderStorefront"), "ProviderStorefront");
export const StorePage = safeLazy(() => import("@/pages/StorePage"), "StorePage");
export const ShopCategoryPage = safeLazy(() => import("@/pages/ShopCategoryPage"), "ShopCategoryPage");
export const PublicListing = safeLazy(() => import("@/pages/PublicListing"), "PublicListing");
export const PublicServiceBooking = safeLazy(() => import("@/pages/PublicServiceBooking"), "PublicServiceBooking");
export const PublicRealEstateListing = safeLazy(() => import("@/pages/PublicRealEstateListing"), "PublicRealEstateListing");
export const PropertiesShowcase = safeLazy(() => import("@/pages/PropertiesShowcase"), "PropertiesShowcase");
export const AccountShowcase = safeLazy(() => import("@/pages/AccountShowcase"), "AccountShowcase");
export const SavedListings = safeLazy(() => import("@/pages/SavedListings"), "SavedListings");
export const ShopPage = safeLazy(() => import("@/pages/ShopPage"), "ShopPage");
export const MyShopPage = safeLazy(() => import("@/pages/MyShopPage"), "MyShopPage");
export const ShopsPage = safeLazy(() => import("@/pages/ShopsPage"), "ShopsPage");
export const CityMarketplacePage = safeLazy(() => import("@/pages/CityMarketplacePage"), "CityMarketplacePage");
export const ExplorePage = safeLazy(() => import("@/pages/ExplorePage"), "ExplorePage");

// ── Real Estate Module ──
export const RealEstateModulePage = safeLazy(() => import("@/pages/real-estate/RealEstateModule"), "RealEstateModule");
export const REPropertiesPage = safeLazy(() => import("@/pages/real-estate/PropertiesPage"), "REProperties");
export const REUnitsPage = safeLazy(() => import("@/pages/real-estate/UnitsPage"), "REUnits");
export const RETenantsPage = safeLazy(() => import("@/pages/real-estate/TenantsPage"), "RETenants");
export const RELeasesPage = safeLazy(() => import("@/pages/real-estate/LeasesPage"), "RELeases");
export const REPaymentsPage = safeLazy(() => import("@/pages/real-estate/PaymentsPage"), "REPayments");
export const REDocumentsPage = safeLazy(() => import("@/pages/real-estate/DocumentsPage"), "REDocuments");
export const REPropertyDetailPage = safeLazy(() => import("@/pages/real-estate/PropertyDetailPage"), "REPropertyDetail");
export const RELeaseDetailPage = safeLazy(() => import("@/pages/real-estate/LeaseDetailPage"), "RELeaseDetail");

// ── Tenant Pages ──
export const TenantDashboard = safeLazy(() => import("@/pages/tenant/TenantDashboard"), "TenantDashboard");
export const TenantReceipts = safeLazy(() => import("@/pages/tenant/TenantReceipts"), "TenantReceipts");
export const TenantDocuments = safeLazy(() => import("@/pages/tenant/TenantDocuments"), "TenantDocuments");
export const TenantMessages = safeLazy(() => import("@/pages/tenant/TenantMessages"), "TenantMessages");
export const TenantPay = safeLazy(() => import("@/pages/tenant/TenantPay"), "TenantPay");
export const TenantSettings = safeLazy(() => import("@/pages/tenant/TenantSettings"), "TenantSettings");
export const TenantReviews = safeLazy(() => import("@/pages/tenant/TenantReviews"), "TenantReviews");
export const TenantRequests = safeLazy(() => import("@/pages/tenant/TenantRequests"), "TenantRequests");

// ── Client Pages ──
export const ClientDashboard = safeLazy(() => import("@/pages/client/ClientDashboard"), "ClientDashboard");
export const ClientBookings = safeLazy(() => import("@/pages/client/ClientBookings"), "ClientBookings");
export const ClientMessages = safeLazy(() => import("@/pages/client/ClientMessages"), "ClientMessages");
export const ClientDocuments = safeLazy(() => import("@/pages/client/ClientDocuments"), "ClientDocuments");
export const ClientPayments = safeLazy(() => import("@/pages/client/ClientPayments"), "ClientPayments");
export const ClientSettings = safeLazy(() => import("@/pages/client/ClientSettings"), "ClientSettings");

// ── Mobility ──
export const MobilityTaxiPage = safeLazy(() => import("@/pages/mobility/MobilityTaxiPage"), "MobilityTaxiPage");
export const MobilityDeliveryPage = safeLazy(() => import("@/pages/mobility/MobilityDeliveryPage"), "MobilityDeliveryPage");
export const DeliveryBringPage = safeLazy(() => import("@/pages/mobility/DeliveryBringPage"), "DeliveryBringPage");
export const DeliveryParcelPage = safeLazy(() => import("@/pages/mobility/DeliveryParcelPage"), "DeliveryParcelPage");
export const DeliveryGiftPage = safeLazy(() => import("@/pages/mobility/DeliveryGiftPage"), "DeliveryGiftPage");
export const DeliveryErrandPage = safeLazy(() => import("@/pages/mobility/DeliveryErrandPage"), "DeliveryErrandPage");
export const RiderLivePage = safeLazy(() => import("@/pages/mobility/RiderLivePage"), "RiderLivePage");
export const TrackRidePage = safeLazy(() => import("@/pages/TrackRidePage"), "TrackRidePage");
export const PayRidePage = safeLazy(() => import("@/pages/PayRidePage"), "PayRidePage");
export const RideReceiptPage = safeLazy(() => import("@/pages/RideReceiptPage"), "RideReceiptPage");
export const CallDriverPage = safeLazy(() => import("@/pages/CallDriverPage"), "CallDriverPage");
export const DriverPayoutPage = safeLazy(() => import("@/pages/DriverPayoutPage"), "DriverPayoutPage");
export const DriverDashboard = safeLazy(() => import("@/pages/DriverDashboard"), "DriverDashboard");
export const DriverLivePage = safeLazy(() => import("@/pages/DriverLivePage"), "DriverLivePage");
export const DeliveryCommandCenter = safeLazy(() => import("@/pages/DeliveryCommandCenter"), "DeliveryCommandCenter");

// ── Travel ──
export const TravelHub = safeLazy(() => import("@/pages/travel/TravelHub"), "TravelHub");
export const TravelFlights = safeLazy(() => import("@/pages/travel/TravelFlights"), "TravelFlights");
export const TravelStays = safeLazy(() => import("@/pages/travel/TravelStayHub"), "TravelStayHub");
export const TravelHotelDetail = safeLazy(() => import("@/pages/travel/TravelHotelDetail"), "TravelHotelDetail");
export const HotelCheckout = safeLazy(() => import("@/pages/travel/HotelCheckout"), "HotelCheckout");
export const TravelStayDetail = safeLazy(() => import("@/pages/travel/TravelStayDetail"), "TravelStayDetail");
export const TravelFlightDetail = safeLazy(() => import("@/pages/travel/TravelFlightDetail"), "TravelFlightDetail");

// ── Universe Hubs ──
export const FoodHub = safeLazy(() => import("@/pages/universe/FoodHub"), "FoodHub");
export const GroceryHub = safeLazy(() => import("@/pages/universe/GroceryHub"), "GroceryHub");
export const ServicesHub = safeLazy(() => import("@/pages/universe/ServicesHub"), "ServicesHub");
export const RetailHub = safeLazy(() => import("@/pages/universe/RetailHub"), "RetailHub");
export const PropertyHubUniverse = safeLazy(() => import("@/pages/universe/PropertyHub"), "PropertyHubUniverse");
export const DiscoverPage = safeLazy(() => import("@/pages/universe/DiscoverPage"), "DiscoverPage");
export const HealthcareHub = safeLazy(() => import("@/pages/universe/HealthcareHub"), "HealthcareHub");
export const ElectronicsHub = safeLazy(() => import("@/pages/universe/ElectronicsHub"), "ElectronicsHub");
export const GiftsHub = safeLazy(() => import("@/pages/universe/GiftsHub"), "GiftsHub");
export const PetsHub = safeLazy(() => import("@/pages/universe/PetsHub"), "PetsHub");
export const BrowseVerticalPage = safeLazy(() => import("@/pages/universe/BrowseVerticalPage"), "BrowseVerticalPage");
export const RetailIndexPage = safeLazy(() => import("@/pages/universe/RetailIndexPage"), "RetailIndexPage");
export const RetailCategoryPage = safeLazy(() => import("@/pages/universe/RetailCategoryPage"), "RetailCategoryPage");
export const RetailMallPage = safeLazy(() => import("@/pages/universe/RetailMallPage"), "RetailMallPage");
export const RetailStorePage = safeLazy(() => import("@/pages/universe/RetailStorePage"), "RetailStorePage");

// ── Food Sub-Pages ──
export const FoodTypePage = safeLazy(() => import("@/pages/food/FoodTypePage"), "FoodTypePage");
export const CuisineListPage = safeLazy(() => import("@/pages/food/CuisineListPage"), "CuisineListPage");
export const FoodRestaurantPage = safeLazy(() => import("@/pages/food/RestaurantPage"), "FoodRestaurantPage");

// ── Settings Sub-Pages ──
export const SettingsHomePage = safeLazy(() => import("@/pages/settings/SettingsHome"), "SettingsHome");
export const SettingsAccountPage = safeLazy(() => import("@/pages/settings/SettingsAccount"), "SettingsAccount");
export const SettingsOrbitPage = safeLazy(() => import("@/pages/settings/SettingsOrbit"), "SettingsOrbit");
export const SettingsBusinessPage = safeLazy(() => import("@/pages/settings/SettingsBusiness"), "SettingsBusiness");
export const SettingsWalletPage = safeLazy(() => import("@/pages/settings/SettingsWallet"), "SettingsWallet");
export const SettingsAddressesPage = safeLazy(() => import("@/pages/settings/SettingsAddresses"), "SettingsAddresses");
export const SettingsNotificationsPage = safeLazy(() => import("@/pages/settings/SettingsNotifications"), "SettingsNotifications");
export const SettingsSecurityPage = safeLazy(() => import("@/pages/settings/SettingsSecurity"), "SettingsSecurity");
export const SettingsPreferencesPage = safeLazy(() => import("@/pages/settings/SettingsPreferences"), "SettingsPreferences");
export const SettingsSupportPage = safeLazy(() => import("@/pages/settings/SettingsSupport"), "SettingsSupport");
export const SettingsPaymentMethodsPage = safeLazy(() => import("@/pages/settings/SettingsPaymentMethods"), "SettingsPaymentMethods");
export const NotificationPreferencesPage = safeLazy(() => import("@/pages/settings/NotificationPreferencesPage"), "NotificationPreferencesPage");

// ── Deep-Link / Payment Pages ──
export const UserProfilePage = safeLazy(() => import("@/pages/deep-link/UserProfilePage"), "UserProfilePage");
export const ProductPage = safeLazy(() => import("@/pages/deep-link/ProductPage"), "ProductPage");
export const LivePage = safeLazy(() => import("@/pages/deep-link/LivePage"), "LivePage");
export const PayPage = safeLazy(() => import("@/pages/deep-link/PayPage"), "PayPage");
export const QrPayResolver = safeLazy(() => import("@/pages/deep-link/QrPayResolver"), "QrPayResolver");
export const QrResolvePage = safeLazy(() => import("@/pages/deep-link/QrResolvePage"), "QrResolvePage");
export const PayRequestPage = safeLazy(() => import("@/pages/deep-link/PayRequestPage"), "PayRequestPage");
export const GuestPaymentSuccess = safeLazy(() => import("@/pages/deep-link/GuestPaymentSuccess"), "GuestPaymentSuccess");
export const QrScannerPage = safeLazy(() => import("@/pages/payments/QrScannerPage"), "QrScannerPage");
export const QrEntryPage = safeLazy(() => import("@/pages/QrEntryPage"), "QrEntryPage");
export const QrTrackingPage = safeLazy(() => import("@/pages/qr/QrTrackingPage"), "QrTrackingPage");
export const QrPickupPage = safeLazy(() => import("@/pages/qr/QrPickupPage"), "QrPickupPage");
export const QrGeneratePage = safeLazy(() => import("@/pages/QrGeneratePage"), "QrGeneratePage");
export const AddContactPage = safeLazy(() => import("@/pages/AddContactPage"), "AddContactPage");
export const PaymentLinkResolverPage = safeLazy(() => import("@/pages/pay/PaymentLinkResolverPage"), "PaymentLinkResolverPage");
export const PaymentConfirmPage = safeLazy(() => import("@/pages/pay/PaymentConfirmPage"), "PaymentConfirmPage");

// ── Legal ──
export const TermsPage = safeLazy(() => import("@/pages/legal/TermsPage"), "TermsPage");
export const PrivacyPage = safeLazy(() => import("@/pages/legal/PrivacyPage"), "PrivacyPage");
export const CookiePage = safeLazy(() => import("@/pages/legal/CookiePage"), "CookiePage");
export const LegalNoticePage = safeLazy(() => import("@/pages/legal/LegalNoticePage"), "LegalNoticePage");
export const AboutPage = safeLazy(() => import("@/pages/legal/AboutPage"), "AboutPage");
export const ContactPage = safeLazy(() => import("@/pages/legal/ContactPage"), "ContactPage");
export const HelpPage = safeLazy(() => import("@/pages/legal/HelpPage"), "HelpPage");
export const PlatformVision = safeLazy(() => import("@/pages/PlatformVision"), "PlatformVision");

// ── SEO ──
export const SEOCatchAll = safeLazy(() => import("@/pages/seo/SEOCatchAll"), "SEOCatchAll");
export const ConciergeServicesPage = safeLazy(() => import("@/pages/seo/ConciergeServicesPage"), "ConciergeServicesPage");
export const MarketplaceServicesPage = safeLazy(() => import("@/pages/seo/MarketplaceServicesPage"), "MarketplaceServicesPage");
export const ActivitiesPage = safeLazy(() => import("@/pages/seo/ActivitiesPage"), "ActivitiesPage");
export const SeasonalRentalsPage = safeLazy(() => import("@/pages/seo/SeasonalRentalsPage"), "SeasonalRentalsPage");
export const LongTermRentalsPage = safeLazy(() => import("@/pages/seo/LongTermRentalsPage"), "LongTermRentalsPage");
export const ServiceCitySEOPage = safeLazy(() => import("@/pages/seo/ServiceCitySEOPage"), "ServiceCitySEOPage");
export const ActivityCitySEOPage = safeLazy(() => import("@/pages/seo/ActivityCitySEOPage"), "ActivityCitySEOPage");
export const CoreSEOPages = safeLazy(() => import("@/pages/seo/CoreSEOPages").then(m => ({ default: m.PropertyOwnerSoftwarePage })), "CoreSEOPages");
export const PropertyManagementPlatformPage = safeLazy(() => import("@/pages/seo/CoreSEOPages").then(m => ({ default: m.PropertyManagementPlatformPage })), "PropertyManagementPlatformPage");
export const RentalManagementSoftwarePage = safeLazy(() => import("@/pages/seo/CoreSEOPages").then(m => ({ default: m.RentalManagementSoftwarePage })), "RentalManagementSoftwarePage");
export const LocationsPage = safeLazy(() => import("@/pages/seo/LocationsPage"), "LocationsPage");
export const CountryHubPage = safeLazy(() => import("@/pages/seo/CountryHubPage"), "CountryHubPage");
export const CityHubPage = safeLazy(() => import("@/pages/seo/CityHubPage"), "CityHubPage");
export const DynamicCityCategoryPage = safeLazy(() => import("@/pages/seo/CityCategoryPage"), "DynamicCityCategoryPage");
export const MarketplaceHubPage = safeLazy(() => import("@/pages/seo/MarketplaceCityPage").then(m => ({ default: m.MarketplaceHubPage })), "MarketplaceHubPage");
export const MarketplaceCityPage = safeLazy(() => import("@/pages/seo/MarketplaceCityPage").then(m => ({ default: m.MarketplaceCityPage })), "MarketplaceCityPage");
export const MarketplaceServiceCityPage = safeLazy(() => import("@/pages/seo/MarketplaceCityPage").then(m => ({ default: m.MarketplaceServiceCityPage })), "MarketplaceServiceCityPage");
export const ServicesHubPage = safeLazy(() => import("@/pages/seo/ServiceHubPage").then(m => ({ default: m.ServicesHubPage })), "ServicesHubPage");
export const ServiceCategoryPage = safeLazy(() => import("@/pages/seo/ServiceHubPage").then(m => ({ default: m.ServiceCategoryPage })), "ServiceCategoryPage");
export const ServiceCityPage = safeLazy(() => import("@/pages/seo/ServiceHubPage").then(m => ({ default: m.ServiceCityPage })), "ServiceCityPage");
export const ProviderSEOPage = safeLazy(() => import("@/pages/seo/ProviderSEOPage"), "ProviderSEOPage");
export const SlugResolver = safeLazy(() => import("@/pages/seo/SEOShortUrlResolver").then(m => ({ default: m.SlugResolver })), "SlugResolver");
export const SlugCategoryResolver = safeLazy(() => import("@/pages/seo/SEOShortUrlResolver").then(m => ({ default: m.SlugCategoryResolver })), "SlugCategoryResolver");

// ── Admin ──
export const AdminDashboard = safeLazy(() => import("@/pages/AdminDashboard"), "AdminDashboard");
export const AIQualityDashboard = safeLazy(() => import("@/pages/AIQualityDashboard"), "AIQualityDashboard");
export const OpsCenter = safeLazy(() => import("@/pages/OpsCenter"), "OpsCenter");
export const AdminUiEnginePage = safeLazy(() => import("@/pages/admin/AdminUiEnginePage"), "AdminUiEnginePage");
export const RadarViewPage = safeLazy(() => import("@/pages/RadarViewPage"), "RadarViewPage");
export const ServiceTrackingPage = safeLazy(() => import("@/pages/ServiceTrackingPage"), "ServiceTrackingPage");
export const SellerHubPage = safeLazy(() => import("@/pages/SellerHubPage"), "SellerHubPage");
export const SellerDashboardPage = safeLazy(() => import("@/pages/seller/SellerDashboardPage"), "SellerDashboardPage");
export const MyBusinessHub = safeLazy(() => import("@/pages/MyBusinessHub"), "MyBusinessHub");
export const MyShopsPage = safeLazy(() => import("@/pages/MyShopsPage"), "MyShopsPage");
export const MyOrdersPage = safeLazy(() => import("@/pages/MyOrdersPage"), "MyOrdersPage");
export const UnifiedOrderDetailPage = safeLazy(() => import("@/pages/UnifiedOrderDetailPage"), "UnifiedOrderDetailPage");
export const POSPage = safeLazy(() => import("@/pages/POSPage"), "POSPage");
export const PropertyManagementHub = safeLazy(() => import("@/pages/PropertyManagementHub"), "PropertyManagementHub");
export const RouteAuditPage = safeLazy(() => import("@/pages/RouteAuditPage"), "RouteAuditPage");
export const SearchResultsPage = safeLazy(() => import("@/pages/SearchResultsPage"), "SearchResultsPage");
export const MeCommandCenter = safeLazy(() => import("@/pages/MeCommandCenter"), "MeCommandCenter");
export const FavoritesPage = safeLazy(() => import("@/pages/FavoritesPage"), "FavoritesPage");

// ── Orders / Checkout / Tracking ──
export const CheckoutPage = safeLazy(() => import("@/pages/CheckoutPage"), "CheckoutPage");
export const OrdersPage = safeLazy(() => import("@/pages/OrdersPage"), "OrdersPage");
export const TrackingPage = safeLazy(() => import("@/pages/TrackingPage"), "TrackingPage");
export const DeliveryProofPage = safeLazy(() => import("@/pages/DeliveryProofPage"), "DeliveryProofPage");
export const GuestCheckoutPage = safeLazy(() => import("@/pages/GuestCheckoutPage"), "GuestCheckoutPage");
export const PaymentPage = safeLazy(() => import("@/pages/PaymentPage"), "PaymentPage");
export const FoodOrderCheckoutPage = safeLazy(() => import("@/pages/FoodOrderCheckoutPage"), "FoodOrderCheckoutPage");
export const OrderReceiptPage = safeLazy(() => import("@/pages/OrderReceiptPage"), "OrderReceiptPage");
export const ReorderPage = safeLazy(() => import("@/pages/ReorderPage"), "ReorderPage");

// ── Wallet Sub-Pages ──
export const WalletTopUpPage = safeLazy(() => import("@/pages/wallet/WalletTopUpPage"), "WalletTopUpPage");
export const WalletTransferPage = safeLazy(() => import("@/pages/wallet/WalletTransferPage"), "WalletTransferPage");
export const WalletRequestPage = safeLazy(() => import("@/pages/wallet/WalletRequestPage"), "WalletRequestPage");

// ── Claim / Onboarding ──
export const ClaimPage = safeLazy(() => import("@/pages/ClaimPage"), "ClaimPage");
export const ClaimShopPage = safeLazy(() => import("@/pages/ClaimShopPage"), "ClaimShopPage");
export const MerchantOnboardingPage = safeLazy(() => import("@/pages/MerchantOnboardingPage"), "MerchantOnboardingPage");
export const MerchantOnboardingAdminPage = safeLazy(() => import("@/pages/MerchantOnboardingAdminPage"), "MerchantOnboardingAdminPage");
export const MerchantClaimPage = safeLazy(() => import("@/pages/MerchantClaimPage"), "MerchantClaimPage");
export const WorkspaceBootstrapPage = safeLazy(() => import("@/pages/WorkspaceBootstrapPage"), "WorkspaceBootstrapPage");

// ── Merchant Pages ──
export const MerchantDashboardPage = safeLazy(() => import("@/pages/MerchantDashboardPage"), "MerchantDashboardPage");
export const MerchantFinancePage = safeLazy(() => import("@/pages/merchant/MerchantFinancePage"), "MerchantFinancePage");
export const MerchantPosPage = safeLazy(() => import("@/pages/MerchantPosPage"), "MerchantPosPage");
export const MerchantKitchenPage = safeLazy(() => import("@/pages/MerchantKitchenPage"), "MerchantKitchenPage");
export const MerchantOrdersPage = safeLazy(() => import("@/pages/MerchantOrdersPage"), "MerchantOrdersPage");
export const ShopQrCenterPage = safeLazy(() => import("@/pages/merchant/ShopQrCenterPage"), "ShopQrCenterPage");
export const ShopOrderPage = safeLazy(() => import("@/pages/merchant/ShopOrderPage"), "ShopOrderPage");
export const MenuAdminPage = safeLazy(() => import("@/pages/MenuAdminPage"), "MenuAdminPage");
export const MerchantMenuPageNew = safeLazy(() => import("@/pages/merchant/MerchantMenuPage"), "MerchantMenuPageNew");
export const MerchantStoreSettingsPage = safeLazy(() => import("@/pages/merchant/MerchantStoreSettingsPage"), "MerchantStoreSettingsPage");
export const MerchantPromoManagerPage = safeLazy(() => import("@/pages/merchant/MerchantPromoManagerPage"), "MerchantPromoManagerPage");
export const MerchantOrderBoardPage = safeLazy(() => import("@/pages/merchant/MerchantOrderBoardPage"), "MerchantOrderBoardPage");
export const MerchantReviewRepliesPage = safeLazy(() => import("@/pages/merchant/MerchantReviewRepliesPage"), "MerchantReviewRepliesPage");
export const MerchantInventoryPage = safeLazy(() => import("@/pages/merchant/MerchantInventoryPage"), "MerchantInventoryPage");
export const MerchantLiveControlPage = safeLazy(() => import("@/pages/merchant/MerchantLiveControlPage"), "MerchantLiveControlPage");
export const MerchantCouponManagerPage = safeLazy(() => import("@/pages/merchant/MerchantCouponManagerPage"), "MerchantCouponManagerPage");
export const MerchantBasicAnalyticsPage = safeLazy(() => import("@/pages/merchant/MerchantBasicAnalyticsPage"), "MerchantBasicAnalyticsPage");
export const MerchantCustomersPage = safeLazy(() => import("@/pages/merchant/MerchantCustomersPage"), "MerchantCustomersPage");
export const MerchantPromoBannerEditorPage = safeLazy(() => import("@/pages/merchant/MerchantPromoBannerEditorPage"), "MerchantPromoBannerEditorPage");
export const MerchantBusinessSummaryPage = safeLazy(() => import("@/pages/merchant/MerchantBusinessSummaryPage"), "MerchantBusinessSummaryPage");
export const MerchantClosingModePage = safeLazy(() => import("@/pages/merchant/MerchantClosingModePage"), "MerchantClosingModePage");
export const MerchantCustomerInsightsPage = safeLazy(() => import("@/pages/merchant/MerchantCustomerInsightsPage"), "MerchantCustomerInsightsPage");
export const MerchantProductPerformancePage = safeLazy(() => import("@/pages/merchant/MerchantProductPerformancePage"), "MerchantProductPerformancePage");
export const MerchantAutoAcceptSettingsPage = safeLazy(() => import("@/pages/merchant/MerchantAutoAcceptSettingsPage"), "MerchantAutoAcceptSettingsPage");
export const MerchantInventoryAlertsPage = safeLazy(() => import("@/pages/merchant/MerchantInventoryAlertsPage"), "MerchantInventoryAlertsPage");
export const MerchantStaffAccessPage = safeLazy(() => import("@/pages/merchant/MerchantStaffAccessPage"), "MerchantStaffAccessPage");
export const MerchantDailySalesPage = safeLazy(() => import("@/pages/merchant/MerchantDailySalesPage"), "MerchantDailySalesPage");
export const MerchantRefundRequestsPage = safeLazy(() => import("@/pages/merchant/MerchantRefundRequestsPage"), "MerchantRefundRequestsPage");
export const MerchantMenuBulkEditPage = safeLazy(() => import("@/pages/merchant/MerchantMenuBulkEditPage"), "MerchantMenuBulkEditPage");
export const MerchantDeliveryZonesPage = safeLazy(() => import("@/pages/merchant/MerchantDeliveryZonesPage"), "MerchantDeliveryZonesPage");
export const MerchantKitchenDisplayPage = safeLazy(() => import("@/pages/merchant/MerchantKitchenDisplayPage"), "MerchantKitchenDisplayPage");
export const MerchantMenuCategoryManagerPage = safeLazy(() => import("@/pages/merchant/MerchantMenuCategoryManagerPage"), "MerchantMenuCategoryManagerPage");
export const MerchantBusinessHoursPage = safeLazy(() => import("@/pages/merchant/MerchantBusinessHoursPage"), "MerchantBusinessHoursPage");

// ── Driver Pages ──
export const DriverDashboardPageNew = safeLazy(() => import("@/pages/driver/DriverDashboardPage"), "DriverDashboardPageNew");
export const DriverMissionsPage = safeLazy(() => import("@/pages/driver/DriverMissionsPage"), "DriverMissionsPage");
export const DriverMissionDetailPage = safeLazy(() => import("@/pages/driver/DriverMissionDetailPage"), "DriverMissionDetailPage");
export const DriverProofPage = safeLazy(() => import("@/pages/driver/DriverProofPage"), "DriverProofPage");
export const DriverEarningsPage = safeLazy(() => import("@/pages/DriverEarningsPage"), "DriverEarningsPage");
export const DriverEarningsPageNew = safeLazy(() => import("@/pages/driver/DriverEarningsPageNew"), "DriverEarningsPageNew");
export const DriverEarningsSummaryPage = safeLazy(() => import("@/pages/driver/DriverEarningsSummaryPage"), "DriverEarningsSummaryPage");
export const DriverActiveMissionsPage = safeLazy(() => import("@/pages/driver/DriverActiveMissionsPage"), "DriverActiveMissionsPage");
export const DriverShiftPage = safeLazy(() => import("@/pages/driver/DriverShiftPage"), "DriverShiftPage");
export const DriverAvailabilityZonesPage = safeLazy(() => import("@/pages/driver/DriverAvailabilityZonesPage"), "DriverAvailabilityZonesPage");
export const DriverCompletedDeliveriesPage = safeLazy(() => import("@/pages/driver/DriverCompletedDeliveriesPage"), "DriverCompletedDeliveriesPage");
export const DriverLiveMissionsPage = safeLazy(() => import("@/pages/driver/DriverLiveMissionsPage"), "DriverLiveMissionsPage");
export const DriverFuelCostsPage = safeLazy(() => import("@/pages/driver/DriverFuelCostsPage"), "DriverFuelCostsPage");
export const DriverBreaksPage = safeLazy(() => import("@/pages/driver/DriverBreaksPage"), "DriverBreaksPage");
export const DriverHeatmapMapPage = safeLazy(() => import("@/pages/DriverHeatmapMapPage"), "DriverHeatmapMapPage");

// ── Customer Pages ──
export const CustomerProfilePage = safeLazy(() => import("@/pages/CustomerProfilePage"), "CustomerProfilePage");
export const CustomerSpendingInsightsPage = safeLazy(() => import("@/pages/CustomerSpendingInsightsPage"), "CustomerSpendingInsightsPage");
export const CustomerAddressBookPage = safeLazy(() => import("@/pages/customer/CustomerAddressBookPage"), "CustomerAddressBookPage");
export const CustomerLoyaltyHistoryPage = safeLazy(() => import("@/pages/customer/CustomerLoyaltyHistoryPage"), "CustomerLoyaltyHistoryPage");
export const CustomerActiveOrdersPage = safeLazy(() => import("@/pages/customer/CustomerActiveOrdersPage"), "CustomerActiveOrdersPage");
export const CustomerOrderArchivePage = safeLazy(() => import("@/pages/customer/CustomerOrderArchivePage"), "CustomerOrderArchivePage");
export const CustomerAddressSelectorPage = safeLazy(() => import("@/pages/customer/CustomerAddressSelectorPage"), "CustomerAddressSelectorPage");
export const CustomerPaymentActivityPage = safeLazy(() => import("@/pages/customer/CustomerPaymentActivityPage"), "CustomerPaymentActivityPage");
export const CustomerOrderReceiptsPage = safeLazy(() => import("@/pages/customer/CustomerOrderReceiptsPage"), "CustomerOrderReceiptsPage");
export const CustomerReorderPage = safeLazy(() => import("@/pages/customer/CustomerReorderPage"), "CustomerReorderPage");
export const CustomerLiveLocationPage = safeLazy(() => import("@/pages/customer/CustomerLiveLocationPage"), "CustomerLiveLocationPage");
export const CustomerSavedCardsPage = safeLazy(() => import("@/pages/customer/CustomerSavedCardsPage"), "CustomerSavedCardsPage");
export const CustomerDeliveryNotesPage = safeLazy(() => import("@/pages/customer/CustomerDeliveryNotesPage"), "CustomerDeliveryNotesPage");
export const CustomerGroupOrderPage = safeLazy(() => import("@/pages/customer/CustomerGroupOrderPage"), "CustomerGroupOrderPage");
export const CustomerOrderGiftsPage = safeLazy(() => import("@/pages/customer/CustomerOrderGiftsPage"), "CustomerOrderGiftsPage");
export const CustomerSplitBillPage = safeLazy(() => import("@/pages/customer/CustomerSplitBillPage"), "CustomerSplitBillPage");
export const CustomerSavedCartsPage2 = safeLazy(() => import("@/pages/customer/CustomerSavedCartsPage"), "CustomerSavedCartsPage2");
export const CustomerAutoRepeatPage = safeLazy(() => import("@/pages/customer/CustomerAutoRepeatPage"), "CustomerAutoRepeatPage");
export const CustomerPartyOrderPage = safeLazy(() => import("@/pages/customer/CustomerPartyOrderPage"), "CustomerPartyOrderPage");
export const CustomerRewardRedemptionPage = safeLazy(() => import("@/pages/customer/CustomerRewardRedemptionPage"), "CustomerRewardRedemptionPage");
export const CustomerShareCartPage = safeLazy(() => import("@/pages/customer/CustomerShareCartPage"), "CustomerShareCartPage");

// ── Admin — Massive Registry ──
export const AdminDisputesPage = safeLazy(() => import("@/pages/AdminDisputesPage"), "AdminDisputesPage");
export const DemandHeatmapPage = safeLazy(() => import("@/pages/DemandHeatmapPage"), "DemandHeatmapPage");
export const AdminFraudPage = safeLazy(() => import("@/pages/AdminFraudPage"), "AdminFraudPage");
export const AdminLiveOpsPage = safeLazy(() => import("@/pages/AdminLiveOpsPage"), "AdminLiveOpsPage");
export const RiderPrioritySubscriptionPage = safeLazy(() => import("@/pages/RiderPrioritySubscriptionPage"), "RiderPrioritySubscriptionPage");
export const AdminDispatchBoardPage = safeLazy(() => import("@/pages/AdminDispatchBoardPage"), "AdminDispatchBoardPage");
export const AdminSLAPage = safeLazy(() => import("@/pages/AdminSLAPage"), "AdminSLAPage");
export const RefundRequestPage = safeLazy(() => import("@/pages/RefundRequestPage"), "RefundRequestPage");
export const TeamCommandCenterPage = safeLazy(() => import("@/pages/TeamCommandCenterPage"), "TeamCommandCenterPage");
export const AdminTrustGraphPage = safeLazy(() => import("@/pages/AdminTrustGraphPage"), "AdminTrustGraphPage");
export const ExecutiveKPIBoardPage = safeLazy(() => import("@/pages/ExecutiveKPIBoardPage"), "ExecutiveKPIBoardPage");
export const TeamPermissionsPage = safeLazy(() => import("@/pages/TeamPermissionsPage"), "TeamPermissionsPage");
export const AIOpsChatPage = safeLazy(() => import("@/pages/AIOpsChatPage"), "AIOpsChatPage");
export const FinancialReconPage = safeLazy(() => import("@/pages/FinancialReconPage"), "FinancialReconPage");
export const ReconAlertsPage = safeLazy(() => import("@/pages/ReconAlertsPage"), "ReconAlertsPage");
export const ExecutiveDashboard = safeLazy(() => import("@/pages/ExecutiveDashboard"), "ExecutiveDashboard");
export const ConciergeOperations = safeLazy(() => import("@/pages/ConciergeOperations"), "ConciergeOperations");
export const SupportInboxPage = safeLazy(() => import("@/pages/SupportInboxPage"), "SupportInboxPage");
export const AdminHomeV1Page = safeLazy(() => import("@/pages/AdminHomeV1Page"), "AdminHomeV1Page");
export const KpiChartsPage = safeLazy(() => import("@/pages/KpiChartsPage"), "KpiChartsPage");
export const AdminRealtimeControlPage = safeLazy(() => import("@/pages/AdminRealtimeControlPage"), "AdminRealtimeControlPage");
export const DeploymentChecklistPage = safeLazy(() => import("@/pages/DeploymentChecklistPage"), "DeploymentChecklistPage");
export const LoyaltyRedeemPage = safeLazy(() => import("@/pages/LoyaltyRedeemPage"), "LoyaltyRedeemPage");
export const AdminAlertCenterPage = safeLazy(() => import("@/pages/AdminAlertCenterPage"), "AdminAlertCenterPage");
export const StripeElementsPage = safeLazy(() => import("@/pages/StripeElementsPage"), "StripeElementsPage");
export const AuditDebugPanelPage = safeLazy(() => import("@/pages/AuditDebugPanelPage"), "AuditDebugPanelPage");
export const AdminOutreachPage = safeLazy(() => import("@/pages/AdminOutreachPage"), "AdminOutreachPage");
export const AdminWalletDiagnosticsPage = safeLazy(() => import("@/pages/AdminWalletDiagnosticsPage"), "AdminWalletDiagnosticsPage");
export const AdminOpsExceptionsPage = safeLazy(() => import("@/pages/AdminOpsExceptionsPage"), "AdminOpsExceptionsPage");
export const AdminReviewQueuePage = safeLazy(() => import("@/pages/AdminReviewQueuePage"), "AdminReviewQueuePage");
export const AdminGrowthDashboard = safeLazy(() => import("@/pages/AdminGrowthDashboard"), "AdminGrowthDashboard");
export const BoostDashboardPage = safeLazy(() => import("@/pages/boost/BoostDashboardPage"), "BoostDashboardPage");
export const SuperMapPage = safeLazy(() => import("@/pages/SuperMapPage"), "SuperMapPage");
export const CanonicalMapTestPage = safeLazy(() => import("@/pages/CanonicalMapTestPage"), "CanonicalMapTestPage");
export const HyperRadarPage = safeLazy(() => import("@/pages/HyperRadarPage"), "HyperRadarPage");
export const AdminRestaurantTestSeederPage = safeLazy(() => import("@/pages/AdminRestaurantTestSeederPage"), "AdminRestaurantTestSeederPage");
export const AdminRuntimeAuditPage = safeLazy(() => import("@/pages/AdminRuntimeAuditPage"), "AdminRuntimeAuditPage");
export const AdminRuntimeQuickLinksPage = safeLazy(() => import("@/pages/AdminRuntimeQuickLinksPage"), "AdminRuntimeQuickLinksPage");
export const AdminMasterDebugPage = safeLazy(() => import("@/pages/AdminMasterDebugPage"), "AdminMasterDebugPage");
export const AdminMarketplaceOpsPage = safeLazy(() => import("@/pages/admin/AdminMarketplaceOpsPage"), "AdminMarketplaceOpsPage");
export const AdminOpsDashboardPage = safeLazy(() => import("@/pages/admin/AdminOpsDashboardPage"), "AdminOpsDashboardPage");
export const AdminOrchestrationPage = safeLazy(() => import("@/pages/admin/AdminOrchestrationPage"), "AdminOrchestrationPage");
export const AdminPipelinePage = safeLazy(() => import("@/pages/admin/AdminPipelinePage"), "AdminPipelinePage");
export const AdminEnginesDashboardPage = safeLazy(() => import("@/pages/admin/AdminEnginesDashboardPage"), "AdminEnginesDashboardPage");
export const AdminBackendTruthPage = safeLazy(() => import("@/pages/admin/AdminBackendTruthPage"), "AdminBackendTruthPage");
export const AdminGaragePage = safeLazy(() => import("@/pages/admin/AdminGaragePage"), "AdminGaragePage");
export const PermissionCenterPage = safeLazy(() => import("@/pages/PermissionCenterPage"), "PermissionCenterPage");
export const AdminSupportOpsPage = safeLazy(() => import("@/pages/admin/AdminSupportOpsPage"), "AdminSupportOpsPage");
export const AdminDeliveryOpsPage = safeLazy(() => import("@/pages/admin/AdminDeliveryOpsPage"), "AdminDeliveryOpsPage");
export const SupportTicketsPage = safeLazy(() => import("@/pages/support/SupportTicketsPage"), "SupportTicketsPage");
export const SupportTicketDetailPage = safeLazy(() => import("@/pages/support/SupportTicketDetailPage"), "SupportTicketDetailPage");
export const AdminMerchantAutofillPage = safeLazy(() => import("@/pages/admin/AdminMerchantAutofillPage"), "AdminMerchantAutofillPage");
export const AdminBulkSeedPage = safeLazy(() => import("@/pages/admin/AdminBulkSeedPage"), "AdminBulkSeedPage");
export const AdminSuperDashboardPage = safeLazy(() => import("@/pages/admin/AdminSuperDashboardPage"), "AdminSuperDashboardPage");
export const AdminPaymentsOpsPage = safeLazy(() => import("@/pages/admin/AdminPaymentsOpsPage"), "AdminPaymentsOpsPage");
export const AdminBulkMerchantImportPage = safeLazy(() => import("@/pages/admin/AdminBulkMerchantImportPage"), "AdminBulkMerchantImportPage");
export const AdminSeedToolsPage = safeLazy(() => import("@/pages/admin/AdminSeedToolsPage"), "AdminSeedToolsPage");
export const AdminContentOpsPage = safeLazy(() => import("@/pages/admin/AdminContentOpsPage"), "AdminContentOpsPage");
export const AdminAnalyticsOpsPage = safeLazy(() => import("@/pages/admin/AdminAnalyticsOpsPage"), "AdminAnalyticsOpsPage");
export const AdminQualityOpsPage = safeLazy(() => import("@/pages/admin/AdminQualityOpsPage"), "AdminQualityOpsPage");
export const AdminUaeOpsDashboard = safeLazy(() => import("@/pages/admin/AdminUaeOpsDashboard"), "AdminUaeOpsDashboard");
export const AdminCrmOpsPage = safeLazy(() => import("@/pages/admin/AdminCrmOpsPage"), "AdminCrmOpsPage");
export const AdminHomeEnginePage = safeLazy(() => import("@/pages/admin/AdminHomeEnginePage"), "AdminHomeEnginePage");
export const AdminMapEnginePage = safeLazy(() => import("@/pages/admin/AdminMapEnginePage"), "AdminMapEnginePage");
export const AdminNotificationEnginePage = safeLazy(() => import("@/pages/admin/AdminNotificationEnginePage"), "AdminNotificationEnginePage");
export const OwnerCockpitPage = safeLazy(() => import("@/pages/admin/OwnerCockpitPage"), "OwnerCockpitPage");
export const OnboardingQualityDashboardPage = safeLazy(() => import("@/pages/admin/OnboardingQualityDashboardPage"), "OnboardingQualityDashboardPage");
export const UnifiedGlobalEnginePage = safeLazy(() => import("@/pages/admin/UnifiedGlobalEnginePage"), "UnifiedGlobalEnginePage");
export const AIDecisionsDashboardPage = safeLazy(() => import("@/pages/admin/AIDecisionsDashboardPage"), "AIDecisionsDashboardPage");
export const UrlImportPage = safeLazy(() => import("@/pages/admin/UrlImportPage"), "UrlImportPage");
export const AdminGrowthOpsPage = safeLazy(() => import("@/pages/admin/AdminGrowthOpsPage"), "AdminGrowthOpsPage");
export const NotificationCenterPage = safeLazy(() => import("@/pages/notifications/NotificationCenterPage"), "NotificationCenterPage");
export const AdminRetentionOpsPage = safeLazy(() => import("@/pages/admin/AdminRetentionOpsPage"), "AdminRetentionOpsPage");
export const AdminMerchantHealthPage = safeLazy(() => import("@/pages/admin/AdminMerchantHealthPage"), "AdminMerchantHealthPage");
export const OrderRefundRequestPage = safeLazy(() => import("@/pages/orders/OrderRefundRequestPage"), "OrderRefundRequestPage");
export const AdminDriverMonitorPage = safeLazy(() => import("@/pages/admin/AdminDriverMonitorPage"), "AdminDriverMonitorPage");
export const AdminUserLookupPage = safeLazy(() => import("@/pages/admin/AdminUserLookupPage"), "AdminUserLookupPage");
export const AdminNotificationOpsPage = safeLazy(() => import("@/pages/admin/AdminNotificationOpsPage"), "AdminNotificationOpsPage");
export const AdminFinanceSummaryPage = safeLazy(() => import("@/pages/admin/AdminFinanceSummaryPage"), "AdminFinanceSummaryPage");
export const AdminPlatformAlertsPage = safeLazy(() => import("@/pages/admin/AdminPlatformAlertsPage"), "AdminPlatformAlertsPage");
export const AdminOrderWatchPage = safeLazy(() => import("@/pages/admin/AdminOrderWatchPage"), "AdminOrderWatchPage");
export const AdminSearchWatchPage = safeLazy(() => import("@/pages/admin/AdminSearchWatchPage"), "AdminSearchWatchPage");
export const AdminMerchantPromoWatchPage = safeLazy(() => import("@/pages/admin/AdminMerchantPromoWatchPage"), "AdminMerchantPromoWatchPage");
export const AdminRefundWatchPage = safeLazy(() => import("@/pages/admin/AdminRefundWatchPage"), "AdminRefundWatchPage");
export const AdminDriverHeatmapPage = safeLazy(() => import("@/pages/admin/AdminDriverHeatmapPage"), "AdminDriverHeatmapPage");
export const AdminWalletWatchPage = safeLazy(() => import("@/pages/admin/AdminWalletWatchPage"), "AdminWalletWatchPage");
export const AdminPlatformRecoveryPage = safeLazy(() => import("@/pages/admin/AdminPlatformRecoveryPage"), "AdminPlatformRecoveryPage");
export const AdminShopImportPage = safeLazy(() => import("@/pages/admin/AdminShopImportPage"), "AdminShopImportPage");
export const AdminVisualQualityPage = safeLazy(() => import("@/pages/admin/AdminVisualQualityPage"), "AdminVisualQualityPage");
export const AdminRankingControlPage = safeLazy(() => import("@/pages/admin/AdminRankingControlPage"), "AdminRankingControlPage");
export const AdminShopQualityPage = safeLazy(() => import("@/pages/admin/AdminShopQualityPage"), "AdminShopQualityPage");
export const AdminCoherenceControlPage = safeLazy(() => import("@/pages/admin/AdminCoherenceControlPage"), "AdminCoherenceControlPage");
export const AdminSourceAuditPage = safeLazy(() => import("@/pages/admin/AdminSourceAuditPage"), "AdminSourceAuditPage");
export const AdminSystemHealthPage = safeLazy(() => import("@/pages/admin/AdminSystemHealthPage"), "AdminSystemHealthPage");
export const AdminFraudDetectionPage = safeLazy(() => import("@/pages/admin/AdminFraudDetectionPage"), "AdminFraudDetectionPage");
export const AdminOrderTimelinePage = safeLazy(() => import("@/pages/admin/AdminOrderTimelinePage"), "AdminOrderTimelinePage");
export const AdminMerchantApprovalQueuePage = safeLazy(() => import("@/pages/admin/AdminMerchantApprovalQueuePage"), "AdminMerchantApprovalQueuePage");
export const AdminFailedPaymentsPage = safeLazy(() => import("@/pages/admin/AdminFailedPaymentsPage"), "AdminFailedPaymentsPage");
export const AdminSupportSlaPage = safeLazy(() => import("@/pages/admin/AdminSupportSlaPage"), "AdminSupportSlaPage");
export const AdminDeliveryIncidentsPage = safeLazy(() => import("@/pages/admin/AdminDeliveryIncidentsPage"), "AdminDeliveryIncidentsPage");
export const AdminGrowthDashboardPage = safeLazy(() => import("@/pages/admin/AdminGrowthDashboardPage"), "AdminGrowthDashboardPage");
export const AdminCouponOversightPage = safeLazy(() => import("@/pages/admin/AdminCouponOversightPage"), "AdminCouponOversightPage");
export const AdminActiveSessionsPage = safeLazy(() => import("@/pages/admin/AdminActiveSessionsPage"), "AdminActiveSessionsPage");
export const AdminFraudMonitorPage = safeLazy(() => import("@/pages/admin/AdminFraudMonitorPage"), "AdminFraudMonitorPage");
export const AdminCoreEnginePage = safeLazy(() => import("@/pages/admin/AdminCoreEnginePage"), "AdminCoreEnginePage");
export const AdminOrderAuditPage = safeLazy(() => import("@/pages/admin/AdminOrderAuditPage"), "AdminOrderAuditPage");
export const AdminRefundQueuePage = safeLazy(() => import("@/pages/admin/AdminRefundQueuePage"), "AdminRefundQueuePage");
export const AdminPlatformHealthPage = safeLazy(() => import("@/pages/admin/AdminPlatformHealthPage"), "AdminPlatformHealthPage");
export const AdminRuntimeCockpitPage = safeLazy(() => import("@/pages/admin/AdminRuntimeCockpitPage"), "AdminRuntimeCockpitPage");
export const AdminSystemLivePanelPage = safeLazy(() => import("@/pages/admin/AdminSystemLivePanelPage"), "AdminSystemLivePanelPage");
export const AdminRestaurantFillPage = safeLazy(() => import("@/pages/admin/AdminRestaurantFillPage"), "AdminRestaurantFillPage");
export const StripeCheckoutHandlerPage = safeLazy(() => import("@/pages/payments/StripeCheckoutHandlerPage"), "StripeCheckoutHandlerPage");
export const AdminMasterControlPage = safeLazy(() => import("@/pages/admin/AdminMasterControlPage"), "AdminMasterControlPage");
export const AdminQaCommandPage = safeLazy(() => import("@/pages/admin/AdminQaCommandPage"), "AdminQaCommandPage");
export const LiveTrackingPageNew = safeLazy(() => import("@/pages/live/LiveTrackingPage"), "LiveTrackingPageNew");
export const AdminEngineCockpit = safeLazy(() => import("@/pages/AdminEngineCockpit"), "AdminEngineCockpit");
export const AdminBrowserRepairPage = safeLazy(() => import("@/pages/admin/AdminBrowserRepairPage"), "AdminBrowserRepairPage");
export const CentralControlPanelPage = safeLazy(() => import("@/pages/admin/CentralControlPanelPage"), "CentralControlPanelPage");
export const AdminMenuQualityControlPage = safeLazy(() => import("@/pages/admin/AdminMenuQualityControlPage"), "AdminMenuQualityControlPage");
export const AdminUxLiveTestPage = safeLazy(() => import("@/pages/admin/AdminUxLiveTestPage"), "AdminUxLiveTestPage");
export const AdminGrowthEnginePage = safeLazy(() => import("@/pages/AdminGrowthEnginePage"), "AdminGrowthEnginePage");

// ── Support ──
export const SupportTicketsPageReexport = SupportTicketsPage;
export const SupportTicketDetailPageReexport = SupportTicketDetailPage;

// ── Concierge / Misc ──
export const ConciergeServicesPageDashboard = safeLazy(() => import("@/pages/ConciergeServices"), "ConciergeServices");
