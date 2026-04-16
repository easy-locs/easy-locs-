/**
 * Ride Dispatch Engine — Pure, deterministic driver-to-rider matching.
 *
 * Strategy: weighted score of (proximity, rating, charge/current-load, acceptance).
 * Matching target: rank top candidates in < 2s for a candidate pool of up to
 * several hundred drivers. This module is intentionally framework-free so it
 * can run in Edge, Node, and the browser for simulation.
 */

export interface DispatchDriver {
  userId: string;
  lat: number;
  lng: number;
  ratingAvg?: number;
  acceptanceRate?: number;
  completedRides?: number;
  activeJobs?: number;
  vehicleType?: string;
  isAvailable?: boolean;
  lastPingAgoSec?: number;
}

export interface DispatchRequest {
  pickup: { lat: number; lng: number };
  vehicleType?: string;
  maxRadiusKm?: number;
  maxCandidates?: number;
  weights?: Partial<DispatchWeights>;
}

export interface DispatchWeights {
  distance: number;
  rating: number;
  acceptance: number;
  load: number;
  freshness: number;
  vehicleFit: number;
}

export interface DispatchScore {
  userId: string;
  distanceKm: number;
  score: number;
  components: {
    distance: number;
    rating: number;
    acceptance: number;
    load: number;
    freshness: number;
    vehicleFit: number;
  };
  rank: number;
}

export const DEFAULT_WEIGHTS: DispatchWeights = {
  distance: 0.40,
  rating: 0.20,
  acceptance: 0.15,
  load: 0.10,
  freshness: 0.05,
  vehicleFit: 0.10,
};

const DEFAULT_MAX_RADIUS_KM = 8;
const DEFAULT_MAX_CANDIDATES = 25;
const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function vehicleFitScore(requested: string | undefined, have: string | undefined): number {
  if (!requested) return 0.8;
  if (!have) return 0.6;
  if (requested === have) return 1.0;
  const premiumFits = new Set(["premium", "comfort"]);
  if (premiumFits.has(requested) && premiumFits.has(have)) return 0.85;
  return 0.5;
}

/**
 * Rank drivers for a pickup request. Pure function — no I/O.
 * Returns candidates sorted by descending score, trimmed to maxCandidates.
 */
export function rankDrivers(
  drivers: DispatchDriver[],
  request: DispatchRequest,
): DispatchScore[] {
  const weights: DispatchWeights = { ...DEFAULT_WEIGHTS, ...(request.weights ?? {}) };
  const maxRadiusKm = request.maxRadiusKm ?? DEFAULT_MAX_RADIUS_KM;
  const maxCandidates = request.maxCandidates ?? DEFAULT_MAX_CANDIDATES;

  const scored: DispatchScore[] = [];

  for (const d of drivers) {
    if (d.isAvailable === false) continue;
    if (!Number.isFinite(d.lat) || !Number.isFinite(d.lng)) continue;

    const distKm = haversineKm(request.pickup.lat, request.pickup.lng, d.lat, d.lng);
    if (distKm > maxRadiusKm) continue;

    const distanceScore = clamp01(1 - distKm / maxRadiusKm);
    const ratingScore = clamp01(((d.ratingAvg ?? 4.5) - 3) / 2);
    const acceptanceScore = clamp01((d.acceptanceRate ?? 60) / 100);
    const loadScore = clamp01(1 - Math.min(d.activeJobs ?? 0, 3) / 3);
    const freshnessScore = clamp01(1 - Math.min(d.lastPingAgoSec ?? 30, 120) / 120);
    const fitScore = vehicleFitScore(request.vehicleType, d.vehicleType);

    const total =
      distanceScore * weights.distance +
      ratingScore * weights.rating +
      acceptanceScore * weights.acceptance +
      loadScore * weights.load +
      freshnessScore * weights.freshness +
      fitScore * weights.vehicleFit;

    scored.push({
      userId: d.userId,
      distanceKm: Math.round(distKm * 100) / 100,
      score: Math.round(total * 10000) / 10000,
      components: {
        distance: Math.round(distanceScore * 1000) / 1000,
        rating: Math.round(ratingScore * 1000) / 1000,
        acceptance: Math.round(acceptanceScore * 1000) / 1000,
        load: Math.round(loadScore * 1000) / 1000,
        freshness: Math.round(freshnessScore * 1000) / 1000,
        vehicleFit: Math.round(fitScore * 1000) / 1000,
      },
      rank: 0,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxCandidates).map((s, i) => ({ ...s, rank: i + 1 }));
}

/**
 * Simulate a dispatch waterfall: send the offer to top-N drivers in staggered
 * waves. Returns the offer plan that the caller can emit to real-time channels.
 */
export interface DispatchWave {
  waveIndex: number;
  offerAtMs: number;
  driverUserIds: string[];
}

export interface DispatchPlan {
  candidates: DispatchScore[];
  waves: DispatchWave[];
  computedAtMs: number;
}

export function planDispatch(
  drivers: DispatchDriver[],
  request: DispatchRequest,
  options: { waveSize?: number; waveIntervalMs?: number; maxWaves?: number } = {},
): DispatchPlan {
  const candidates = rankDrivers(drivers, request);
  const waveSize = Math.max(1, options.waveSize ?? 3);
  const waveIntervalMs = Math.max(500, options.waveIntervalMs ?? 4000);
  const maxWaves = Math.max(1, options.maxWaves ?? 5);

  const waves: DispatchWave[] = [];
  for (let i = 0; i < Math.min(maxWaves, Math.ceil(candidates.length / waveSize)); i++) {
    const batch = candidates.slice(i * waveSize, (i + 1) * waveSize);
    if (batch.length === 0) break;
    waves.push({
      waveIndex: i,
      offerAtMs: i * waveIntervalMs,
      driverUserIds: batch.map((c) => c.userId),
    });
  }

  return { candidates, waves, computedAtMs: Date.now() };
}
