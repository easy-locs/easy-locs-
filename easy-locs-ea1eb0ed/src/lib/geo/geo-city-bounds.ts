/**
 * geo-city-bounds — Bounding-box validation for UAE cities.
 * Returns true when the supplied coordinates fall within the resolved city's bounds.
 * Also accepts a broad UAE country-level envelope as a final fallback.
 */

interface BoundingBox {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

const UAE_ENVELOPE: BoundingBox = { latMin: 22.6, latMax: 26.2, lngMin: 51.5, lngMax: 56.5 };

const CITY_BOUNDS: Record<string, BoundingBox> = {
  dubai:       { latMin: 24.70, latMax: 25.45, lngMin: 54.85, lngMax: 55.65 },
  "abu dhabi": { latMin: 23.90, latMax: 24.75, lngMin: 54.15, lngMax: 54.95 },
  sharjah:     { latMin: 25.28, latMax: 25.48, lngMin: 55.28, lngMax: 55.58 },
  ajman:       { latMin: 25.38, latMax: 25.50, lngMin: 55.41, lngMax: 55.55 },
  "ras al khaimah": { latMin: 25.55, latMax: 25.95, lngMin: 55.68, lngMax: 56.25 },
  "ras al-khaimah": { latMin: 25.55, latMax: 25.95, lngMin: 55.68, lngMax: 56.25 },
  rak:         { latMin: 25.55, latMax: 25.95, lngMin: 55.68, lngMax: 56.25 },
  fujairah:    { latMin: 25.05, latMax: 25.30, lngMin: 56.27, lngMax: 56.40 },
  "umm al quwain": { latMin: 25.50, latMax: 25.60, lngMin: 55.53, lngMax: 55.65 },
  uaq:         { latMin: 25.50, latMax: 25.60, lngMin: 55.53, lngMax: 55.65 },
};

function inBox(lat: number, lng: number, box: BoundingBox): boolean {
  return lat >= box.latMin && lat <= box.latMax && lng >= box.lngMin && lng <= box.lngMax;
}

/**
 * Returns true when lat/lng fall within:
 * 1. The bounding box for the resolved city name, OR
 * 2. The UAE country envelope (fallback for city-level misses)
 *
 * Returns false for clearly out-of-bounds coordinates.
 * Returns null when no coordinates are available (caller should treat as unknown, not fail).
 */
export function validateCityBounds(
  lat: number | null | undefined,
  lng: number | null | undefined,
  city: string | null | undefined,
  countryCode: string | null | undefined,
): boolean | null {
  if (lat == null || lng == null) return null;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  if (lat === 0 && lng === 0) return false;

  const cityKey = city?.toLowerCase().trim() ?? null;

  if (cityKey && CITY_BOUNDS[cityKey]) {
    return inBox(lat, lng, CITY_BOUNDS[cityKey]);
  }

  if (countryCode?.toLowerCase() === "ae" || countryCode?.toLowerCase() === "uae") {
    return inBox(lat, lng, UAE_ENVELOPE);
  }

  return inBox(lat, lng, UAE_ENVELOPE);
}
