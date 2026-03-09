/**
 * Unified Country/City resolver page.
 * Route: /property-management-:slug
 * Tries country first, falls back to city.
 */
import { useParams } from "react-router-dom";
import { getCountryBySlug, getCityBySlug } from "@/lib/seo/seo-data";
import CountrySEOPage from "./CountrySEOPage";
import CitySEOPage from "./CitySEOPage";

const PropertyManagementSEOResolver = () => {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return <CountrySEOPage />;

  // Try country first
  if (getCountryBySlug(slug)) return <CountrySEOPage />;

  // Try city
  if (getCityBySlug(slug)) return <CitySEOPage citySlug={slug} />;

  // Fallback — treat as country (will show fallback UI)
  return <CountrySEOPage />;
};

export default PropertyManagementSEOResolver;
