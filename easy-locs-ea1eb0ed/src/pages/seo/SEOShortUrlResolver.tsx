/**
 * Booking.com-style clean URL resolver
 * Resolves /:slug to either a country hub or city hub page
 * Routes: /dubai, /france, /paris
 */
import { useParams, Navigate } from "react-router-dom";
import { getCountryBySlug, getCityBySlug } from "@/lib/seo/seo-data";
import { lazy, Suspense } from "react";

const CityCategoryPage = lazy(() => import("./CityCategoryPage"));

// Known category slugs for city+category pages
const KNOWN_CATEGORIES = new Set([
  "cleaning", "maintenance", "construction", "transport", "car-rental",
  "airport-transfer", "tours", "water-sport", "spa", "sports-coach",
  "restaurant", "coworking", "legal", "business-services", "consulting",
  "personal", "event", "apartments", "vacation-rentals", "real-estate",
  "long-term-rentals",
]);

// Sub-pages that redirect to city hub tabs
const CITY_SUB_PAGES: Record<string, string> = {
  services: "services",
  activities: "activities",
  concierge: "concierge",
};

/**
 * Resolves /:slug — tries country first, then city
 */
export function SlugResolver() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return <Navigate to="/locations" replace />;

  const country = getCountryBySlug(slug);
  if (country) return <Navigate to={`/country/${slug}`} replace />;

  const city = getCityBySlug(slug);
  if (city) return <Navigate to={`/city/${slug}`} replace />;

  return <Navigate to="/locations" replace />;
}

/**
 * Resolves /:slug/:category — city + category SEO page
 * e.g. /dubai/cleaning, /paris/apartments, /barcelona/tours
 */
export function SlugCategoryResolver() {
  const { slug, category } = useParams<{ slug: string; category: string }>();
  if (!slug || !category) return <Navigate to="/locations" replace />;

  const city = getCityBySlug(slug);
  if (!city) {
    const country = getCountryBySlug(slug);
    if (country) return <Navigate to={`/country/${slug}`} replace />;
    return <Navigate to="/locations" replace />;
  }

  // City hub sub-pages (services, activities, concierge tabs)
  const subPage = CITY_SUB_PAGES[category];
  if (subPage) {
    return <Navigate to={`/city/${slug}/${subPage}`} replace />;
  }

  // Known category → render dedicated city+category page
  if (KNOWN_CATEGORIES.has(category)) {
    return (
      <Suspense fallback={null}>
        <CityCategoryPage />
      </Suspense>
    );
  }

  // Unknown category → fallback to city hub
  return <Navigate to={`/city/${slug}`} replace />;
}
