/**
 * merchant.location — Geo-location and address for merchants.
 */

export interface MerchantLocation {
  address: string;
  city: string;
  country: string;
  countryCode: string;
  zone?: string;
  district?: string;
  lat?: number;
  lng?: number;
  timezone?: string;
  placeId?: string;
}

export function hasValidCoordinates(loc: MerchantLocation): boolean {
  return typeof loc.lat === "number" && typeof loc.lng === "number"
    && loc.lat >= -90 && loc.lat <= 90
    && loc.lng >= -180 && loc.lng <= 180;
}

export function buildZoneKey(countryCode: string, city: string, zone?: string): string {
  const parts = [countryCode.toUpperCase(), city.toUpperCase().replace(/\s+/g, "_")];
  if (zone) parts.push(zone.toUpperCase().replace(/\s+/g, "_"));
  return parts.join("_");
}
