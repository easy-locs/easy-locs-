/**
 * Unified ETA Engine — single ETA core for all mobility contexts.
 */
import { getMobilityProfile } from "./mobility-profiles";
import { normalizeZoneContext } from "./unified-zone-normalizer";
import type {
  UnifiedETAResult,
  UnifiedMobilityJobInput,
} from "./unified-mobility.types";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function speedByTraffic(traffic: string) {
  if (traffic === "heavy") return 18;
  if (traffic === "moderate") return 28;
  return 38;
}

export function computeUnifiedETA(params: {
  job: UnifiedMobilityJobInput;
  driverPosition?: { lat: number; lng: number } | null;
}): UnifiedETAResult {
  const profile = getMobilityProfile(params.job.context);
  const zone = normalizeZoneContext(params.job.zone);
  const speedKmh = speedByTraffic(zone.traffic);

  const pickup = params.job.pickup;
  const dropoff = params.job.dropoff;
  const driver = params.driverPosition ?? null;

  const driverToPickupKm = driver
    ? haversineKm(driver.lat, driver.lng, pickup.lat, pickup.lng) * profile.roadFactor
    : null;

  const pickupToDropoffKm =
    haversineKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng) * profile.roadFactor;

  const etaPickupMinutes =
    driverToPickupKm != null
      ? Math.max(1, Math.round((driverToPickupKm / speedKmh) * 60))
      : null;

  const etaDropoffMinutes = Math.max(
    1,
    Math.round((pickupToDropoffKm / speedKmh) * 60),
  );

  const etaMerchantReadyMinutes =
    profile.allowMerchantPrep && zone.merchantPrepMinutes
      ? Math.max(0, Math.round(zone.merchantPrepMinutes))
      : null;

  const totalEtaMinutes =
    (etaPickupMinutes ?? 0) +
    (etaMerchantReadyMinutes ?? 0) +
    (etaDropoffMinutes ?? 0);

  return {
    etaPickupMinutes,
    etaDropoffMinutes,
    etaMerchantReadyMinutes,
    totalEtaMinutes,
    distancePickupKm:
      driverToPickupKm != null ? Number(driverToPickupKm.toFixed(1)) : null,
    distanceDropoffKm: Number(pickupToDropoffKm.toFixed(1)),
    trafficLevel: zone.traffic,
    explanation_json: {
      context: params.job.context,
      speed_kmh: speedKmh,
      zone,
    },
  };
}
