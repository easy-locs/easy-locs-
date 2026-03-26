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
  country_name?: string | null;
  region?: string | null;
  city?: string | null;
  district?: string | null;
  subdistrict?: string | null;
  postcode?: string | null;
  street?: string | null;
  building?: string | null;
  landmark?: string | null;
  timezone?: string | null;
  geohash?: string | null;
  zone_key?: string | null;
  place_type: PlaceType;
  airport_code?: string | null;
  terminal?: string | null;
  confidence_score?: number;
  metadata?: Record<string, unknown>;
}

export type PlaceType =
  | "address"
  | "airport"
  | "terminal"
  | "hotel"
  | "station"
  | "port"
  | "merchant"
  | "landmark"
  | "tower"
  | "mall"
  | "hospital"
  | "user_saved";

export type AddressContextType =
  | "global"
  | "food_delivery"
  | "grocery_delivery"
  | "taxi_pickup"
  | "taxi_dropoff"
  | "parcel_pickup"
  | "parcel_dropoff"
  | "service_visit"
  | "property_search"
  | "travel_search";

export type AddressSourceType =
  | "gps"
  | "search"
  | "saved"
  | "recent"
  | "map_pin"
  | "shared_location"
  | "imported"
  | "manual";

export type AddressActionType =
  | "searched"
  | "selected"
  | "delivered"
  | "booked"
  | "navigated"
  | "shared"
  | "reused";

// ── Zone Key ──

export function computeZoneKey(countryCode: string, city?: string | null, district?: string | null): string {
  const parts = [countryCode.toUpperCase()];
  if (city) parts.push(city.replace(/\s+/g, "_").toUpperCase());
  if (district) parts.push(district.replace(/\s+/g, "_").toUpperCase());
  return parts.join("_");
}

// ── Simple geohash (4-char precision) ──

export function simpleGeohash(lat: number, lng: number): string {
  const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
  let minLat = -90, maxLat = 90, minLng = -180, maxLng = 180;
  let hash = "";
  let isLng = true;
  let bit = 0;
  let ch = 0;
  while (hash.length < 6) {
    if (isLng) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) { ch |= (1 << (4 - bit)); minLng = mid; } else { maxLng = mid; }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) { ch |= (1 << (4 - bit)); minLat = mid; } else { maxLat = mid; }
    }
    isLng = !isLng;
    if (bit < 4) { bit++; } else { hash += BASE32[ch]; bit = 0; ch = 0; }
  }
  return hash;
}

// ── Converters ──

export function fromNormalizedPlace(
  np: { label: string; lat: number; lng: number; city?: string; region?: string; country?: string; postcode?: string; area?: string; street?: string },
  provider = "mapbox"
): CanonicalPlace {
  const countryCode = np.country ?? "AE";
  return {
    provider,
    label: np.label,
    formatted_address: np.label,
    lat: np.lat,
    lng: np.lng,
    country_code: countryCode,
    region: np.region ?? null,
    city: np.city ?? null,
    district: np.area ?? null,
    street: np.street ?? null,
    postcode: np.postcode ?? null,
    zone_key: computeZoneKey(countryCode, np.city, np.area),
    geohash: simpleGeohash(np.lat, np.lng),
    place_type: "address",
    confidence_score: 0.85,
  };
}

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
    zone_key: computeZoneKey("AE", sp.city),
    geohash: simpleGeohash(sp.lat, sp.lng),
    place_type: "user_saved",
    confidence_score: 0.8,
  };
}

export function fromResolvedAddress(ra: {
  label: string; fullAddress: string; lat: number; lng: number;
  city: string; country?: string; area?: string;
}): CanonicalPlace {
  const cc = ra.country ?? "AE";
  return {
    provider: "system",
    label: ra.label,
    formatted_address: ra.fullAddress,
    lat: ra.lat,
    lng: ra.lng,
    country_code: cc,
    city: ra.city ?? null,
    district: ra.area ?? null,
    zone_key: computeZoneKey(cc, ra.city, ra.area),
    geohash: simpleGeohash(ra.lat, ra.lng),
    place_type: "address",
    confidence_score: 0.75,
  };
}

export function fromGPS(lat: number, lng: number, reverseResult?: {
  label?: string; city?: string; district?: string; country?: string; street?: string;
}): CanonicalPlace {
  const cc = reverseResult?.country ?? "AE";
  return {
    provider: "gps",
    label: reverseResult?.label ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    formatted_address: reverseResult?.label ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    lat,
    lng,
    country_code: cc,
    city: reverseResult?.city ?? null,
    district: reverseResult?.district ?? null,
    street: reverseResult?.street ?? null,
    zone_key: computeZoneKey(cc, reverseResult?.city, reverseResult?.district),
    geohash: simpleGeohash(lat, lng),
    place_type: "address",
    confidence_score: 0.6,
  };
}

// ── Display ──

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

export function resolveAirportPlace(input: string, terminal?: string): CanonicalPlace | null {
  const key = input.toLowerCase().trim().replace(/\s+/g, "");
  const entry = AIRPORT_ALIASES[key] ?? Object.values(AIRPORT_ALIASES).find(a =>
    a.name.toLowerCase().includes(key) || a.code.toLowerCase() === key
  );
  if (!entry) return null;
  return {
    provider: "system",
    label: `${entry.code}${terminal ? ` T${terminal}` : ""}`,
    formatted_address: entry.name,
    lat: entry.lat,
    lng: entry.lng,
    country_code: entry.country_code,
    city: entry.city,
    zone_key: computeZoneKey(entry.country_code, entry.city),
    geohash: simpleGeohash(entry.lat, entry.lng),
    place_type: "airport",
    airport_code: entry.code,
    terminal: terminal ?? null,
    confidence_score: 1.0,
  };
}
