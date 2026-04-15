/**
 * Geo Layer barrel — Composes geo atomic units.
 * Enhanced with Nominatim fallback for missing coordinates.
 */
import type { GeoLayerOutput } from "../contracts";
import { normalizeAddress } from "./geo.address.normalize";
import { resolveCountry } from "./geo.country.resolve";
import { resolveCity } from "./geo.city.resolve";
import { geocodeAddress } from "../../scraping/nominatim";

export { normalizeAddress } from "./geo.address.normalize";
export { resolveCountry } from "./geo.country.resolve";
export { resolveCity } from "./geo.city.resolve";

export function runGeoLayer(params: {
  address?: string | null;
  city?: string | null;
  district?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
}): GeoLayerOutput {
  const normalizedAddr = normalizeAddress(params.address);
  const cityResult = resolveCity(params.city);
  const countryResult = resolveCountry(params.country ?? cityResult.countryHint);

  return {
    address: normalizedAddr,
    resolution: {
      country: countryResult.name,
      countryCode: countryResult.code,
      city: cityResult.city,
      district: params.district?.trim() ?? null,
      zone: cityResult.zone,
      lat: params.lat ?? null,
      lng: params.lng ?? null,
      timezone: countryResult.timezone,
      currency: countryResult.currency,
      language: countryResult.language,
      confidence: (normalizedAddr ? 0.3 : 0) + (cityResult.city ? 0.3 : 0) + (countryResult.code ? 0.2 : 0) + (params.lat != null ? 0.2 : 0),
    },
  };
}

export async function runGeoLayerWithNominatim(params: {
  address?: string | null;
  city?: string | null;
  district?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
  name?: string | null;
}): Promise<GeoLayerOutput> {
  const base = runGeoLayer(params);

  if (base.resolution.lat != null && base.resolution.lng != null) {
    return base;
  }

  try {
    const geo = await geocodeAddress({
      name: params.name,
      address: params.address,
      city: params.city,
      country: params.country,
    });

    if (geo) {
      base.resolution.lat = geo.lat;
      base.resolution.lng = geo.lng;
      base.resolution.confidence = Math.min(1, base.resolution.confidence + 0.15);
    }
  } catch {
    // Nominatim fallback failed silently
  }

  return base;
}
