/**
 * Live Mobility — Zone checking (pure function).
 */
import { haversineKm } from "@/lib/geo/distance";
import type { MerchantDeliveryZone } from "./types";

export function isInsideDeliveryZone(
  customerLat: number,
  customerLng: number,
  zone: MerchantDeliveryZone,
): boolean {
  if (zone.zone_type === "circle" && zone.center_lat != null && zone.center_lng != null && zone.radius_km != null) {
    const dist = haversineKm(customerLat, customerLng, Number(zone.center_lat), Number(zone.center_lng));
    return dist <= Number(zone.radius_km);
  }
  return false;
}

export function buildZoneKey(countryCode: string, city: string, district?: string): string {
  const parts = [countryCode.toUpperCase(), city.toUpperCase().replace(/\s+/g, "_")];
  if (district) parts.push(district.toUpperCase().replace(/\s+/g, "_"));
  return parts.join("_");
}
