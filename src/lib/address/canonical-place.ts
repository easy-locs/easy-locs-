/**
 * CANONICAL PLACE — Single global address/place type.
 * ==================================================
 * Every module must use this shape for locations:
 * mobility, delivery, merchant, wallet, orbit, map, radar, tracking.
 *
 * NO OTHER PLACE/ADDRESS TYPE IS ALLOWED for new code.
 */

export interface CanonicalPlace {
  id?: string;
  provider: string;                    // "mapbox" | "nominatim" | "google" | "manual" | "system"
  provider_place_id?: string | null;
  label: string;                       // Short display label
  formatted_address: string;           // Full formatted address
  lat: number;
  lng: number;
  country_code: string;                // ISO 3166-1 alpha-2
  region?: string | null;
  city?: string | null;
  district?: string | null;
  postcode?: string | null;
  timezone?: string | null;
  place_type: PlaceType;
  airport_code?: string | null;
  terminal?: string | null;
  metadata?: Record<string, unknown>;
}

export type PlaceType =
  | "address"
  | "airport"
  | "hotel"
  | "station"
  | "merchant"
  | "landmark"
  | "user_saved";

/** Convert a NormalizedPlace (from geocode.ts) to CanonicalPlace */
export function fromNormalizedPlace(
  np: { label: string; lat: number; lng: number; city?: string; region?: string; country?: string; postcode?: string; area?: string; street?: string },
  provider = "mapbox"
): CanonicalPlace {
  return {
    provider,
    label: np.label,
    formatted_address: np.label,
    lat: np.lat,
    lng: np.lng,
    country_code: np.country ?? "AE",
    region: np.region ?? null,
    city: np.city ?? null,
    district: np.area ?? null,
    postcode: np.postcode ?? null,
    place_type: "address",
  };
}

/** Convert a SavedPlace (from useSmartLocation) to CanonicalPlace */
export function fromSavedPlace(sp: {
  label: string; address: string; lat?: number; lng?: number; city?: string;
}): CanonicalPlace | null {
  if (!sp.lat || !sp.lng) return null;
  return {
    provider: "manual",
    label: sp.label,
    formatted_address: sp.address || sp.label,
    lat: sp.lat,
    lng: sp.lng,
    country_code: "AE",
    city: sp.city ?? null,
    place_type: "user_saved",
  };
}

/** Convert a ResolvedAddress (from address-engine) to CanonicalPlace */
export function fromResolvedAddress(ra: {
  label: string; fullAddress: string; lat: number; lng: number;
  city: string; country?: string; area?: string;
}): CanonicalPlace {
  return {
    provider: "system",
    label: ra.label,
    formatted_address: ra.fullAddress,
    lat: ra.lat,
    lng: ra.lng,
    country_code: ra.country ?? "AE",
    city: ra.city ?? null,
    district: ra.area ?? null,
    place_type: "address",
  };
}

/** Format a CanonicalPlace for display */
export function formatPlace(place: CanonicalPlace, mode: "short" | "full" | "receipt" | "airport" = "short"): string {
  switch (mode) {
    case "short":
      return place.label;
    case "full":
      return place.formatted_address;
    case "receipt":
      return place.airport_code
        ? `${place.airport_code}${place.terminal ? ` T${place.terminal}` : ""} — ${place.city ?? ""}`
        : place.formatted_address;
    case "airport":
      return `${place.airport_code ?? ""}${place.terminal ? ` Terminal ${place.terminal}` : ""}`;
    default:
      return place.label;
  }
}

// ── AIRPORT ALIASES ──
const AIRPORT_ALIASES: Record<string, { code: string; name: string; city: string; country_code: string; lat: number; lng: number }> = {
  dxb:  { code: "DXB", name: "Dubai International Airport", city: "Dubai", country_code: "AE", lat: 25.2532, lng: 55.3657 },
  auh:  { code: "AUH", name: "Abu Dhabi International Airport", city: "Abu Dhabi", country_code: "AE", lat: 24.4330, lng: 54.6511 },
  cdg:  { code: "CDG", name: "Charles de Gaulle Airport", city: "Paris", country_code: "FR", lat: 49.0097, lng: 2.5479 },
  ory:  { code: "ORY", name: "Paris Orly Airport", city: "Paris", country_code: "FR", lat: 48.7262, lng: 2.3652 },
  lhr:  { code: "LHR", name: "London Heathrow Airport", city: "London", country_code: "GB", lat: 51.4700, lng: -0.4543 },
  jfk:  { code: "JFK", name: "John F. Kennedy International Airport", city: "New York", country_code: "US", lat: 40.6413, lng: -73.7781 },
  cmn:  { code: "CMN", name: "Mohammed V International Airport", city: "Casablanca", country_code: "MA", lat: 33.3675, lng: -7.5898 },
  ist:  { code: "IST", name: "Istanbul Airport", city: "Istanbul", country_code: "TR", lat: 41.2753, lng: 28.7519 },
  dwc:  { code: "DWC", name: "Al Maktoum International Airport", city: "Dubai", country_code: "AE", lat: 24.8960, lng: 55.1614 },
};

/** Resolve an airport code/name to a CanonicalPlace */
export function resolveAirportPlace(input: string, terminal?: string): CanonicalPlace | null {
  const key = input.toLowerCase().trim().replace(/\s+/g, "");
  // Try direct code match
  const entry = AIRPORT_ALIASES[key];
  if (!entry) {
    // Try matching by name fragment
    const byName = Object.values(AIRPORT_ALIASES).find(a =>
      a.name.toLowerCase().includes(key) || a.code.toLowerCase() === key
    );
    if (!byName) return null;
    return {
      provider: "system",
      label: `${byName.code}${terminal ? ` T${terminal}` : ""}`,
      formatted_address: byName.name,
      lat: byName.lat,
      lng: byName.lng,
      country_code: byName.country_code,
      city: byName.city,
      place_type: "airport",
      airport_code: byName.code,
      terminal: terminal ?? null,
    };
  }
  return {
    provider: "system",
    label: `${entry.code}${terminal ? ` T${terminal}` : ""}`,
    formatted_address: entry.name,
    lat: entry.lat,
    lng: entry.lng,
    country_code: entry.country_code,
    city: entry.city,
    place_type: "airport",
    airport_code: entry.code,
    terminal: terminal ?? null,
  };
}
