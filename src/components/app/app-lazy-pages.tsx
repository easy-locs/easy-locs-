/**
 * app-lazy-pages — Centralized lazy import registry for all pages.
 * Single responsibility: lazy page loading with error recovery.
 */
import { lazy, type ComponentType } from "react";

function safeLazy(factory: () => Promise<{ default: ComponentType<any> }>, name: string) {
  return lazy(async () => {
    try {
      const mod = await factory();
      if (!mod?.default) throw new Error(`[lazy] Missing default export for ${name}`);
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

// ── Auth ──
export const Login = safeLazy(() => import("@/pages/Login"), "Login");
export const Signup = safeLazy(() => import("@/pages/Signup"), "Signup");
export const ForgotPassword = safeLazy(() => import("@/pages/ForgotPassword"), "ForgotPassword");
export const ResetPassword = safeLazy(() => import("@/pages/ResetPassword"), "ResetPassword");
export const VerifyEmail = safeLazy(() => import("@/pages/VerifyEmail"), "VerifyEmail");
export const AuthCallbackPage = safeLazy(() => import("@/pages/AuthCallbackPage"), "AuthCallbackPage");
export const Onboarding = safeLazy(() => import("@/pages/Onboarding"), "Onboarding");
export const Install = safeLazy(() => import("@/pages/Install"), "Install");

// ── Core ──
export const Index = safeLazy(() => import("@/pages/Index"), "Index");
export const Dashboard = safeLazy(() => import("@/pages/Dashboard"), "Dashboard");
export const NotFound = safeLazy(() => import("@/pages/NotFound"), "NotFound");
export const Settings = safeLazy(() => import("@/pages/Settings"), "Settings");

// ── Orbit / Communication ──
export const CommunicationCenter = safeLazy(() => import("@/pages/CommunicationCenter"), "CommunicationCenter");
export const OrbitContactsPage = safeLazy(() => import("@/pages/OrbitContactsPageV2"), "OrbitContactsPage");
export const OrbitIdentityPage = safeLazy(() => import("@/pages/OrbitIdentityPage"), "OrbitIdentityPage");
export const AddContactPage = safeLazy(() => import("@/pages/AddContactPage"), "AddContactPage");

// ── Wallet ──
export const WalletHubPage = safeLazy(() => import("@/pages/WalletHubPage"), "WalletHubPage");
export const WalletTopUpPage = safeLazy(() => import("@/pages/wallet/WalletTopUpPage"), "WalletTopUpPage");
export const WalletTransferPage = safeLazy(() => import("@/pages/wallet/WalletTransferPage"), "WalletTransferPage");
export const WalletRequestPage = safeLazy(() => import("@/pages/wallet/WalletRequestPage"), "WalletRequestPage");

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
export const CallDriverPage = safeLazy(() => import("@/pages/CallDriverPage"), "CallDriverPage");
export const DriverPayoutPage = safeLazy(() => import("@/pages/DriverPayoutPage"), "DriverPayoutPage");

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
export const DiscoverPage = safeLazy(() => import("@/pages/universe/DiscoverPage"), "DiscoverPage");
export const BrowseVerticalPage = safeLazy(() => import("@/pages/universe/BrowseVerticalPage"), "BrowseVerticalPage");
export const RetailIndexPage = safeLazy(() => import("@/pages/universe/RetailIndexPage"), "RetailIndexPage");
export const RetailCategoryPage = safeLazy(() => import("@/pages/universe/RetailCategoryPage"), "RetailCategoryPage");
export const RetailMallPage = safeLazy(() => import("@/pages/universe/RetailMallPage"), "RetailMallPage");
export const RetailStorePage = safeLazy(() => import("@/pages/universe/RetailStorePage"), "RetailStorePage");
export const PropertyHubUniverse = safeLazy(() => import("@/pages/universe/PropertyHub"), "PropertyHubUniverse");
export const HealthcareHub = safeLazy(() => import("@/pages/universe/HealthcareHub"), "HealthcareHub");
export const ElectronicsHub = safeLazy(() => import("@/pages/universe/ElectronicsHub"), "ElectronicsHub");
export const GiftsHub = safeLazy(() => import("@/pages/universe/GiftsHub"), "GiftsHub");
export const PetsHub = safeLazy(() => import("@/pages/universe/PetsHub"), "PetsHub");

// ── Food ──
export const FoodTypePage = safeLazy(() => import("@/pages/food/FoodTypePage"), "FoodTypePage");
export const CuisineListPage = safeLazy(() => import("@/pages/food/CuisineListPage"), "CuisineListPage");
export const FoodRestaurantPage = safeLazy(() => import("@/pages/food/RestaurantPage"), "FoodRestaurantPage");

// ── Radar ──
export const HyperRadarPage = safeLazy(() => import("@/pages/HyperRadarPage"), "HyperRadarPage");
export const SuperMapPage = safeLazy(() => import("@/pages/SuperMapPage"), "SuperMapPage");
export const CanonicalMapTestPage = safeLazy(() => import("@/pages/CanonicalMapTestPage"), "CanonicalMapTestPage");

// ── Orders ──
export const MyOrdersPage = safeLazy(() => import("@/pages/MyOrdersPage"), "MyOrdersPage");
export const OrdersPage = safeLazy(() => import("@/pages/OrdersPage"), "OrdersPage");
export const UnifiedOrderDetailPage = safeLazy(() => import("@/pages/UnifiedOrderDetailPage"), "UnifiedOrderDetailPage");
export const CheckoutPage = safeLazy(() => import("@/pages/CheckoutPage"), "CheckoutPage");
export const TrackingPage = safeLazy(() => import("@/pages/TrackingPage"), "TrackingPage");
export const OrderReceiptPage = safeLazy(() => import("@/pages/OrderReceiptPage"), "OrderReceiptPage");
export const ReorderPage = safeLazy(() => import("@/pages/ReorderPage"), "ReorderPage");

// ── Marketplace / Listings ──
export const PublicListing = safeLazy(() => import("@/pages/PublicListing"), "PublicListing");
export const PublicServiceBooking = safeLazy(() => import("@/pages/PublicServiceBooking"), "PublicServiceBooking");
export const LocalServices = safeLazy(() => import("@/pages/LocalServices"), "LocalServices");
export const RentalCatalog = safeLazy(() => import("@/pages/RentalCatalog"), "RentalCatalog");
export const StaysCatalog = safeLazy(() => import("@/pages/StaysCatalog"), "StaysCatalog");
export const HostCatalog = safeLazy(() => import("@/pages/HostCatalog"), "HostCatalog");
export const ActivitiesMarketplace = safeLazy(() => import("@/pages/ActivitiesMarketplace"), "ActivitiesMarketplace");
export const GuestPortal = safeLazy(() => import("@/pages/GuestPortal"), "GuestPortal");
export const ProviderStorefront = safeLazy(() => import("@/components/marketplace/ProviderStorefront"), "ProviderStorefront");
export const StorePage = safeLazy(() => import("@/pages/StorePage"), "StorePage");
export const ShopCategoryPage = safeLazy(() => import("@/pages/ShopCategoryPage"), "ShopCategoryPage");
export const ShopPage = safeLazy(() => import("@/pages/ShopPage"), "ShopPage");
export const SavedListings = safeLazy(() => import("@/pages/SavedListings"), "SavedListings");
export const PropertiesShowcase = safeLazy(() => import("@/pages/PropertiesShowcase"), "PropertiesShowcase");
export const AccountShowcase = safeLazy(() => import("@/pages/AccountShowcase"), "AccountShowcase");
export const CityMarketplacePage = safeLazy(() => import("@/pages/CityMarketplacePage"), "CityMarketplacePage");
export const FavoritesPage = safeLazy(() => import("@/pages/FavoritesPage"), "FavoritesPage");
export const SearchResultsPage = safeLazy(() => import("@/pages/SearchResultsPage"), "SearchResultsPage");

// ── Seller / Merchant ──
export const SellerHubPage = safeLazy(() => import("@/pages/SellerHubPage"), "SellerHubPage");
export const SellerDashboardPage = safeLazy(() => import("@/pages/seller/SellerDashboardPage"), "SellerDashboardPage");
export const MyShopPage = safeLazy(() => import("@/pages/MyShopPage"), "MyShopPage");
export const MyShopsPage = safeLazy(() => import("@/pages/MyShopsPage"), "MyShopsPage");
export const MyBusinessHub = safeLazy(() => import("@/pages/MyBusinessHub"), "MyBusinessHub");
export const MerchantOnboardingPage = safeLazy(() => import("@/pages/MerchantOnboardingPage"), "MerchantOnboardingPage");
export const MerchantClaimPage = safeLazy(() => import("@/pages/MerchantClaimPage"), "MerchantClaimPage");
export const MerchantDashboardPage = safeLazy(() => import("@/pages/MerchantDashboardPage"), "MerchantDashboardPage");
export const ClaimPage = safeLazy(() => import("@/pages/ClaimPage"), "ClaimPage");
export const ClaimShopPage = safeLazy(() => import("@/pages/ClaimShopPage"), "ClaimShopPage");
export const POSPage = safeLazy(() => import("@/pages/POSPage"), "POSPage");
export const BoostDashboardPage = safeLazy(() => import("@/pages/boost/BoostDashboardPage"), "BoostDashboardPage");

// ── Deep-link / QR / Pay ──
export const UserProfilePage = safeLazy(() => import("@/pages/deep-link/UserProfilePage"), "UserProfilePage");
export const ProductPage = safeLazy(() => import("@/pages/deep-link/ProductPage"), "ProductPage");
export const LivePage = safeLazy(() => import("@/pages/deep-link/LivePage"), "LivePage");
export const PayPage = safeLazy(() => import("@/pages/deep-link/PayPage"), "PayPage");
export const QrPayResolver = safeLazy(() => import("@/pages/deep-link/QrPayResolver"), "QrPayResolver");
export const QrResolvePage = safeLazy(() => import("@/pages/deep-link/QrResolvePage"), "QrResolvePage");
export const PayRequestPage = safeLazy(() => import("@/pages/deep-link/PayRequestPage"), "PayRequestPage");
export const QrScannerPage = safeLazy(() => import("@/pages/payments/QrScannerPage"), "QrScannerPage");
export const GuestPaymentSuccess = safeLazy(() => import("@/pages/deep-link/GuestPaymentSuccess"), "GuestPaymentSuccess");
export const PaymentLinkResolverPage = safeLazy(() => import("@/pages/pay/PaymentLinkResolverPage"), "PaymentLinkResolverPage");
export const PaymentConfirmPage = safeLazy(() => import("@/pages/pay/PaymentConfirmPage"), "PaymentConfirmPage");

// ── Notifications ──
export const NotificationCenterPage = safeLazy(() => import("@/pages/notifications/NotificationCenterPage"), "NotificationCenterPage");

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
export const LocationsPage = safeLazy(() => import("@/pages/seo/LocationsPage"), "LocationsPage");
export const CountryHubPage = safeLazy(() => import("@/pages/seo/CountryHubPage"), "CountryHubPage");
export const CityHubPage = safeLazy(() => import("@/pages/seo/CityHubPage"), "CityHubPage");
export const DynamicCityCategoryPage = safeLazy(() => import("@/pages/seo/CityCategoryPage"), "DynamicCityCategoryPage");
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
export const MarketplaceHubPage = safeLazy(() => import("@/pages/seo/MarketplaceCityPage").then(m => ({ default: m.MarketplaceHubPage })), "MarketplaceHubPage");
export const MarketplaceCityPage = safeLazy(() => import("@/pages/seo/MarketplaceCityPage").then(m => ({ default: m.MarketplaceCityPage })), "MarketplaceCityPage");
export const MarketplaceServiceCityPage = safeLazy(() => import("@/pages/seo/MarketplaceCityPage").then(m => ({ default: m.MarketplaceServiceCityPage })), "MarketplaceServiceCityPage");
export const ServicesHubPage = safeLazy(() => import("@/pages/seo/ServiceHubPage").then(m => ({ default: m.ServicesHubPage })), "ServicesHubPage");
export const ServiceCategoryPage = safeLazy(() => import("@/pages/seo/ServiceHubPage").then(m => ({ default: m.ServiceCategoryPage })), "ServiceCategoryPage");
export const ServiceCityPage = safeLazy(() => import("@/pages/seo/ServiceHubPage").then(m => ({ default: m.ServiceCityPage })), "ServiceCityPage");
export const ProviderSEOPage = safeLazy(() => import("@/pages/seo/ProviderSEOPage"), "ProviderSEOPage");
export const SlugResolver = safeLazy(() => import("@/pages/seo/SEOShortUrlResolver").then(m => ({ default: m.SlugResolver })), "SlugResolver");
export const SlugCategoryResolver = safeLazy(() => import("@/pages/seo/SEOShortUrlResolver").then(m => ({ default: m.SlugCategoryResolver })), "SlugCategoryResolver");

// Re-export safeLazy for any remaining inline uses
export { safeLazy };
