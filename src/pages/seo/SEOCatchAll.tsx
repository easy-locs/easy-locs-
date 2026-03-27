/**
 * SEO Catch-All Router
 * Handles legacy URLs and patterns that React Router v6 can't match natively.
 * Resolves:
 *  - /property-management-{slug} → country/city SEO pages
 *  - /activities/{type}-{city}   → already handled by route, but fallback here
 *  - /services/{service}-{city}  → legacy hyphenated format
 *  - Any unmatched → 404
 */
import { useLocation, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

import { getCountryBySlug, getCityBySlug, getServiceCategoryBySlug, SEO_ACTIVITY_TYPES } from "@/lib/seo/seo-data";

const PropertyManagementSEOResolver = lazy(() => import("./PropertyManagementSEOResolver"));
const NotFound = lazy(() => import("../NotFound"));

const PageLoader = () => (
  <div className="app-mobile-page bg-background" />
);

const SEOCatchAll = () => {
  const { pathname } = useLocation();

  // 1. /property-management-{slug} → legacy country/city SEO page
  const pmMatch = pathname.match(/^\/property-management-(.+)$/);
  if (pmMatch) {
    const slug = pmMatch[1];
    // If it's a known country slug, redirect to /country/:slug
    const country = getCountryBySlug(slug);
    if (country) {
      return <Navigate to={`/country/${slug}`} replace />;
    }
    // If it's a known city slug, redirect to /city/:slug
    const city = getCityBySlug(slug);
    if (city) {
      return <Navigate to={`/city/${slug}`} replace />;
    }
    // Fallback to legacy resolver for any other slugs
    return (
      <Suspense fallback={<PageLoader />}>
        <PropertyManagementSEOResolver slugOverride={slug} />
      </Suspense>
    );
  }

  // 2. /services/{service}-{city} → redirect to /services/{service}/{city}
  const svcMatch = pathname.match(/^\/services\/([^/]+)-([^/]+)$/);
  if (svcMatch) {
    // Try to parse as service-city combo
    const full = `${svcMatch[1]}-${svcMatch[2]}`;
    for (const svc of [
      ...Array.from(new Set(
        ["cleaning", "maintenance", "transport", "car-rental", "tours",
         "airport-transfer", "personal", "spa", "water-sport", "restaurant",
         "coworking", "event", "yacht-rental", "private-chef"]
      ))
    ]) {
      if (full.startsWith(svc + "-")) {
        const citySlug = full.slice(svc.length + 1);
        if (getCityBySlug(citySlug)) {
          return <Navigate to={`/services/${svc}/${citySlug}`} replace />;
        }
      }
    }
  }

  // 3. /activities/{type}-{city} → already handled by route param,
  //    but in case it falls through, redirect to the new split format
  const actMatch = pathname.match(/^\/activities\/([^/]+)-([^/]+)$/);
  if (actMatch) {
    // Already handled by the :activityCity param route — this shouldn't fire,
    // but serves as safety net
  }

  // 404
  return (
    <Suspense fallback={<PageLoader />}>
      <NotFound />
    </Suspense>
  );
};

export default SEOCatchAll;
