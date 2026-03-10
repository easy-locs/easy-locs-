/**
 * Booking.com-style clean URL resolver
 * Resolves /:slug to either a country hub or city hub page
 * Routes: /dubai, /france, /paris, /dubai/services, /dubai/car-rental, etc.
 */
import { useParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import { getCountryBySlug, getCityBySlug, SEO_SERVICE_CATEGORIES } from "@/lib/seo/seo-data";

const CountryHubPage = lazy(() => import("./CountryHubPage"));
const CityHubPage = lazy(() => import("./CityHubPage"));
const NotFound = lazy(() => import("../NotFound"));

// Map category slugs to sub-page types
const CATEGORY_SUB_PAGES: Record<string, string> = {
  services: "services",
  activities: "activities",
  concierge: "concierge",
  "property-rentals": "overview",
  "car-rental": "services",
  "cleaning": "services",
  "transport": "services",
  "wellness": "services",
  "tours": "activities",
  "water-sport": "activities",
  "restaurant": "services",
  "coworking": "services",
};

/**
 * Resolves /:slug — tries country first, then city
 */
export function SlugResolver() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return <NotFound />;

  // Try country
  const country = getCountryBySlug(slug);
  if (country) {
    return <CountryHubPage />;
  }

  // Try city
  const city = getCityBySlug(slug);
  if (city) {
    return <CityHubPage />;
  }

  return <NotFound />;
}

/**
 * Resolves /:slug/:category — city + category page
 */
export function SlugCategoryResolver() {
  const { slug, category } = useParams<{ slug: string; category: string }>();
  if (!slug || !category) return <NotFound />;

  const city = getCityBySlug(slug);
  if (!city) return <NotFound />;

  const subPage = CATEGORY_SUB_PAGES[category] || "services";
  return <CityHubPage subPage={subPage as any} />;
}
