/**
 * Search Provider Normalizer — Converts raw provider results into SearchCandidate.
 * All providers (Mapbox, Google, etc.) are normalized into one shape.
 */
import type { NormalizedPlace } from "@/lib/location/geocode";

export interface SearchCandidate {
  id: string;
  canonical_place_id?: string;
  label: string;
  formatted_address: string;
  lat: number;
  lng: number;
  country_code?: string;
  country_name?: string;
  city?: string;
  district?: string;
  zone_key?: string;
  place_type: string;
  provider: string;
  popularity_score: number;
  confidence_score: number;
}

let _counter = 0;

export function normalizeProviderResult(np: NormalizedPlace): SearchCandidate {
  return {
    id: `provider_${++_counter}_${Date.now()}`,
    label: np.label,
    formatted_address: np.label,
    lat: np.lat,
    lng: np.lng,
    country_code: inferCountryCode(np.country),
    country_name: np.country,
    city: np.city ?? undefined,
    district: np.area ?? undefined,
    place_type: "address",
    provider: "mapbox",
    popularity_score: 0,
    confidence_score: 0.6,
  };
}

function inferCountryCode(country?: string): string | undefined {
  if (!country) return undefined;
  const c = country.toLowerCase();
  if (c.includes("united arab") || c === "uae") return "AE";
  if (c.includes("united states") || c === "usa" || c === "us") return "US";
  if (c.includes("united kingdom") || c === "uk") return "GB";
  if (c.includes("france")) return "FR";
  if (c.includes("germany")) return "DE";
  if (c.includes("india")) return "IN";
  if (c.includes("saudi")) return "SA";
  if (c.includes("qatar")) return "QA";
  if (c.includes("bahrain")) return "BH";
  if (c.includes("kuwait")) return "KW";
  if (c.includes("oman")) return "OM";
  return country.slice(0, 2).toUpperCase();
}
