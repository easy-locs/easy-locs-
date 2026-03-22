/**
 * Driver Ranking Engine — PASS69 Block A
 * Scores and ranks drivers for delivery job dispatch based on:
 * - Distance to pickup
 * - Estimated time of arrival (ETA)
 * - Driver reliability score (completion rate, ratings)
 * - Vehicle type compatibility
 * - Availability status
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DriverProfile {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Current status */
  status: "online" | "busy" | "offline";
  /** Vehicle type */
  vehicleType: VehicleType;
  /** Average rating (0–5) */
  rating: number;
  /** Total completed deliveries */
  completedDeliveries: number;
  /** Total cancelled/failed deliveries */
  cancelledDeliveries: number;
  /** Average delivery time in minutes (historical) */
  avgDeliveryMinutes: number;
  /** Acceptance rate (0–1) */
  acceptanceRate: number;
  /** Last activity timestamp */
  lastActiveAt: number;
  /** Optional max delivery distance in km */
  maxDistanceKm?: number;
}

export type VehicleType = "bicycle" | "scooter" | "car" | "van" | "truck";

export interface DeliveryJob {
  id: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  /** Required vehicle types (empty = any) */
  requiredVehicles: VehicleType[];
  /** Package weight in kg */
  weightKg: number;
  /** Priority level */
  priority: "standard" | "express" | "urgent";
  /** Created timestamp */
  createdAt: number;
}

export interface RankedDriver {
  driver: DriverProfile;
  score: number;
  breakdown: ScoreBreakdown;
  distanceToPickupKm: number;
  estimatedEtaMinutes: number;
  eligible: boolean;
  ineligibleReason?: string;
}

export interface ScoreBreakdown {
  distanceScore: number;
  etaScore: number;
  reliabilityScore: number;
  vehicleScore: number;
  availabilityScore: number;
  ratingScore: number;
}

// ─── Configuration ───────────────────────────────────────────────────────────

export interface RankingWeights {
  distance: number;
  eta: number;
  reliability: number;
  vehicle: number;
  availability: number;
  rating: number;
}

export const DEFAULT_WEIGHTS: RankingWeights = {
  distance: 0.30,
  eta: 0.20,
  reliability: 0.20,
  vehicle: 0.10,
  availability: 0.10,
  rating: 0.10,
};

/** Max pickup distance in km before driver is ineligible */
export const MAX_PICKUP_DISTANCE_KM = 15;

/** Average speed assumptions by vehicle type (km/h) */
export const VEHICLE_SPEEDS: Record<VehicleType, number> = {
  bicycle: 15,
  scooter: 30,
  car: 40,
  van: 35,
  truck: 30,
};

/** Max weight capacity by vehicle type (kg) */
export const VEHICLE_CAPACITY_KG: Record<VehicleType, number> = {
  bicycle: 5,
  scooter: 15,
  car: 50,
  van: 200,
  truck: 1000,
};

// ─── Geo Utilities ───────────────────────────────────────────────────────────

/** Haversine distance between two lat/lng points in km */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Estimate ETA in minutes based on distance and vehicle speed */
export function estimateEta(distanceKm: number, vehicleType: VehicleType): number {
  const speed = VEHICLE_SPEEDS[vehicleType] || 30;
  return Math.round((distanceKm / speed) * 60);
}

// ─── Scoring Functions ───────────────────────────────────────────────────────

/** Distance score: closer = higher (0–100) */
function scoreDistance(distanceKm: number, maxKm: number = MAX_PICKUP_DISTANCE_KM): number {
  if (distanceKm <= 0) return 100;
  if (distanceKm >= maxKm) return 0;
  return Math.round((1 - distanceKm / maxKm) * 100);
}

/** ETA score: faster = higher (0–100) */
function scoreEta(etaMinutes: number, maxMinutes: number = 45): number {
  if (etaMinutes <= 0) return 100;
  if (etaMinutes >= maxMinutes) return 0;
  return Math.round((1 - etaMinutes / maxMinutes) * 100);
}

/** Reliability score based on completion rate and acceptance rate (0–100) */
function scoreReliability(driver: DriverProfile): number {
  const total = driver.completedDeliveries + driver.cancelledDeliveries;
  if (total === 0) return 50; // New driver, neutral score
  const completionRate = driver.completedDeliveries / total;
  const combined = completionRate * 0.7 + driver.acceptanceRate * 0.3;
  return Math.round(combined * 100);
}

/** Vehicle compatibility score (0 or 100) */
function scoreVehicle(
  driverVehicle: VehicleType,
  requiredVehicles: VehicleType[],
  weightKg: number
): number {
  // Check weight capacity
  if (weightKg > VEHICLE_CAPACITY_KG[driverVehicle]) return 0;
  // Check required vehicle types
  if (requiredVehicles.length > 0 && !requiredVehicles.includes(driverVehicle)) return 0;
  return 100;
}

/** Availability score based on status and last activity (0–100) */
function scoreAvailability(driver: DriverProfile): number {
  if (driver.status === "offline") return 0;
  if (driver.status === "busy") return 30;
  // Online: factor in recency
  const minutesSinceActive = (Date.now() - driver.lastActiveAt) / 60000;
  if (minutesSinceActive > 30) return 50; // Stale online
  return 100;
}

/** Rating score (0–100) */
function scoreRating(rating: number): number {
  return Math.round((rating / 5) * 100);
}

// ─── Main Ranking Engine ─────────────────────────────────────────────────────

/** Check if a driver is eligible for a job */
export function checkEligibility(
  driver: DriverProfile,
  job: DeliveryJob,
  distanceKm: number
): { eligible: boolean; reason?: string } {
  if (driver.status === "offline") {
    return { eligible: false, reason: "Driver is offline" };
  }

  const maxDist = driver.maxDistanceKm ?? MAX_PICKUP_DISTANCE_KM;
  if (distanceKm > maxDist) {
    return { eligible: false, reason: `Too far: ${distanceKm.toFixed(1)}km > ${maxDist}km max` };
  }

  if (job.weightKg > VEHICLE_CAPACITY_KG[driver.vehicleType]) {
    return { eligible: false, reason: `Package too heavy for ${driver.vehicleType}` };
  }

  if (job.requiredVehicles.length > 0 && !job.requiredVehicles.includes(driver.vehicleType)) {
    return { eligible: false, reason: `Vehicle ${driver.vehicleType} not accepted` };
  }

  return { eligible: true };
}

/** Rank a single driver for a delivery job */
export function rankDriver(
  driver: DriverProfile,
  job: DeliveryJob,
  weights: RankingWeights = DEFAULT_WEIGHTS
): RankedDriver {
  const distanceKm = haversineDistance(driver.lat, driver.lng, job.pickupLat, job.pickupLng);
  const etaMinutes = estimateEta(distanceKm, driver.vehicleType);
  const eligibility = checkEligibility(driver, job, distanceKm);

  const breakdown: ScoreBreakdown = {
    distanceScore: scoreDistance(distanceKm),
    etaScore: scoreEta(etaMinutes),
    reliabilityScore: scoreReliability(driver),
    vehicleScore: scoreVehicle(driver.vehicleType, job.requiredVehicles, job.weightKg),
    availabilityScore: scoreAvailability(driver),
    ratingScore: scoreRating(driver.rating),
  };

  const score = eligibility.eligible
    ? Math.round(
        breakdown.distanceScore * weights.distance +
        breakdown.etaScore * weights.eta +
        breakdown.reliabilityScore * weights.reliability +
        breakdown.vehicleScore * weights.vehicle +
        breakdown.availabilityScore * weights.availability +
        breakdown.ratingScore * weights.rating
      )
    : 0;

  return {
    driver,
    score,
    breakdown,
    distanceToPickupKm: Math.round(distanceKm * 100) / 100,
    estimatedEtaMinutes: etaMinutes,
    eligible: eligibility.eligible,
    ineligibleReason: eligibility.reason,
  };
}

/** Rank all drivers for a delivery job, sorted by score descending */
export function rankDrivers(
  drivers: DriverProfile[],
  job: DeliveryJob,
  weights: RankingWeights = DEFAULT_WEIGHTS,
  options?: {
    /** Only return eligible drivers */
    eligibleOnly?: boolean;
    /** Max number of results */
    limit?: number;
    /** Priority multiplier: urgent jobs boost distance/eta weight */
    applyPriorityBoost?: boolean;
  }
): RankedDriver[] {
  let effectiveWeights = { ...weights };

  // Priority boost: urgent jobs increase distance/eta importance
  if (options?.applyPriorityBoost && job.priority !== "standard") {
    const boost = job.priority === "urgent" ? 1.5 : 1.25;
    effectiveWeights = {
      ...effectiveWeights,
      distance: effectiveWeights.distance * boost,
      eta: effectiveWeights.eta * boost,
    };
    // Normalize weights
    const total = Object.values(effectiveWeights).reduce((a, b) => a + b, 0);
    for (const key of Object.keys(effectiveWeights) as (keyof RankingWeights)[]) {
      effectiveWeights[key] = effectiveWeights[key] / total;
    }
  }

  let ranked = drivers.map((d) => rankDriver(d, job, effectiveWeights));

  if (options?.eligibleOnly) {
    ranked = ranked.filter((r) => r.eligible);
  }

  ranked.sort((a, b) => b.score - a.score);

  if (options?.limit) {
    ranked = ranked.slice(0, options.limit);
  }

  return ranked;
}

// ─── Batch Dispatch ──────────────────────────────────────────────────────────

export interface DispatchResult {
  jobId: string;
  assignedDriver: RankedDriver | null;
  alternates: RankedDriver[];
  dispatchedAt: number;
}

/** Dispatch a single job to the best available driver */
export function dispatchJob(
  drivers: DriverProfile[],
  job: DeliveryJob,
  weights?: RankingWeights
): DispatchResult {
  const ranked = rankDrivers(drivers, job, weights, {
    eligibleOnly: true,
    applyPriorityBoost: true,
  });

  return {
    jobId: job.id,
    assignedDriver: ranked[0] ?? null,
    alternates: ranked.slice(1, 4),
    dispatchedAt: Date.now(),
  };
}

/** Batch dispatch multiple jobs, avoiding assigning the same driver twice */
export function batchDispatch(
  drivers: DriverProfile[],
  jobs: DeliveryJob[],
  weights?: RankingWeights
): DispatchResult[] {
  const assignedDriverIds = new Set<string>();
  const results: DispatchResult[] = [];

  // Sort jobs by priority (urgent first)
  const priorityOrder = { urgent: 0, express: 1, standard: 2 };
  const sortedJobs = [...jobs].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  for (const job of sortedJobs) {
    const availableDrivers = drivers.filter((d) => !assignedDriverIds.has(d.id));
    const ranked = rankDrivers(availableDrivers, job, weights, {
      eligibleOnly: true,
      applyPriorityBoost: true,
    });

    const assigned = ranked[0] ?? null;
    if (assigned) {
      assignedDriverIds.add(assigned.driver.id);
    }

    results.push({
      jobId: job.id,
      assignedDriver: assigned,
      alternates: ranked.slice(1, 4),
      dispatchedAt: Date.now(),
    });
  }

  return results;
}
