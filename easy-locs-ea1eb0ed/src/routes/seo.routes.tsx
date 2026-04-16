import { Route, Navigate } from "react-router-dom";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import * as Pages from "@/app/app-route-registry";
import { MarketplaceC2CDetailRedirect, CityServicesPage, CityActivitiesPage, CityConciergePage } from "@/app/route-helpers";

const {
  ActivitiesPage, ActivityCitySEOPage, BestServiceCityPage, CityGuidePage, CityHubPage,
  CompareServiceCityPage, CoreSEOPages, CountryHubPage, DynamicCityCategoryPage, LocationsPage,
  LongTermRentalsPage, MarketplaceCityPage, MarketplaceHubPage, MarketplaceServiceCityPage,
  MarketplaceServicesPage, PropertyManagementPlatformPage, ProviderSEOPage, RentalManagementSoftwarePage,
  SeasonalRentalsPage, ServiceCategoryPage, ServiceCityPage, ServiceCitySEOPage, ServiceProviderPage,
  ServicesPage,
} = Pages;

export function SeoRoutes() {
  return (
    <>
      <Route path="/browse/services" element={<FeatureErrorBoundary featureName="Radar"><ServicesPage /></FeatureErrorBoundary>} />
      <Route path="/browse/services/:providerId" element={<FeatureErrorBoundary featureName="Radar"><ServiceProviderPage /></FeatureErrorBoundary>} />
      <Route path="/marketplace-services" element={<FeatureErrorBoundary featureName="Radar"><MarketplaceServicesPage /></FeatureErrorBoundary>} />
      <Route path="/activities-booking" element={<FeatureErrorBoundary featureName="Radar"><ActivitiesPage /></FeatureErrorBoundary>} />
      <Route path="/seasonal-rentals-booking" element={<FeatureErrorBoundary featureName="Radar"><SeasonalRentalsPage /></FeatureErrorBoundary>} />
      <Route path="/seasonal-rentals" element={<Navigate to="/seasonal-rentals-booking" replace />} />
      <Route path="/long-term-rentals" element={<FeatureErrorBoundary featureName="Radar"><LongTermRentalsPage /></FeatureErrorBoundary>} />
      <Route path="/property-owner-software" element={<FeatureErrorBoundary featureName="SEO"><CoreSEOPages /></FeatureErrorBoundary>} />
      <Route path="/property-management-platform" element={<FeatureErrorBoundary featureName="SEO"><PropertyManagementPlatformPage /></FeatureErrorBoundary>} />
      <Route path="/rental-management-software" element={<FeatureErrorBoundary featureName="SEO"><RentalManagementSoftwarePage /></FeatureErrorBoundary>} />
      <Route path="/guide/:citySlug" element={<FeatureErrorBoundary featureName="SEO"><CityGuidePage /></FeatureErrorBoundary>} />
      <Route path="/best/:serviceSlug/in/:citySlug" element={<FeatureErrorBoundary featureName="SEO"><BestServiceCityPage /></FeatureErrorBoundary>} />
      <Route path="/compare/:serviceSlug/in/:citySlug" element={<FeatureErrorBoundary featureName="SEO"><CompareServiceCityPage /></FeatureErrorBoundary>} />
      <Route path="/services/:service/in/:city" element={<FeatureErrorBoundary featureName="SEO"><ServiceCitySEOPage /></FeatureErrorBoundary>} />
      <Route path="/activities/:activity/in/:city" element={<FeatureErrorBoundary featureName="SEO"><ActivityCitySEOPage /></FeatureErrorBoundary>} />
      <Route path="/services" element={<Navigate to="/browse/services" replace />} />
      <Route path="/services/:categorySlug" element={<FeatureErrorBoundary featureName="SEO"><ServiceCategoryPage /></FeatureErrorBoundary>} />
      <Route path="/services/city/:citySlug" element={<FeatureErrorBoundary featureName="SEO"><ServiceCityPage /></FeatureErrorBoundary>} />
      <Route path="/provider/seo/:providerId" element={<FeatureErrorBoundary featureName="SEO"><ProviderSEOPage /></FeatureErrorBoundary>} />
      <Route path="/locations" element={<FeatureErrorBoundary featureName="SEO"><LocationsPage /></FeatureErrorBoundary>} />
      <Route path="/country/:countrySlug" element={<FeatureErrorBoundary featureName="SEO"><CountryHubPage /></FeatureErrorBoundary>} />
      <Route path="/city/:citySlug" element={<FeatureErrorBoundary featureName="SEO"><CityHubPage /></FeatureErrorBoundary>} />
      <Route path="/city/:citySlug/services" element={<FeatureErrorBoundary featureName="SEO"><CityServicesPage /></FeatureErrorBoundary>} />
      <Route path="/city/:citySlug/activities" element={<FeatureErrorBoundary featureName="SEO"><CityActivitiesPage /></FeatureErrorBoundary>} />
      <Route path="/city/:citySlug/concierge" element={<FeatureErrorBoundary featureName="SEO"><CityConciergePage /></FeatureErrorBoundary>} />
      <Route path="/city/:citySlug/:categorySlug" element={<FeatureErrorBoundary featureName="SEO"><DynamicCityCategoryPage /></FeatureErrorBoundary>} />
      <Route path="/marketplace" element={<FeatureErrorBoundary featureName="Radar"><MarketplaceHubPage /></FeatureErrorBoundary>} />
      <Route path="/marketplace/c2c" element={<Navigate to="/annonces" replace />} />
      <Route path="/marketplace/c2c/:id" element={<MarketplaceC2CDetailRedirect />} />

      {/* ═══════════════════════════════════════════════ */}
      {/*  ANNONCES — C2C CLASSIFIEDS                    */}
      {/* ═══════════════════════════════════════════════ */}
      <Route path="/annonces" element={<FeatureErrorBoundary featureName="Annonces"><Pages.AnnoncesHub /></FeatureErrorBoundary>} />
      <Route path="/annonces/publier" element={<FeatureErrorBoundary featureName="Annonces"><Pages.PublierAnnonce /></FeatureErrorBoundary>} />
      <Route path="/annonces/recherche" element={<FeatureErrorBoundary featureName="Annonces"><Pages.RechercheAnnonces /></FeatureErrorBoundary>} />
      <Route path="/annonces/vendeur/:id" element={<FeatureErrorBoundary featureName="Annonces"><Pages.SellerProfile /></FeatureErrorBoundary>} />
      <Route path="/annonces/mes-annonces" element={<FeatureErrorBoundary featureName="Annonces"><Pages.MesAnnonces /></FeatureErrorBoundary>} />
      <Route path="/annonces/:id" element={<FeatureErrorBoundary featureName="Annonces"><Pages.AnnonceDetail /></FeatureErrorBoundary>} />
      <Route path="/marketplace/:citySlug" element={<FeatureErrorBoundary featureName="Radar"><MarketplaceCityPage /></FeatureErrorBoundary>} />
      <Route path="/marketplace/:citySlug/:serviceSlug" element={<FeatureErrorBoundary featureName="Radar"><MarketplaceServiceCityPage /></FeatureErrorBoundary>} />

    </>
  );
}
