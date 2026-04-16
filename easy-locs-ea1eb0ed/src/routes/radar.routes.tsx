import { Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import * as Pages from "@/app/app-route-registry";
import { PillarSkeleton } from "@/app/route-skeletons";

const {
  AccountShowcase, ActivitiesMarketplace, BrowseVerticalPage, CallDriverPage, CityMarketplacePage,
  ConciergeServicesPage, CuisineListPage, DeliveryBringPage, DeliveryErrandPage, DeliveryGiftPage,
  DeliveryParcelPage, DemandHeatmapPage, DiscoverPage, ExplorePage, FlightConfirmationPage,
  FlightDetailPage, FlightPassengerPage, FlightPaymentPage, FlightResultsPage, FlightSearchPage,
  FoodRestaurantPage, FoodTypePage, GeoExplorerPage, GuestPortal, HostCatalog, HotelCalendarPage,
  HotelCheckout, HotelDashboardPage, HotelPricingPage, HotelRoomsPage, HyperRadarPage, LocalServices,
  MobilityDeliveryPage, MobilityHubPage, MobilityTaxiPage, PropertiesShowcase, PropertyBookingPage,
  PropertyConfirmationPage, PropertyDetailPage, PropertyHubPage, PropertyManagementHub,
  PropertyPaymentPage, PropertyResultsPage, PropertySearchPage, ProviderAvailabilityPage,
  ProviderAvailabilityPageNew, ProviderBookingsPage, ProviderCalendarPage, ProviderDashboardPage,
  ProviderEarningsPage, ProviderServicesCrudPage, ProviderServicesPage, ProviderStorefront,
  ProviderZonesPage, PublicListing, PublicRealEstateListing, PublicServiceBooking, RealEstateListings,
  RentalCatalog, RetailCategoryPage, RetailIndexPage, RetailMallPage, RetailStorePage, RiderLivePage,
  RiderPrioritySubscriptionPage, SearchResultsPage, SeasonalRentals, ShopCategoryPage, ShopOrderPage,
  ShopPage, StorePage, TrackRidePage, TravelFlightDetail, TravelFlights, TravelHotelDetail, TravelHub,
  TravelStayDetail, TravelStays,
} = Pages;

export function RadarRoutes() {
  return (
    <>
      <Route path="/radar" element={<FeatureErrorBoundary featureName="Radar"><Suspense fallback={<PillarSkeleton pillar="radar" />}><HyperRadarPage /></Suspense></FeatureErrorBoundary>} />
      <Route path="/map" element={<Navigate to="/radar" replace />} />
      <Route path="/discover" element={<Navigate to="/radar" replace />} />
      <Route path="/search" element={<Navigate to="/radar" replace />} />
      <Route path="/explore" element={<FeatureErrorBoundary featureName="Radar"><Suspense fallback={<PillarSkeleton pillar="radar" />}><ExplorePage /></Suspense></FeatureErrorBoundary>} />
      <Route path="/geo-explorer" element={<FeatureErrorBoundary featureName="Radar"><GeoExplorerPage /></FeatureErrorBoundary>} />
      <Route path="/geo-explorer/:countryCode" element={<FeatureErrorBoundary featureName="Radar"><GeoExplorerPage /></FeatureErrorBoundary>} />
      <Route path="/geo-explorer/:countryCode/:cityId" element={<FeatureErrorBoundary featureName="Radar"><GeoExplorerPage /></FeatureErrorBoundary>} />
      <Route path="/search-results" element={<FeatureErrorBoundary featureName="Radar"><SearchResultsPage /></FeatureErrorBoundary>} />
      <Route path="/browse" element={<FeatureErrorBoundary featureName="Radar"><DiscoverPage /></FeatureErrorBoundary>} />
      <Route path="/browse/:vertical" element={<FeatureErrorBoundary featureName="Radar"><BrowseVerticalPage /></FeatureErrorBoundary>} />
      <Route path="/food" element={<Navigate to="/browse/food" replace />} />
      <Route path="/grocery" element={<Navigate to="/browse/grocery" replace />} />
      <Route path="/services-hub" element={<Navigate to="/browse/services" replace />} />
      <Route path="/shops" element={<Navigate to="/browse/retail" replace />} />
      <Route path="/healthcare" element={<Navigate to="/browse/healthcare" replace />} />
      <Route path="/experiences" element={<Navigate to="/browse/experiences" replace />} />
      <Route path="/utility" element={<Navigate to="/browse/utility" replace />} />
      <Route path="/electronics" element={<Navigate to="/browse/shops?sub=electronics" replace />} />
      <Route path="/gifts" element={<Navigate to="/browse/shops?sub=gifts" replace />} />
      <Route path="/pets" element={<Navigate to="/browse/services?sub=pet_care" replace />} />
      <Route path="/food/restaurant/:restaurantId" element={<FeatureErrorBoundary featureName="Radar"><FoodRestaurantPage /></FeatureErrorBoundary>} />
      <Route path="/food/r/:cuisine/:restaurantId" element={<FeatureErrorBoundary featureName="Radar"><FoodRestaurantPage /></FeatureErrorBoundary>} />
      <Route path="/food/:type" element={<FeatureErrorBoundary featureName="Radar"><FoodTypePage /></FeatureErrorBoundary>} />
      <Route path="/food/:type/:cuisine" element={<FeatureErrorBoundary featureName="Radar"><CuisineListPage /></FeatureErrorBoundary>} />
      <Route path="/shop" element={<FeatureErrorBoundary featureName="Radar"><RetailIndexPage /></FeatureErrorBoundary>} />
      <Route path="/shop/category/:categorySlug" element={<FeatureErrorBoundary featureName="Radar"><RetailCategoryPage /></FeatureErrorBoundary>} />
      <Route path="/shop/subcategory/:categorySlug/:subcategorySlug" element={<FeatureErrorBoundary featureName="Radar"><RetailCategoryPage /></FeatureErrorBoundary>} />
      <Route path="/shop/mall/:mallSlug" element={<FeatureErrorBoundary featureName="Radar"><RetailMallPage /></FeatureErrorBoundary>} />
      <Route path="/shop/store/:slug" element={<FeatureErrorBoundary featureName="Radar"><RetailStorePage /></FeatureErrorBoundary>} />
      <Route path="/property" element={<FeatureErrorBoundary featureName="Radar"><PropertyHubPage /></FeatureErrorBoundary>} />
      <Route path="/real-estate" element={<Navigate to="/property" replace />} />
      <Route path="/real-estate/dubai-analytics" element={<FeatureErrorBoundary featureName="Radar"><Pages.DubaiAnalyticsPage /></FeatureErrorBoundary>} />
      <Route path="/real-estate/:listingType" element={<Navigate to="/property" replace />} />
      <Route path="/real-estate/:listingType/:slug" element={<FeatureErrorBoundary featureName="Radar"><Pages.RealEstateDetailPage /></FeatureErrorBoundary>} />
      <Route path="/property-hub" element={<FeatureErrorBoundary featureName="Radar"><PropertyManagementHub /></FeatureErrorBoundary>} />
      <Route path="/property-hub/seasonal/reservations" element={<ProtectedRoute><FeatureErrorBoundary featureName="PropertyHub"><SeasonalRentals /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/travel" element={<FeatureErrorBoundary featureName="Radar"><TravelHub /></FeatureErrorBoundary>} />
      <Route path="/travel/flights" element={<FeatureErrorBoundary featureName="Radar"><TravelFlights /></FeatureErrorBoundary>} />
      <Route path="/travel/stays" element={<FeatureErrorBoundary featureName="Radar"><TravelStays /></FeatureErrorBoundary>} />
      <Route path="/travel/hotels" element={<Navigate to="/travel/stays" replace />} />
      <Route path="/travel/hotel/:id" element={<FeatureErrorBoundary featureName="Radar"><TravelHotelDetail /></FeatureErrorBoundary>} />
      <Route path="/travel/hotel-checkout" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><HotelCheckout /></FeatureErrorBoundary></ProtectedRoute>} />
      {/* Hotel routes */}
      <Route path="/hotel/dashboard" element={<ProtectedRoute><FeatureErrorBoundary featureName="Hotel"><HotelDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/hotel/calendar" element={<ProtectedRoute><FeatureErrorBoundary featureName="Hotel"><HotelCalendarPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/hotel/rooms" element={<ProtectedRoute><FeatureErrorBoundary featureName="Hotel"><HotelRoomsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/hotel/pricing" element={<ProtectedRoute><FeatureErrorBoundary featureName="Hotel"><HotelPricingPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/travel/stay/:id" element={<FeatureErrorBoundary featureName="Radar"><TravelStayDetail /></FeatureErrorBoundary>} />
      <Route path="/travel/flight/:id" element={<FeatureErrorBoundary featureName="Radar"><TravelFlightDetail /></FeatureErrorBoundary>} />
      <Route path="/travel/flight-search" element={<FeatureErrorBoundary featureName="Radar"><FlightSearchPage /></FeatureErrorBoundary>} />
      <Route path="/travel/flight-results" element={<FeatureErrorBoundary featureName="Radar"><FlightResultsPage /></FeatureErrorBoundary>} />
      <Route path="/travel/flight-detail" element={<FeatureErrorBoundary featureName="Radar"><FlightDetailPage /></FeatureErrorBoundary>} />
      <Route path="/travel/flight-passengers" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><FlightPassengerPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/travel/flight-payment" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><FlightPaymentPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/travel/flight-confirmation" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><FlightConfirmationPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/property/search" element={<FeatureErrorBoundary featureName="Radar"><PropertySearchPage /></FeatureErrorBoundary>} />
      <Route path="/property/results" element={<FeatureErrorBoundary featureName="Radar"><PropertyResultsPage /></FeatureErrorBoundary>} />
      <Route path="/property/detail" element={<FeatureErrorBoundary featureName="Radar"><PropertyDetailPage /></FeatureErrorBoundary>} />
      <Route path="/property/booking" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><PropertyBookingPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/property/payment" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><PropertyPaymentPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/property/confirmation" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><PropertyConfirmationPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/mobility" element={<FeatureErrorBoundary featureName="Radar"><MobilityHubPage /></FeatureErrorBoundary>} />
      <Route path="/mobility/taxi" element={<FeatureErrorBoundary featureName="Radar"><MobilityTaxiPage /></FeatureErrorBoundary>} />
      <Route path="/mobility/delivery" element={<FeatureErrorBoundary featureName="Radar"><MobilityDeliveryPage /></FeatureErrorBoundary>} />
      <Route path="/mobility/delivery/bring" element={<FeatureErrorBoundary featureName="Radar"><DeliveryBringPage /></FeatureErrorBoundary>} />
      <Route path="/mobility/delivery/parcel" element={<FeatureErrorBoundary featureName="Radar"><DeliveryParcelPage /></FeatureErrorBoundary>} />
      <Route path="/mobility/delivery/gift" element={<FeatureErrorBoundary featureName="Radar"><DeliveryGiftPage /></FeatureErrorBoundary>} />
      <Route path="/mobility/delivery/errand" element={<FeatureErrorBoundary featureName="Radar"><DeliveryErrandPage /></FeatureErrorBoundary>} />
      <Route path="/rider/live" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><RiderLivePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/ride" element={<Navigate to="/mobility/taxi" replace />} />
      <Route path="/taxi" element={<Navigate to="/mobility/taxi" replace />} />
      <Route path="/send" element={<Navigate to="/mobility/delivery" replace />} />
      <Route path="/send-package" element={<Navigate to="/mobility/delivery" replace />} />
      <Route path="/delivery" element={<Navigate to="/mobility/delivery" replace />} />
      <Route path="/track/:rideRequestId" element={<FeatureErrorBoundary featureName="Radar"><TrackRidePage /></FeatureErrorBoundary>} />
      <Route path="/call/:threadId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><CallDriverPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/driver/heatmap" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><DemandHeatmapPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/subscription/priority" element={<ProtectedRoute><FeatureErrorBoundary featureName="Radar"><RiderPrioritySubscriptionPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/listing/:id" element={<FeatureErrorBoundary featureName="Radar"><PublicListing /></FeatureErrorBoundary>} />
      <Route path="/book/:slug" element={<FeatureErrorBoundary featureName="Radar"><PublicServiceBooking /></FeatureErrorBoundary>} />
      <Route path="/nearby" element={<FeatureErrorBoundary featureName="Radar"><LocalServices /></FeatureErrorBoundary>} />
      <Route path="/rentals/:country" element={<FeatureErrorBoundary featureName="Radar"><RentalCatalog /></FeatureErrorBoundary>} />
      <Route path="/rentals/:country/:city" element={<FeatureErrorBoundary featureName="Radar"><RentalCatalog /></FeatureErrorBoundary>} />
      <Route path="/stay" element={<FeatureErrorBoundary featureName="Radar"><TravelStays /></FeatureErrorBoundary>} />
      <Route path="/stays" element={<Navigate to="/stay" replace />} />
      <Route path="/stays/:country" element={<Navigate to="/stay" replace />} />
      <Route path="/stays/:country/:city" element={<Navigate to="/stay" replace />} />
      <Route path="/host/:orgId" element={<FeatureErrorBoundary featureName="Radar"><HostCatalog /></FeatureErrorBoundary>} />
      <Route path="/activities" element={<FeatureErrorBoundary featureName="Radar"><ActivitiesMarketplace /></FeatureErrorBoundary>} />
      <Route path="/guest/:orgId" element={<FeatureErrorBoundary featureName="Radar"><GuestPortal /></FeatureErrorBoundary>} />
      <Route path="/provider/availability" element={<ProtectedRoute><FeatureErrorBoundary featureName="Provider"><ProviderAvailabilityPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/provider/availability-v2" element={<ProtectedRoute><FeatureErrorBoundary featureName="Provider"><ProviderAvailabilityPageNew /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/provider/zones" element={<ProtectedRoute><FeatureErrorBoundary featureName="Provider"><ProviderZonesPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/provider/bookings" element={<ProtectedRoute><FeatureErrorBoundary featureName="Provider"><ProviderBookingsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/provider/services" element={<ProtectedRoute><FeatureErrorBoundary featureName="Provider"><ProviderServicesPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/provider/dashboard" element={<ProtectedRoute><FeatureErrorBoundary featureName="Provider"><ProviderDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/provider/calendar" element={<ProtectedRoute><FeatureErrorBoundary featureName="Provider"><ProviderCalendarPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/provider/services-crud" element={<ProtectedRoute><FeatureErrorBoundary featureName="Provider"><ProviderServicesCrudPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/provider/earnings" element={<ProtectedRoute><FeatureErrorBoundary featureName="Provider"><ProviderEarningsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/provider/:providerId" element={<FeatureErrorBoundary featureName="Radar"><ProviderStorefront /></FeatureErrorBoundary>} />
      <Route path="/store/:storeId" element={<FeatureErrorBoundary featureName="Radar"><StorePage /></FeatureErrorBoundary>} />
      <Route path="/s/:slug" element={<FeatureErrorBoundary featureName="Radar"><ShopPage /></FeatureErrorBoundary>} />
      <Route path="/s/:slug/:categorySlug" element={<FeatureErrorBoundary featureName="Radar"><ShopCategoryPage /></FeatureErrorBoundary>} />
      <Route path="/saved" element={<Navigate to="/favorites" replace />} />
      <Route path="/showcase/:orgId" element={<FeatureErrorBoundary featureName="Radar"><PropertiesShowcase /></FeatureErrorBoundary>} />
      <Route path="/account/:orgId" element={<FeatureErrorBoundary featureName="Radar"><AccountShowcase /></FeatureErrorBoundary>} />
      <Route path="/properties" element={<FeatureErrorBoundary featureName="Radar"><PropertiesShowcase /></FeatureErrorBoundary>} />
      <Route path="/top-rated" element={<FeatureErrorBoundary featureName="Radar"><RealEstateListings /></FeatureErrorBoundary>} />
      <Route path="/trending" element={<FeatureErrorBoundary featureName="Radar"><RealEstateListings /></FeatureErrorBoundary>} />
      <Route path="/real-estate-listing/:slug" element={<FeatureErrorBoundary featureName="Radar"><PublicRealEstateListing /></FeatureErrorBoundary>} />
      <Route path="/concierge-services" element={<FeatureErrorBoundary featureName="Radar"><ConciergeServicesPage /></FeatureErrorBoundary>} />
      <Route path="/city-market/:citySlug" element={<FeatureErrorBoundary featureName="Radar"><CityMarketplacePage /></FeatureErrorBoundary>} />
      <Route path="/menu/:shopSlug" element={<FeatureErrorBoundary featureName="Radar"><ShopOrderPage /></FeatureErrorBoundary>} />

    </>
  );
}
