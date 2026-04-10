/**
 * Geo Layer barrel — Composes geo atomic units.
 */
import type { GeoLayerOutput } from "../contracts";
import { normalizeAddress } from "./geo.address.normalize";
import { resolveCountry } from "./geo.country.resolve";
import { resolveCity } from "./geo.city.resolve";

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
