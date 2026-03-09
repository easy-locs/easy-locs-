/**
 * Unified Country/City resolver page.
 * Route: /property-management-:slug (handled via SEOCatchAll because RR v6 doesn't support partial segments)
 * Tries country first, falls back to city.
 */
import { useParams } from "react-router-dom";
import { getCountryBySlug, getCityBySlug } from "@/lib/seo/seo-data";
import CountrySEOPage from "./CountrySEOPage";
import CitySEOPage from "./CitySEOPage";

interface Props {
  slugOverride?: string;
}

const PropertyManagementSEOResolver = ({ slugOverride }: Props) => {
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const slug = slugOverride || paramSlug;
  if (!slug) return <CountrySEOPage />;

  // Try country first
  if (getCountryBySlug(slug)) return <CountrySEOPage />;

  // Try city
  if (getCityBySlug(slug)) return <CitySEOPage citySlug={slug} />;

  // Fallback — treat as country (will show fallback UI)
  return <CountrySEOPage />;
};

export default PropertyManagementSEOResolver;
