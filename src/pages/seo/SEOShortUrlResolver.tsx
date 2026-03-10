/**
 * Booking.com-style clean URL resolver
 * Resolves /:slug to either a country hub or city hub page
 * Routes: /dubai, /france, /paris, /dubai/services, /dubai/car-rental, etc.
 */
import { useParams, Navigate } from "react-router-dom";
import { getCountryBySlug, getCityBySlug } from "@/lib/seo/seo-data";

// Map category slugs to sub-page types
const CATEGORY_SUB_MAP: Record<string, string> = {
  services: "services",
  activities: "activities",
  concierge: "concierge",
  "property-rentals": "overview",
  "car-rental": "services",
  cleaning: "services",
  transport: "services",
  wellness: "services",
  tours: "activities",
  "water-sport": "activities",
  restaurant: "services",
  coworking: "services",
  events: "activities",
};

/**
 * Resolves /:slug — tries country first, then city
 * Uses Navigate to redirect to the canonical /country/ or /city/ routes
 */
export function SlugResolver() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return <Navigate to="/locations" replace />;

  // Try country
  const country = getCountryBySlug(slug);
  if (country) {
    return <Navigate to={`/country/${slug}`} replace />;
  }

  // Try city
  const city = getCityBySlug(slug);
  if (city) {
    return <Navigate to={`/city/${slug}`} replace />;
  }

  // Not found — let catch-all handle it
  return <Navigate to={`/locations`} replace />;
}

/**
 * Resolves /:slug/:category — city + category page
 * Redirects to /city/:slug/services, /city/:slug/activities etc.
 */
export function SlugCategoryResolver() {
  const { slug, category } = useParams<{ slug: string; category: string }>();
  if (!slug || !category) return <Navigate to="/locations" replace />;

  const city = getCityBySlug(slug);
  if (!city) {
    // Maybe it's a country with a sub-page — redirect to country page
    const country = getCountryBySlug(slug);
    if (country) return <Navigate to={`/country/${slug}`} replace />;
    return <Navigate to="/locations" replace />;
  }

  const subPage = CATEGORY_SUB_MAP[category];
  if (subPage && subPage !== "overview") {
    return <Navigate to={`/city/${slug}/${subPage}`} replace />;
  }

  return <Navigate to={`/city/${slug}`} replace />;
}
