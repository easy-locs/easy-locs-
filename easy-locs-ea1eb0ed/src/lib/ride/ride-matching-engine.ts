import type {
  GeoPoint,
  VehicleType,
  DriverProfile,
  DriverLocation,
} from "@/domains/ride/ride-types";
import { estimateDistance } from "./ride-pricing-engine";
import { computeSmartETASync } from "@/lib/mobility/smart-eta-engine";
import type { SmartTrafficLevel, SmartWeatherImpact } from "@/lib/mobility/smart-eta-engine";

export interface MatchCandidate {
  driver: DriverProfile;
  location: DriverLocation;
  distanceKm: number;
  etaMinutes: number;
  score: number;
  scoreBreakdown: {
    proximity: number;
    rating: number;
    experience: number;
    vehicleFit: number;
    acceptance: number;
  };
}

export interface MatchRequest {
  pickup: GeoPoint;
  vehicleType: VehicleType;
  maxDistanceKm?: number;
  maxCandidates?: number;
}

export interface MatchResult {
  candidates: MatchCandidate[];
  bestMatch: MatchCandidate | null;
  searchRadiusKm: number;
  totalDriversScanned: number;
  matchedAt: string;
}

const SCORE_WEIGHTS = {
  proximity: 0.35,
  rating: 0.20,
  experience: 0.15,
  vehicleFit: 0.20,
  acceptance: 0.10,
};

const MAX_SEARCH_RADIUS_KM = 15;
const DEFAULT_MAX_CANDIDATES = 5;

function computeProximityScore(distanceKm: number): number {
  if (distanceKm <= 1) return 100;
  if (distanceKm <= 3) return 80;
  if (distanceKm <= 5) return 60;
  if (distanceKm <= 10) return 30;
  return Math.max(0, 100 - distanceKm * 10);
}

function computeRatingScore(rating: number): number {
  return Math.min(100, (rating / 5) * 100);
}

function computeExperienceScore(totalTrips: number): number {
  if (totalTrips >= 1000) return 100;
  if (totalTrips >= 500) return 85;
  if (totalTrips >= 100) return 70;
  if (totalTrips >= 50) return 55;
  return Math.min(50, totalTrips);
}

function computeVehicleFitScore(driverVehicle: VehicleType, requestedVehicle: VehicleType): number {
  if (driverVehicle === requestedVehicle) return 100;
  const upgrades: Record<VehicleType, VehicleType[]> = {
    standard: ["premium", "xl", "electric"],
    premium: ["xl"],
    moto: ["bike"],
    bike: ["moto"],
    xl: ["van"],
    electric: ["standard", "premium"],
    van: [],
  };
  if (upgrades[requestedVehicle]?.includes(driverVehicle)) return 60;
  return 0;
}

function computeAcceptanceScore(): number {
  return 70 + Math.random() * 30;
}

function estimateEta(distanceKm: number): number {
  const durationMin = Math.max(2, Math.ceil((distanceKm / 25) * 60));
  const result = computeSmartETASync(distanceKm, durationMin);
  return result.etaMinutes;
}

export function matchDrivers(
  request: MatchRequest,
  availableDrivers: Array<{ driver: DriverProfile; location: DriverLocation }>,
): MatchResult {
  const maxDist = request.maxDistanceKm ?? MAX_SEARCH_RADIUS_KM;
  const maxCandidates = request.maxCandidates ?? DEFAULT_MAX_CANDIDATES;

  const scored: MatchCandidate[] = availableDrivers
    .filter(d => d.driver.status === "online")
    .map(({ driver, location }) => {
      const distanceKm = estimateDistance(
        request.pickup.lat, request.pickup.lng,
        location.point.lat, location.point.lng,
      );

      if (distanceKm > maxDist) return null;

      const proximity = computeProximityScore(distanceKm);
      const rating = computeRatingScore(driver.rating);
      const experience = computeExperienceScore(driver.totalTrips);
      const vehicleFit = computeVehicleFitScore(driver.vehicleType, request.vehicleType);
      const acceptance = computeAcceptanceScore();

      if (vehicleFit === 0) return null;

      const score =
        proximity * SCORE_WEIGHTS.proximity +
        rating * SCORE_WEIGHTS.rating +
        experience * SCORE_WEIGHTS.experience +
        vehicleFit * SCORE_WEIGHTS.vehicleFit +
        acceptance * SCORE_WEIGHTS.acceptance;

      return {
        driver,
        location,
        distanceKm: Math.round(distanceKm * 10) / 10,
        etaMinutes: estimateEta(distanceKm),
        score: Math.round(score * 10) / 10,
        scoreBreakdown: {
          proximity: Math.round(proximity),
          rating: Math.round(rating),
          experience: Math.round(experience),
          vehicleFit: Math.round(vehicleFit),
          acceptance: Math.round(acceptance),
        },
      };
    })
    .filter((c): c is MatchCandidate => c !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCandidates);

  return {
    candidates: scored,
    bestMatch: scored[0] ?? null,
    searchRadiusKm: maxDist,
    totalDriversScanned: availableDrivers.length,
    matchedAt: new Date().toISOString(),
  };
}

export function computeETA(
  driverLocation: GeoPoint,
  pickup: GeoPoint,
  dropoff: GeoPoint,
  trafficLevel: "low" | "moderate" | "heavy" | "gridlock" = "moderate",
  weatherImpact: SmartWeatherImpact = "none",
): { pickupEta: number; tripEta: number; totalEta: number; pickupRange: [number, number]; tripRange: [number, number] } {
  const pickupDist = estimateDistance(driverLocation.lat, driverLocation.lng, pickup.lat, pickup.lng);
  const tripDist = estimateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);

  const speeds: Record<string, number> = { low: 40, moderate: 30, heavy: 20, gridlock: 10 };
  const speed = speeds[trafficLevel] ?? 30;

  const rawPickupMin = Math.max(2, Math.ceil((pickupDist / speed) * 60));
  const rawTripMin = Math.max(3, Math.ceil((tripDist / speed) * 60));

  const pickupResult = computeSmartETASync(pickupDist, rawPickupMin, trafficLevel as SmartTrafficLevel, weatherImpact);
  const tripResult = computeSmartETASync(tripDist, rawTripMin, trafficLevel as SmartTrafficLevel, weatherImpact);

  return {
    pickupEta: pickupResult.etaMinutes,
    tripEta: tripResult.etaMinutes,
    totalEta: pickupResult.etaMinutes + tripResult.etaMinutes,
    pickupRange: [pickupResult.etaRangeMin, pickupResult.etaRangeMax],
    tripRange: [tripResult.etaRangeMin, tripResult.etaRangeMax],
  };
}
