/**
 * app-route-registry — Central lazy-import registry for all page components.
 * Organized by pillar: Auth → Dashboard → Radar → Orbit → Wallet → Me → Admin → Deep-link → QR → SEO → Legal → Misc
 */
import { lazy, type ComponentType } from "react";

function safeLazy(factory: () => Promise<{ default: ComponentType<any> }>, name: string) {
  return lazy(async () => {
    try {
      const mod = await factory();
      if (!mod?.default) throw new Error(`Missing default export for ${name}`);
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

// ═══════════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════════
export const Index = safeLazy(() => import("@/pages/Index"), "Index");
export const Login = safeLazy(() => import("@/pages/Login"), "Login");
export const Signup = safeLazy(() => import("@/pages/Signup"), "Signup");
export const ForgotPassword = safeLazy(() => import("@/pages/ForgotPassword"), "ForgotPassword");
export const ResetPassword = safeLazy(() => import("@/pages/ResetPassword"), "ResetPassword");
export const VerifyEmail = safeLazy(() => import("@/pages/VerifyEmail"), "VerifyEmail");
export const Onboarding = safeLazy(() => import("@/pages/Onboarding"), "Onboarding");
export const AuthCallbackPage = safeLazy(() => import("@/pages/AuthCallbackPage"), "AuthCallbackPage");
export const AuthDiagnosticPage = safeLazy(() => import("@/pages/AuthDiagnosticPage"), "AuthDiagnosticPage");

// ═══════════════════════════════════════════════════════════════════
//  PILLAR 1 · DASHBOARD (Property · Finance · Operations)
// ═══════════════════════════════════════════════════════════════════
export const Dashboard = safeLazy(() => import("@/pages/Dashboard"), "Dashboard");
export const AddProperty = safeLazy(() => import("@/pages/AddProperty"), "AddProperty");
export const PropertyDetailHub = safeLazy(() => import("@/pages/PropertyDetailHub"), "PropertyDetailHub");
export const CreateListing = safeLazy(() => import("@/pages/CreateListing"), "CreateListing");
export const Receipts = safeLazy(() => import("@/pages/Receipts"), "Receipts");
export const Reminders = safeLazy(() => import("@/pages/Reminders"), "Reminders");
export const Documents = safeLazy(() => import("@/pages/Documents"), "Documents");
export const AIAssistant = safeLazy(() => import("@/pages/AIAssistant"), "AIAssistant");
export const AISearch = safeLazy(() => import("@/pages/AISearch"), "AISearch");
export const Leases = safeLazy(() => import("@/pages/Leases"), "Leases");
export const Company = safeLazy(() => import("@/pages/Company"), "Company");
export const Billing = safeLazy(() => import("@/pages/Billing"), "Billing");
export const Settings = safeLazy(() => import("@/pages/Settings"), "Settings");
export const Tenants = safeLazy(() => import("@/pages/Tenants"), "Tenants");
export const RentalManagement = safeLazy(() => import("@/pages/RentalManagement"), "RentalManagement");
export const Finances = safeLazy(() => import("@/pages/Finances"), "Finances");
export const Interventions = safeLazy(() => import("@/pages/Interventions"), "Interventions");
export const Tasks = safeLazy(() => import("@/pages/Tasks"), "Tasks");
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
export const ServiceTrackingPage = safeLazy(() => import("@/pages/ServiceTrackingPage"), "ServiceTrackingPage");
export const GeoExplorerPage = safeLazy(() => import("@/pages/geo/GeoExplorerPage"), "GeoExplorerPage");
export const PrayerTimesPage = safeLazy(() => import("@/pages/PrayerTimesPage"), "PrayerTimesPage");
export const IslamicSectionPage = safeLazy(() => import("@/pages/islamic/IslamicSectionPage"), "IslamicSectionPage");
export const NewsPage = safeLazy(() => import("@/pages/NewsPage"), "NewsPage");

// Real Estate Vertical — Marketplace
export const RealEstateMarketplace = safeLazy(() => import("@/pages/real-estate/RealEstateMarketplace"), "RealEstateMarketplace");
export const RealEstateDetailPage = safeLazy(() => import("@/pages/real-estate/RealEstateDetailPage"), "RealEstateDetailPage");
export const DubaiAnalyticsPage = safeLazy(() => import("@/pages/real-estate/DubaiAnalyticsPage"), "DubaiAnalyticsPage");

// Dashboard — Real Estate sub-module
export const RealEstateModulePage = safeLazy(() => import("@/pages/real-estate/RealEstateModule"), "RealEstateModule");
export const REPropertiesPage = safeLazy(() => import("@/pages/real-estate/PropertiesPage"), "REProperties");
export const REUnitsPage = safeLazy(() => import("@/pages/real-estate/UnitsPage"), "REUnits");
export const RETenantsPage = safeLazy(() => import("@/pages/real-estate/TenantsPage"), "RETenants");
export const RELeasesPage = safeLazy(() => import("@/pages/real-estate/LeasesPage"), "RELeases");
export const REPaymentsPage = safeLazy(() => import("@/pages/real-estate/PaymentsPage"), "REPayments");
export const REDocumentsPage = safeLazy(() => import("@/pages/real-estate/DocumentsPage"), "REDocuments");
export const REPropertyDetailPage = safeLazy(() => import("@/pages/real-estate/PropertyDetailPage"), "REPropertyDetail");
export const RELeaseDetailPage = safeLazy(() => import("@/pages/real-estate/LeaseDetailPage"), "RELeaseDetail");

// ═══════════════════════════════════════════════════════════════════
//  PILLAR 2 · RADAR (Discover · Browse · Travel · Mobility)
// ═══════════════════════════════════════════════════════════════════
export const HyperRadarPage = safeLazy(() => import("@/pages/HyperRadarPage"), "HyperRadarPage");
export const ExplorePage = safeLazy(() => import("@/pages/ExplorePage"), "ExplorePage");
export const SearchResultsPage = safeLazy(() => import("@/pages/SearchResultsPage"), "SearchResultsPage");
export const DemandHeatmapPage = safeLazy(() => import("@/pages/DemandHeatmapPage"), "DemandHeatmapPage");

// Radar — Universe hubs
export const DiscoverPage = safeLazy(() => import("@/pages/universe/DiscoverPage"), "DiscoverPage");
export const BrowseVerticalPage = safeLazy(() => import("@/pages/universe/BrowseVerticalPage"), "BrowseVerticalPage");
export const RetailIndexPage = safeLazy(() => import("@/pages/universe/RetailIndexPage"), "RetailIndexPage");
export const RetailCategoryPage = safeLazy(() => import("@/pages/universe/RetailCategoryPage"), "RetailCategoryPage");
export const RetailMallPage = safeLazy(() => import("@/pages/universe/RetailMallPage"), "RetailMallPage");
export const RetailStorePage = safeLazy(() => import("@/pages/universe/RetailStorePage"), "RetailStorePage");
export const PropertyHubPage = safeLazy(() => import("@/pages/property/PropertyHub"), "PropertyHubPage");

// Radar — Food
export const FoodTypePage = safeLazy(() => import("@/pages/food/FoodTypePage"), "FoodTypePage");
export const CuisineListPage = safeLazy(() => import("@/pages/food/CuisineListPage"), "CuisineListPage");
export const FoodRestaurantPage = safeLazy(() => import("@/pages/food/RestaurantPage"), "FoodRestaurantPage");

// Radar — Travel
export const TravelHub = safeLazy(() => import("@/pages/travel/TravelHub"), "TravelHub");
export const TravelFlights = safeLazy(() => import("@/pages/travel/TravelFlights"), "TravelFlights");
export const TravelStays = safeLazy(() => import("@/pages/travel/TravelStayHub"), "TravelStayHub");
export const TravelHotelDetail = safeLazy(() => import("@/pages/travel/TravelHotelDetail"), "TravelHotelDetail");
export const HotelCheckout = safeLazy(() => import("@/pages/travel/HotelCheckout"), "HotelCheckout");
export const TravelStayDetail = safeLazy(() => import("@/pages/travel/TravelStayDetail"), "TravelStayDetail");
export const TravelFlightDetail = safeLazy(() => import("@/pages/travel/TravelFlightDetail"), "TravelFlightDetail");
export const FlightSearchPage = safeLazy(() => import("@/pages/travel/FlightSearchPage"), "FlightSearchPage");
export const FlightResultsPage = safeLazy(() => import("@/pages/travel/FlightResultsPage"), "FlightResultsPage");
export const FlightDetailPage = safeLazy(() => import("@/pages/travel/FlightDetailPage"), "FlightDetailPage");
export const FlightPassengerPage = safeLazy(() => import("@/pages/travel/FlightPassengerPage"), "FlightPassengerPage");
export const FlightPaymentPage = safeLazy(() => import("@/pages/travel/FlightPaymentPage"), "FlightPaymentPage");
export const FlightConfirmationPage = safeLazy(() => import("@/pages/travel/FlightConfirmationPage"), "FlightConfirmationPage");

// Radar — Property Booking (unified Hotel + Property)
export const PropertySearchPage = safeLazy(() => import("@/pages/property/PropertySearchPage"), "PropertySearchPage");
export const PropertyResultsPage = safeLazy(() => import("@/pages/property/PropertyResultsPage"), "PropertyResultsPage");
export const PropertyDetailPage = safeLazy(() => import("@/pages/property/PropertyDetailPage"), "PropertyDetailPage");
export const PropertyBookingPage = safeLazy(() => import("@/pages/property/PropertyBookingPage"), "PropertyBookingPage");
export const PropertyPaymentPage = safeLazy(() => import("@/pages/property/PropertyPaymentPage"), "PropertyPaymentPage");
export const PropertyConfirmationPage = safeLazy(() => import("@/pages/property/PropertyConfirmationPage"), "PropertyConfirmationPage");

// Radar — Mobility
export const MobilityHubPage = safeLazy(() => import("@/pages/mobility/MobilityHubPage"), "MobilityHubPage");
export const MobilityTaxiPage = safeLazy(() => import("@/pages/mobility/MobilityTaxiPage"), "MobilityTaxiPage");
export const MobilityDeliveryPage = safeLazy(() => import("@/pages/mobility/MobilityDeliveryPage"), "MobilityDeliveryPage");
export const DeliveryBringPage = safeLazy(() => import("@/pages/mobility/DeliveryBringPage"), "DeliveryBringPage");
export const DeliveryParcelPage = safeLazy(() => import("@/pages/mobility/DeliveryParcelPage"), "DeliveryParcelPage");
export const DeliveryGiftPage = safeLazy(() => import("@/pages/mobility/DeliveryGiftPage"), "DeliveryGiftPage");
export const DeliveryErrandPage = safeLazy(() => import("@/pages/mobility/DeliveryErrandPage"), "DeliveryErrandPage");
export const RiderLivePage = safeLazy(() => import("@/pages/mobility/RiderLivePage"), "RiderLivePage");
export const TrackRidePage = safeLazy(() => import("@/pages/TrackRidePage"), "TrackRidePage");
export const CallDriverPage = safeLazy(() => import("@/pages/CallDriverPage"), "CallDriverPage");

// Radar — C2C Marketplace
export const C2CMarketplace = safeLazy(() => import("@/pages/marketplace/C2CMarketplace"), "C2CMarketplace");
export const C2CListingDetail = safeLazy(() => import("@/pages/marketplace/C2CListingDetail"), "C2CListingDetail");

// Radar — Public listings & marketplace
export const PublicListing = safeLazy(() => import("@/pages/PublicListing"), "PublicListing");
export const PublicServiceBooking = safeLazy(() => import("@/pages/PublicServiceBooking"), "PublicServiceBooking");
export const PublicRealEstateListing = safeLazy(() => import("@/pages/PublicRealEstateListing"), "PublicRealEstateListing");
export const LocalServices = safeLazy(() => import("@/pages/LocalServices"), "LocalServices");
export const RentalCatalog = safeLazy(() => import("@/pages/RentalCatalog"), "RentalCatalog");
export const HostCatalog = safeLazy(() => import("@/pages/HostCatalog"), "HostCatalog");
export const ActivitiesMarketplace = safeLazy(() => import("@/pages/ActivitiesMarketplace"), "ActivitiesMarketplace");
export const GuestPortal = safeLazy(() => import("@/pages/GuestPortal"), "GuestPortal");
export const ProviderStorefront = safeLazy(() => import("@/components/marketplace/ProviderStorefront"), "ProviderStorefront");
export const StorePage = safeLazy(() => import("@/pages/StorePage"), "StorePage");
export const ShopPage = safeLazy(() => import("@/pages/ShopPage"), "ShopPage");
export const ShopCategoryPage = safeLazy(() => import("@/pages/ShopCategoryPage"), "ShopCategoryPage");
export const PropertiesShowcase = safeLazy(() => import("@/pages/PropertiesShowcase"), "PropertiesShowcase");
export const AccountShowcase = safeLazy(() => import("@/pages/AccountShowcase"), "AccountShowcase");
export const PropertyManagementHub = safeLazy(() => import("@/pages/PropertyManagementHub"), "PropertyManagementHub");
export const ConciergeServicesPage = safeLazy(() => import("@/pages/seo/ConciergeServicesPage"), "ConciergeServicesPage");
export const CityMarketplacePage = safeLazy(() => import("@/pages/CityMarketplacePage"), "CityMarketplacePage");

// ═══════════════════════════════════════════════════════════════════
//  PILLAR 3 · ORBIT (Messaging · Contacts · Identity)
// ═══════════════════════════════════════════════════════════════════
export const OrbitContactsPage = safeLazy(() => import("@/pages/OrbitContactsPage"), "OrbitContactsPage");
export const OrbitIdentityPage = safeLazy(() => import("@/pages/OrbitIdentityPage"), "OrbitIdentityPage");
export const OrbitAddContactPage = safeLazy(() => import("@/pages/OrbitAddContactPage"), "OrbitAddContactPage");

// ═══════════════════════════════════════════════════════════════════
//  PILLAR 4 · WALLET (Pay · Orders · Checkout · POS)
// ═══════════════════════════════════════════════════════════════════
export const WalletHubPage = safeLazy(() => import("@/pages/WalletHubPage"), "WalletHubPage");
export const WalletTopUpPage = safeLazy(() => import("@/pages/wallet/WalletTopUpPage"), "WalletTopUpPage");
export const WalletTransferPage = safeLazy(() => import("@/pages/wallet/WalletTransferPage"), "WalletTransferPage");
export const WalletRequestPage = safeLazy(() => import("@/pages/wallet/WalletRequestPage"), "WalletRequestPage");
export const WalletTransactionDetailPage = safeLazy(() => import("@/pages/wallet/WalletTransactionDetailPage"), "WalletTransactionDetailPage");
export const PayRidePage = safeLazy(() => import("@/pages/PayRidePage"), "PayRidePage");
export const DriverPayoutPage = safeLazy(() => import("@/pages/DriverPayoutPage"), "DriverPayoutPage");

// Wallet — Forex Dashboard
export const ForexDashboardPage = safeLazy(() => import("@/pages/wallet/ForexDashboardPage"), "ForexDashboardPage");

// Wallet — Property Finance
export const WalletPropertyHub = safeLazy(() => import("@/pages/wallet/WalletPropertyHub"), "WalletPropertyHub");

// Wallet — Payments
export const PaymentLinkResolverPage = safeLazy(() => import("@/pages/pay/PaymentLinkResolverPage"), "PaymentLinkResolverPage");
export const PaymentConfirmPage = safeLazy(() => import("@/pages/pay/PaymentConfirmPage"), "PaymentConfirmPage");
export const PaymentPage = safeLazy(() => import("@/pages/PaymentPage"), "PaymentPage");
export const StripeElementsPage = safeLazy(() => import("@/pages/StripeElementsPage"), "StripeElementsPage");
export const StripeCheckoutHandlerPage = safeLazy(() => import("@/pages/payments/StripeCheckoutHandlerPage"), "StripeCheckoutHandlerPage");
export const CheckoutPage = safeLazy(() => import("@/pages/CheckoutPage"), "CheckoutPage");
export const FoodOrderCheckoutPage = safeLazy(() => import("@/pages/FoodOrderCheckoutPage"), "FoodOrderCheckoutPage");
export const GuestCheckoutPage = safeLazy(() => import("@/pages/GuestCheckoutPage"), "GuestCheckoutPage");
export const POSPage = safeLazy(() => import("@/pages/POSPage"), "POSPage");
export const LoyaltyRedeemPage = safeLazy(() => import("@/pages/LoyaltyRedeemPage"), "LoyaltyRedeemPage");

// Wallet — Orders
export const MyOrdersPage = safeLazy(() => import("@/pages/MyOrdersPage"), "MyOrdersPage");
export const UnifiedOrderDetailPage = safeLazy(() => import("@/pages/UnifiedOrderDetailPage"), "UnifiedOrderDetailPage");
export const TrackingPage = safeLazy(() => import("@/pages/TrackingPage"), "TrackingPage");
export const LiveTrackingPageNew = safeLazy(() => import("@/pages/live/LiveTrackingPage"), "LiveTrackingPageNew");
export const DeliveryProofPage = safeLazy(() => import("@/pages/DeliveryProofPage"), "DeliveryProofPage");
export const OrderReceiptPage = safeLazy(() => import("@/pages/OrderReceiptPage"), "OrderReceiptPage");
export const OrderRefundRequestPage = safeLazy(() => import("@/pages/orders/OrderRefundRequestPage"), "OrderRefundRequestPage");
export const ReorderPage = safeLazy(() => import("@/pages/ReorderPage"), "ReorderPage");

// Wallet — Customer checkout features
export const CustomerAddressSelectorPage = safeLazy(() => import("@/pages/customer/CustomerAddressSelectorPage"), "CustomerAddressSelectorPage");
export const CustomerGroupOrderPage = safeLazy(() => import("@/pages/customer/CustomerGroupOrderPage"), "CustomerGroupOrderPage");
export const CustomerOrderGiftsPage = safeLazy(() => import("@/pages/customer/CustomerOrderGiftsPage"), "CustomerOrderGiftsPage");
export const CustomerSplitBillPage = safeLazy(() => import("@/pages/customer/CustomerSplitBillPage"), "CustomerSplitBillPage");
export const CustomerSavedCartsPage2 = safeLazy(() => import("@/pages/customer/CustomerSavedCartsPage"), "CustomerSavedCartsPage2");
export const CustomerAutoRepeatPage = safeLazy(() => import("@/pages/customer/CustomerAutoRepeatPage"), "CustomerAutoRepeatPage");
export const CustomerPartyOrderPage = safeLazy(() => import("@/pages/customer/CustomerPartyOrderPage"), "CustomerPartyOrderPage");
export const CustomerRewardRedemptionPage = safeLazy(() => import("@/pages/customer/CustomerRewardRedemptionPage"), "CustomerRewardRedemptionPage");
export const CustomerShareCartPage = safeLazy(() => import("@/pages/customer/CustomerShareCartPage"), "CustomerShareCartPage");

// ═══════════════════════════════════════════════════════════════════
//  PILLAR 5 · ME (Profile · Settings · Merchant · Driver · Customer)
// ═══════════════════════════════════════════════════════════════════
export const MeCommandCenter = safeLazy(() => import("@/pages/MeCommandCenter"), "MeCommandCenter");
export const FavoritesPage = safeLazy(() => import("@/pages/FavoritesPage"), "FavoritesPage");
export const NotificationCenterPage = safeLazy(() => import("@/pages/notifications/NotificationCenterPage"), "NotificationCenterPage");
export const Install = safeLazy(() => import("@/pages/Install"), "Install");

// Me — Settings
export const SettingsAccountPage = safeLazy(() => import("@/pages/settings/SettingsAccount"), "SettingsAccount");
export const SettingsOrbitPage = safeLazy(() => import("@/pages/settings/SettingsOrbit"), "SettingsOrbit");
export const SettingsBusinessPage = safeLazy(() => import("@/pages/settings/SettingsBusiness"), "SettingsBusiness");
export const SettingsWalletPage = safeLazy(() => import("@/pages/settings/SettingsWallet"), "SettingsWallet");
export const SettingsAddressesPage = safeLazy(() => import("@/pages/settings/SettingsAddresses"), "SettingsAddresses");
export const SettingsNotificationsPage = safeLazy(() => import("@/pages/settings/SettingsNotifications"), "SettingsNotifications");
export const SettingsSecurityPage = safeLazy(() => import("@/pages/settings/SettingsSecurity"), "SettingsSecurity");
export const SettingsPreferencesPage = safeLazy(() => import("@/pages/settings/SettingsPreferences"), "SettingsPreferences");
export const SettingsSupportPage = safeLazy(() => import("@/pages/settings/SettingsSupport"), "SettingsSupport");
export const SettingsSubscriptionPage = safeLazy(() => import("@/pages/settings/SettingsSubscription"), "SettingsSubscription");
export const SettingsPrivacyPage = safeLazy(() => import("@/pages/settings/SettingsPrivacy"), "SettingsPrivacy");
export const SettingsMarketingPage = safeLazy(() => import("@/pages/settings/SettingsMarketing"), "SettingsMarketing");

// Provider — dashboard pages for service providers
export const ProviderAvailabilityPage = safeLazy(() => import("@/pages/provider/ProviderAvailability"), "ProviderAvailability");
export const ProviderZonesPage = safeLazy(() => import("@/pages/provider/ProviderZones"), "ProviderZones");
export const ProviderBookingsPage = safeLazy(() => import("@/pages/provider/ProviderBookings"), "ProviderBookings");
export const ProviderServicesPage = safeLazy(() => import("@/pages/provider/ProviderServices"), "ProviderServices");

// Me — Property Management (mobile-first)
export const MePropertyHub = safeLazy(() => import("@/pages/me/MePropertyHub"), "MePropertyHub");
export const MePropertyDetail = safeLazy(() => import("@/pages/me/MePropertyDetail"), "MePropertyDetail");
export const MeTenantView = safeLazy(() => import("@/pages/me/MeTenantView"), "MeTenantView");

// Me — Real Estate Vertical (global property management cockpit)
export const MePropertyCockpit = safeLazy(() => import("@/pages/me/MePropertyCockpit"), "MePropertyCockpit");
export const MePropertyListPage = safeLazy(() => import("@/pages/me/MePropertyListPage"), "MePropertyListPage");
export const MePropertyCreatePage = safeLazy(() => import("@/pages/me/MePropertyCreatePage"), "MePropertyCreatePage");
export const MeTenantsPage = safeLazy(() => import("@/pages/me/MeTenantsPage"), "MeTenantsPage");
export const MeLeasesPage = safeLazy(() => import("@/pages/me/MeLeasesPage"), "MeLeasesPage");
export const MeMaintenancePage = safeLazy(() => import("@/pages/me/MeMaintenancePage"), "MeMaintenancePage");
export const MePropertyAnalyticsPage = safeLazy(() => import("@/pages/me/MePropertyAnalyticsPage"), "MePropertyAnalyticsPage");

// Me — Customer pages
export const CustomerSpendingInsightsPage = safeLazy(() => import("@/pages/CustomerSpendingInsightsPage"), "CustomerSpendingInsightsPage");
export const EditProfilePage = safeLazy(() => import("@/pages/EditProfilePage"), "EditProfilePage");
export const CustomerAddressBookPage = safeLazy(() => import("@/pages/customer/CustomerAddressBookPage"), "CustomerAddressBookPage");
export const CustomerLoyaltyHistoryPage = safeLazy(() => import("@/pages/customer/CustomerLoyaltyHistoryPage"), "CustomerLoyaltyHistoryPage");
export const CustomerChallengesPage = safeLazy(() => import("@/pages/customer/CustomerChallengesPage"), "CustomerChallengesPage");
export const CustomerReferralPage = safeLazy(() => import("@/pages/customer/CustomerReferralPage"), "CustomerReferralPage");
export const CreatorDashboardPage = safeLazy(() => import("@/pages/creator/CreatorDashboardPage"), "CreatorDashboardPage");
export const CustomerActiveOrdersPage = safeLazy(() => import("@/pages/customer/CustomerActiveOrdersPage"), "CustomerActiveOrdersPage");
export const CustomerOrderArchivePage = safeLazy(() => import("@/pages/customer/CustomerOrderArchivePage"), "CustomerOrderArchivePage");
export const CustomerReorderPage = safeLazy(() => import("@/pages/customer/CustomerReorderPage"), "CustomerReorderPage");
export const CustomerLiveLocationPage = safeLazy(() => import("@/pages/customer/CustomerLiveLocationPage"), "CustomerLiveLocationPage");
export const CustomerSavedCardsPage = safeLazy(() => import("@/pages/customer/CustomerSavedCardsPage"), "CustomerSavedCardsPage");
export const CustomerDeliveryNotesPage = safeLazy(() => import("@/pages/customer/CustomerDeliveryNotesPage"), "CustomerDeliveryNotesPage");
export const CustomerPaymentActivityPage = safeLazy(() => import("@/pages/customer/CustomerPaymentActivityPage"), "CustomerPaymentActivityPage");
export const CustomerOrderReceiptsPage = safeLazy(() => import("@/pages/customer/CustomerOrderReceiptsPage"), "CustomerOrderReceiptsPage");
export const CustomerProfilePage = safeLazy(() => import("@/pages/CustomerProfilePage"), "CustomerProfilePage");
export const RefundRequestPage = safeLazy(() => import("@/pages/RefundRequestPage"), "RefundRequestPage");

// Me — Merchant tools
export const MerchantOnboardingPage = safeLazy(() => import("@/pages/MerchantOnboardingPage"), "MerchantOnboardingPage");
export const MerchantClaimPage = safeLazy(() => import("@/pages/MerchantClaimPage"), "MerchantClaimPage");
export const MerchantDashboardPage = safeLazy(() => import("@/pages/MerchantDashboardPage"), "MerchantDashboardPage");
export const MerchantFinancePage = safeLazy(() => import("@/pages/merchant/MerchantFinancePage"), "MerchantFinancePage");
export const MerchantPosPage = safeLazy(() => import("@/pages/MerchantPosPage"), "MerchantPosPage");
export const MerchantKitchenPage = safeLazy(() => import("@/pages/MerchantKitchenPage"), "MerchantKitchenPage");
export const MerchantOrdersPage = safeLazy(() => import("@/pages/MerchantOrdersPage"), "MerchantOrdersPage");
export const ShopQrCenterPage = safeLazy(() => import("@/pages/merchant/ShopQrCenterPage"), "ShopQrCenterPage");
export const ShopOrderPage = safeLazy(() => import("@/pages/merchant/ShopOrderPage"), "ShopOrderPage");
export const MerchantMenuPageNew = safeLazy(() => import("@/pages/merchant/MerchantMenuPage"), "MerchantMenuPageNew");
export const MerchantStoreSettingsPage = safeLazy(() => import("@/pages/merchant/MerchantStoreSettingsPage"), "MerchantStoreSettingsPage");
export const MerchantPromoManagerPage = safeLazy(() => import("@/pages/merchant/MerchantPromoManagerPage"), "MerchantPromoManagerPage");
export const MerchantOrderBoardPage = safeLazy(() => import("@/pages/merchant/MerchantOrderBoardPage"), "MerchantOrderBoardPage");
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
export const MerchantReviewRepliesPage = safeLazy(() => import("@/pages/merchant/MerchantReviewRepliesPage"), "MerchantReviewRepliesPage");
export const MerchantRefundRequestsPage = safeLazy(() => import("@/pages/merchant/MerchantRefundRequestsPage"), "MerchantRefundRequestsPage");
export const MerchantMenuBulkEditPage = safeLazy(() => import("@/pages/merchant/MerchantMenuBulkEditPage"), "MerchantMenuBulkEditPage");
export const MerchantDeliveryZonesPage = safeLazy(() => import("@/pages/merchant/MerchantDeliveryZonesPage"), "MerchantDeliveryZonesPage");
export const MerchantKitchenDisplayPage = safeLazy(() => import("@/pages/merchant/MerchantKitchenDisplayPage"), "MerchantKitchenDisplayPage");
export const MerchantBusinessHoursPage = safeLazy(() => import("@/pages/merchant/MerchantBusinessHoursPage"), "MerchantBusinessHoursPage");
export const MerchantMenuCategoryManagerPage = safeLazy(() => import("@/pages/merchant/MerchantMenuCategoryManagerPage"), "MerchantMenuCategoryManagerPage");

// Restaurant routes
export const MerchantMenuItemEditorPage = safeLazy(() => import("@/pages/merchant/MerchantMenuItemEditorPage"), "MerchantMenuItemEditorPage");

// Me — Driver tools
export const DriverDashboardPageNew = safeLazy(() => import("@/pages/driver/DriverDashboardPage"), "DriverDashboardPageNew");
export const DriverLivePage = safeLazy(() => import("@/pages/DriverLivePage"), "DriverLivePage");
export const DriverEarningsPageNew = safeLazy(() => import("@/pages/driver/DriverEarningsPageNew"), "DriverEarningsPageNew");
export const DriverMissionsPage = safeLazy(() => import("@/pages/driver/DriverMissionsPage"), "DriverMissionsPage");
export const DriverMissionDetailPage = safeLazy(() => import("@/pages/driver/DriverMissionDetailPage"), "DriverMissionDetailPage");
export const DriverProofPage = safeLazy(() => import("@/pages/driver/DriverProofPage"), "DriverProofPage");
export const DriverEarningsSummaryPage = safeLazy(() => import("@/pages/driver/DriverEarningsSummaryPage"), "DriverEarningsSummaryPage");
export const DriverActiveMissionsPage = safeLazy(() => import("@/pages/driver/DriverActiveMissionsPage"), "DriverActiveMissionsPage");
export const DriverShiftPage = safeLazy(() => import("@/pages/driver/DriverShiftPage"), "DriverShiftPage");
export const DriverAvailabilityZonesPage = safeLazy(() => import("@/pages/driver/DriverAvailabilityZonesPage"), "DriverAvailabilityZonesPage");
export const DriverCompletedDeliveriesPage = safeLazy(() => import("@/pages/driver/DriverCompletedDeliveriesPage"), "DriverCompletedDeliveriesPage");
export const DriverLiveMissionsPage = safeLazy(() => import("@/pages/driver/DriverLiveMissionsPage"), "DriverLiveMissionsPage");
export const DriverFuelCostsPage = safeLazy(() => import("@/pages/driver/DriverFuelCostsPage"), "DriverFuelCostsPage");
export const DriverBreaksPage = safeLazy(() => import("@/pages/driver/DriverBreaksPage"), "DriverBreaksPage");

// Taxi & Ride routes
export const DriverTaxiDashboardPage = safeLazy(() => import("@/pages/driver/DriverTaxiDashboardPage"), "DriverTaxiDashboardPage");
export const DriverTaxiEarningsPage = safeLazy(() => import("@/pages/driver/DriverTaxiEarningsPage"), "DriverTaxiEarningsPage");

// Me — Seller & Business
export const SellerDashboardPage = safeLazy(() => import("@/pages/seller/SellerDashboardPage"), "SellerDashboardPage");
export const BoostDashboardPage = safeLazy(() => import("@/pages/boost/BoostDashboardPage"), "BoostDashboardPage");
export const MyShopsPage = safeLazy(() => import("@/pages/MyShopsPage"), "MyShopsPage");
export const MyBusinessHub = safeLazy(() => import("@/pages/MyBusinessHub"), "MyBusinessHub");
export const OpsCenter = safeLazy(() => import("@/pages/OpsCenter"), "OpsCenter");
export const SupportTicketsPage = safeLazy(() => import("@/pages/support/SupportTicketsPage"), "SupportTicketsPage");
export const SupportTicketDetailPage = safeLazy(() => import("@/pages/support/SupportTicketDetailPage"), "SupportTicketDetailPage");
export const PermissionCenterPage = safeLazy(() => import("@/pages/PermissionCenterPage"), "PermissionCenterPage");
export const TeamCommandCenterPage = safeLazy(() => import("@/pages/TeamCommandCenterPage"), "TeamCommandCenterPage");
export const TeamPermissionsPage = safeLazy(() => import("@/pages/TeamPermissionsPage"), "TeamPermissionsPage");

// ═══════════════════════════════════════════════════════════════════
//  DEVOS / BUILDER — Internal builder system pages
// ═══════════════════════════════════════════════════════════════════
export const DevOSDashboardPage = safeLazy(() => import("@/pages/builder/DevOSDashboardPage"), "DevOSDashboardPage");
export const ArchitectureMapPage = safeLazy(() => import("@/pages/builder/ArchitectureMapPage"), "ArchitectureMapPage");
export const AuditCenterPage = safeLazy(() => import("@/pages/builder/AuditCenterPage"), "AuditCenterPage");
export const RepairCenterPage = safeLazy(() => import("@/pages/builder/RepairCenterPage"), "RepairCenterPage");
export const MemoryCenterPage = safeLazy(() => import("@/pages/builder/MemoryCenterPage"), "MemoryCenterPage");
export const DeployCenterPage = safeLazy(() => import("@/pages/builder/DeployCenterPage"), "DeployCenterPage");

// ═══════════════════════════════════════════════════════════════════
//  ADMIN PANEL — Canonical pages only
//  (Redundant/duplicate pages removed; their routes redirect below)
// ═══════════════════════════════════════════════════════════════════
export const AdminDashboard = safeLazy(() => import("@/pages/AdminDashboard"), "AdminDashboard");
export const AdminDisputesPage = safeLazy(() => import("@/pages/AdminDisputesPage"), "AdminDisputesPage");
export const FinancialReconPage = safeLazy(() => import("@/pages/FinancialReconPage"), "FinancialReconPage");
export const ConciergeOperations = safeLazy(() => import("@/pages/ConciergeOperations"), "ConciergeOperations");
export const MenuAdminPage = safeLazy(() => import("@/pages/MenuAdminPage"), "MenuAdminPage");
export const SupportInboxPage = safeLazy(() => import("@/pages/SupportInboxPage"), "SupportInboxPage");
export const AdminRealtimeControlPage = safeLazy(() => import("@/pages/AdminRealtimeControlPage"), "AdminRealtimeControlPage");
export const AdminAlertCenterPage = safeLazy(() => import("@/pages/AdminAlertCenterPage"), "AdminAlertCenterPage");
export const AdminWalletDiagnosticsPage = safeLazy(() => import("@/pages/AdminWalletDiagnosticsPage"), "AdminWalletDiagnosticsPage");
export const ExecutionProofPage = safeLazy(() => import("@/pages/admin/ExecutionProofPage"), "ExecutionProofPage");
export const AdminReviewQueuePage = safeLazy(() => import("@/pages/AdminReviewQueuePage"), "AdminReviewQueuePage");
export const AdminUiEnginePage = safeLazy(() => import("@/pages/admin/AdminUiEnginePage"), "AdminUiEnginePage");
export const AdminMarketplaceOpsPage = safeLazy(() => import("@/pages/admin/AdminMarketplaceOpsPage"), "AdminMarketplaceOpsPage");
export const AdminOpsDashboardPage = safeLazy(() => import("@/pages/admin/AdminOpsDashboardPage"), "AdminOpsDashboardPage");
export const AdminPipelinePage = safeLazy(() => import("@/pages/admin/AdminPipelinePage"), "AdminPipelinePage");
export const AdminEnginesDashboardPage = safeLazy(() => import("@/pages/admin/AdminEnginesDashboardPage"), "AdminEnginesDashboardPage");
export const AdminAutonomyDashboardPage = safeLazy(() => import("@/pages/admin/AdminAutonomyDashboardPage"), "AdminAutonomyDashboardPage");
export const AdminSupportOpsPage = safeLazy(() => import("@/pages/admin/AdminSupportOpsPage"), "AdminSupportOpsPage");
export const AdminDeliveryOpsPage = safeLazy(() => import("@/pages/admin/AdminDeliveryOpsPage"), "AdminDeliveryOpsPage");
export const AdminPaymentsOpsPage = safeLazy(() => import("@/pages/admin/AdminPaymentsOpsPage"), "AdminPaymentsOpsPage");
export const AdminSeedToolsPage = safeLazy(() => import("@/pages/admin/AdminSeedToolsPage"), "AdminSeedToolsPage");
export const AdminContentOpsPage = safeLazy(() => import("@/pages/admin/AdminContentOpsPage"), "AdminContentOpsPage");
export const AdminAnalyticsOpsPage = safeLazy(() => import("@/pages/admin/AdminAnalyticsOpsPage"), "AdminAnalyticsOpsPage");
export const AdminQualityOpsPage = safeLazy(() => import("@/pages/admin/AdminQualityOpsPage"), "AdminQualityOpsPage");
export const AdminCrmOpsPage = safeLazy(() => import("@/pages/admin/AdminCrmOpsPage"), "AdminCrmOpsPage");
export const AdminGrowthOpsPage = safeLazy(() => import("@/pages/admin/AdminGrowthOpsPage"), "AdminGrowthOpsPage");
export const AdminRetentionOpsPage = safeLazy(() => import("@/pages/admin/AdminRetentionOpsPage"), "AdminRetentionOpsPage");
export const AdminMerchantHealthPage = safeLazy(() => import("@/pages/admin/AdminMerchantHealthPage"), "AdminMerchantHealthPage");
export const AdminShopImportPage = safeLazy(() => import("@/pages/admin/AdminShopImportPage"), "AdminShopImportPage");
export const AdminShopQualityPage = safeLazy(() => import("@/pages/admin/AdminShopQualityPage"), "AdminShopQualityPage");
export const AdminSourceAuditPage = safeLazy(() => import("@/pages/admin/AdminSourceAuditPage"), "AdminSourceAuditPage");
export const AdminDriverMonitorPage = safeLazy(() => import("@/pages/admin/AdminDriverMonitorPage"), "AdminDriverMonitorPage");
export const AdminUserLookupPage = safeLazy(() => import("@/pages/admin/AdminUserLookupPage"), "AdminUserLookupPage");
export const AdminNotificationOpsPage = safeLazy(() => import("@/pages/admin/AdminNotificationOpsPage"), "AdminNotificationOpsPage");
export const AdminFinanceSummaryPage = safeLazy(() => import("@/pages/admin/AdminFinanceSummaryPage"), "AdminFinanceSummaryPage");
export const AdminOrderWatchPage = safeLazy(() => import("@/pages/admin/AdminOrderWatchPage"), "AdminOrderWatchPage");
export const AdminSystemHealthPage = safeLazy(() => import("@/pages/admin/AdminSystemHealthPage"), "AdminSystemHealthPage");
export const AdminFraudDetectionPage = safeLazy(() => import("@/pages/admin/AdminFraudDetectionPage"), "AdminFraudDetectionPage");
export const AdminMerchantApprovalQueuePage = safeLazy(() => import("@/pages/admin/AdminMerchantApprovalQueuePage"), "AdminMerchantApprovalQueuePage");
export const AdminSupportSlaPage = safeLazy(() => import("@/pages/admin/AdminSupportSlaPage"), "AdminSupportSlaPage");
export const AdminRefundQueuePage = safeLazy(() => import("@/pages/admin/AdminRefundQueuePage"), "AdminRefundQueuePage");
export const AdminPlatformHealthPage = safeLazy(() => import("@/pages/admin/AdminPlatformHealthPage"), "AdminPlatformHealthPage");
export const AdminMasterControlPage = safeLazy(() => import("@/pages/admin/AdminMasterControlPage"), "AdminMasterControlPage");
export const AdminControlRoomPage = safeLazy(() => import("@/pages/admin/AdminControlRoomPage"), "AdminControlRoomPage");
export const EngineControlRoomPage = safeLazy(() => import("@/pages/admin/EngineControlRoomPage"), "EngineControlRoomPage");
export const AdminAIControlCenter = safeLazy(() => import("@/pages/AdminAIControlCenter"), "AdminAIControlCenter");
export const AdminDataQualityPage = safeLazy(() => import("@/pages/admin/AdminDataQualityPage"), "AdminDataQualityPage");
export const CommandControlDashboard = safeLazy(() => import("@/pages/admin/CommandControlDashboard"), "CommandControlDashboard");
export const RiderPrioritySubscriptionPage = safeLazy(() => import("@/pages/RiderPrioritySubscriptionPage"), "RiderPrioritySubscriptionPage");

// ═══════════════════════════════════════════════════════════════════
//  DEEP LINKS · QR
// ═══════════════════════════════════════════════════════════════════
export const UserProfilePage = safeLazy(() => import("@/pages/deep-link/UserProfilePage"), "UserProfilePage");
export const ProductPage = safeLazy(() => import("@/pages/deep-link/ProductPage"), "ProductPage");
export const LivePage = safeLazy(() => import("@/pages/deep-link/LivePage"), "LivePage");
export const PayPage = safeLazy(() => import("@/pages/deep-link/PayPage"), "PayPage");
export const QrPayResolver = safeLazy(() => import("@/pages/deep-link/QrPayResolver"), "QrPayResolver");
export const QrResolvePage = safeLazy(() => import("@/pages/deep-link/QrResolvePage"), "QrResolvePage");
export const ShortLinkResolvePage = safeLazy(() => import("@/pages/deep-link/ShortLinkResolvePage"), "ShortLinkResolvePage");
export const PayRequestPage = safeLazy(() => import("@/pages/deep-link/PayRequestPage"), "PayRequestPage");
export const GuestPaymentSuccess = safeLazy(() => import("@/pages/deep-link/GuestPaymentSuccess"), "GuestPaymentSuccess");
export const AddContactPage = safeLazy(() => import("@/pages/AddContactPage"), "AddContactPage");

export const QrScannerPage = safeLazy(() => import("@/pages/payments/QrScannerPage"), "QrScannerPage");
export const QrEntryPage = safeLazy(() => import("@/pages/QrEntryPage"), "QrEntryPage");
export const QrTrackingPage = safeLazy(() => import("@/pages/qr/QrTrackingPage"), "QrTrackingPage");
export const QrPickupPage = safeLazy(() => import("@/pages/qr/QrPickupPage"), "QrPickupPage");
export const QrGeneratePage = safeLazy(() => import("@/pages/QrGeneratePage"), "QrGeneratePage");

// ═══════════════════════════════════════════════════════════════════
//  SEO · MARKETPLACE · LOCATIONS
// ═══════════════════════════════════════════════════════════════════
export const MarketplaceServicesPage = safeLazy(() => import("@/pages/seo/MarketplaceServicesPage"), "MarketplaceServicesPage");
export const ActivitiesPage = safeLazy(() => import("@/pages/seo/ActivitiesPage"), "ActivitiesPage");
export const SeasonalRentalsPage = safeLazy(() => import("@/pages/seo/SeasonalRentalsPage"), "SeasonalRentalsPage");
export const SEOCatchAll = safeLazy(() => import("@/pages/seo/SEOCatchAll"), "SEOCatchAll");
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
export const ServiceCategoryPage = safeLazy(() => import("@/pages/seo/ServiceHubPage").then(m => ({ default: m.ServiceCategoryPage })), "ServiceCategoryPage");
export const ServiceCityPage = safeLazy(() => import("@/pages/seo/ServiceHubPage").then(m => ({ default: m.ServiceCityPage })), "ServiceCityPage");
export const ProviderSEOPage = safeLazy(() => import("@/pages/seo/ProviderSEOPage"), "ProviderSEOPage");
export const SlugResolver = safeLazy(() => import("@/pages/seo/SEOShortUrlResolver").then(m => ({ default: m.SlugResolver })), "SlugResolver");
export const SlugCategoryResolver = safeLazy(() => import("@/pages/seo/SEOShortUrlResolver").then(m => ({ default: m.SlugCategoryResolver })), "SlugCategoryResolver");
export const CityGuidePage = safeLazy(() => import("@/pages/seo/CityGuidePage"), "CityGuidePage");
export const BestServiceCityPage = safeLazy(() => import("@/pages/seo/BestServiceCityPage"), "BestServiceCityPage");
export const CompareServiceCityPage = safeLazy(() => import("@/pages/seo/CompareServiceCityPage"), "CompareServiceCityPage");

// ═══════════════════════════════════════════════════════════════════
//  LEGAL
// ═══════════════════════════════════════════════════════════════════
export const TermsPage = safeLazy(() => import("@/pages/legal/TermsPage"), "TermsPage");
export const PrivacyPage = safeLazy(() => import("@/pages/legal/PrivacyPage"), "PrivacyPage");
export const CookiePage = safeLazy(() => import("@/pages/legal/CookiePage"), "CookiePage");
export const LegalNoticePage = safeLazy(() => import("@/pages/legal/LegalNoticePage"), "LegalNoticePage");
export const AboutPage = safeLazy(() => import("@/pages/legal/AboutPage"), "AboutPage");
export const ContactPage = safeLazy(() => import("@/pages/legal/ContactPage"), "ContactPage");
export const HelpPage = safeLazy(() => import("@/pages/legal/HelpPage"), "HelpPage");
export const PlatformVision = safeLazy(() => import("@/pages/PlatformVision"), "PlatformVision");

// ═══════════════════════════════════════════════════════════════════
//  Hotel routes
// ═══════════════════════════════════════════════════════════════════
export const HotelDashboardPage = safeLazy(() => import("@/pages/hotel/HotelDashboardPage"), "HotelDashboardPage");
export const HotelCalendarPage = safeLazy(() => import("@/pages/hotel/HotelCalendarPage"), "HotelCalendarPage");
export const HotelRoomsPage = safeLazy(() => import("@/pages/hotel/HotelRoomsPage"), "HotelRoomsPage");
export const HotelPricingPage = safeLazy(() => import("@/pages/hotel/HotelPricingPage"), "HotelPricingPage");

// ═══════════════════════════════════════════════════════════════════
//  MISC
// ═══════════════════════════════════════════════════════════════════
export const ClaimPage = safeLazy(() => import("@/pages/ClaimPage"), "ClaimPage");
export const ClaimShopPage = safeLazy(() => import("@/pages/ClaimShopPage"), "ClaimShopPage");
export const AppNotFoundPage = safeLazy(() => import("@/pages/AppNotFoundPage"), "AppNotFoundPage");

// ═══════════════════════════════════════════════════════════════════
//  PRO BACK OFFICE CONSOLE
// ═══════════════════════════════════════════════════════════════════
export const ProShell = safeLazy(() => import("@/pages/pro/ProShell"), "ProShell");
export const ProDashboard = safeLazy(() => import("@/pages/pro/ProDashboard"), "ProDashboard");
export const ProOnboarding = safeLazy(() => import("@/pages/pro/ProOnboarding"), "ProOnboarding");
export const ProProfile = safeLazy(() => import("@/pages/pro/ProProfile"), "ProProfile");
export const ProMedia = safeLazy(() => import("@/pages/pro/ProMedia"), "ProMedia");
export const ProCatalog = safeLazy(() => import("@/pages/pro/ProCatalog"), "ProCatalog");
export const ProAvailability = safeLazy(() => import("@/pages/pro/ProAvailability"), "ProAvailability");
export const ProPricing = safeLazy(() => import("@/pages/pro/ProPricing"), "ProPricing");
export const ProOrders = safeLazy(() => import("@/pages/pro/ProOrders"), "ProOrders");
export const ProInbox = safeLazy(() => import("@/pages/pro/ProInbox"), "ProInbox");
export const ProReviews = safeLazy(() => import("@/pages/pro/ProReviews"), "ProReviews");
export const ProWallet = safeLazy(() => import("@/pages/pro/ProWallet"), "ProWallet");
export const ProTeam = safeLazy(() => import("@/pages/pro/ProTeam"), "ProTeam");
export const ProAnalytics = safeLazy(() => import("@/pages/pro/ProAnalytics"), "ProAnalytics");
export const ProLiveMonitor = safeLazy(() => import("@/pages/pro/ProLiveMonitor"), "ProLiveMonitor");
export const ProSettings = safeLazy(() => import("@/pages/pro/ProSettings"), "ProSettings");
export const ProCompliance = safeLazy(() => import("@/pages/pro/ProCompliance"), "ProCompliance");

// ── KYC & Onboarding ──
export const AdminKycReviewPage = safeLazy(() => import("@/pages/admin/AdminKycReviewPage"), "AdminKycReviewPage");
export const HotelOnboardingWizard = safeLazy(() => import("@/pages/onboarding/HotelOnboardingWizard"), "HotelOnboardingWizard");
export const TaxiDriverOnboardingWizard = safeLazy(() => import("@/pages/onboarding/TaxiDriverOnboardingWizard"), "TaxiDriverOnboardingWizard");
export const ServiceProviderOnboardingWizard = safeLazy(() => import("@/pages/onboarding/ServiceProviderOnboardingWizard"), "ServiceProviderOnboardingWizard");

// ── Social & Engagement ──
export const SocialHubPage = safeLazy(() => import("@/pages/social/SocialHubPage"), "SocialHubPage");
export const BadgesPage = safeLazy(() => import("@/pages/social/BadgesPage"), "BadgesPage");
export const MyReviewsPage = safeLazy(() => import("@/pages/social/MyReviewsPage"), "MyReviewsPage");

// ═══════════════════════════════════════════════════════════════════
//  COMMERCE + SERVICES (Task #142)
// ═══════════════════════════════════════════════════════════════════
export const ProductDetailPage = safeLazy(() => import("@/pages/ProductDetailPage"), "ProductDetailPage");
export const WishlistPage = safeLazy(() => import("@/pages/WishlistPage"), "WishlistPage");
export const MerchantReturnsPage = safeLazy(() => import("@/pages/merchant/MerchantReturnsPage"), "MerchantReturnsPage");
export const ServicesPage = safeLazy(() => import("@/pages/services/ServicesPage"), "ServicesPage");
export const ServiceProviderPage = safeLazy(() => import("@/pages/services/ServiceProviderPage"), "ServiceProviderPage");
export const ProviderDashboardPage = safeLazy(() => import("@/pages/provider/ProviderDashboardPage"), "ProviderDashboardPage");
export const ProviderCalendarPage = safeLazy(() => import("@/pages/provider/ProviderCalendarPage"), "ProviderCalendarPage");
export const ProviderServicesCrudPage = safeLazy(() => import("@/pages/provider/ProviderServicesCrudPage"), "ProviderServicesCrudPage");
export const ProviderAvailabilityPageNew = safeLazy(() => import("@/pages/provider/ProviderAvailabilityPage"), "ProviderAvailabilityPageNew");
export const ProviderEarningsPage = safeLazy(() => import("@/pages/provider/ProviderEarningsPage"), "ProviderEarningsPage");
export const AdminSuperDashboardPage = safeLazy(() => import("@/pages/admin/AdminSuperDashboardPage"), "AdminSuperDashboardPage");

// ── Idle prefetch critical routes ──
const scheduleIdle = (cb: () => void) => requestIdleCallback(cb);
scheduleIdle(() => {
  void import("@/pages/Index");
  void import("@/pages/Dashboard");
  void import("@/pages/CommunicationCenter");
  void import("@/pages/Login");
});
