/**
 * Driver Radar Engine — Smart nearby driver search, ranking, and dispatch mode selection.
 * Connected to driver_profiles, driver_metrics, and the unified currency system.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────
export interface RadarCandidate {
  driverProfileId: string;
  userId: string;
  distanceKm: number;
  etaMinutes: number;
  rating: number;
  acceptanceRate: number;
  reliabilityScore: number;
  activeJobs: number;
  maxActiveJobs: number;
  vehicleType: string | null;
  totalScore: number;
  explanation: Record<string, number>;
}

export interface RadarSearchParams {
  pickupLat: number;
  pickupLng: number;
  countryCode: string;
  city?: string;
  requiredVehicleType?: string;
  maxRadiusKm?: number;
  limit?: number;
}

export type DispatchMode = "auto_assign" | "broadcast_top_n" | "no_drivers";

// ── Haversine ─────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Scoring weights ───────────────────────────────────────
const WEIGHTS = {
  distance: 0.30,
  eta: 0.22,
  acceptance: 0.18,
  rating: 0.16,
  workload: 0.14,
};

function scoreCandidate(c: Omit<RadarCandidate, "totalScore" | "explanation">): RadarCandidate {
  const distScore = Math.max(0, 100 - c.distanceKm * 10);
  const etaScore = Math.max(0, 100 - c.etaMinutes * 5);
  const acceptScore = c.acceptanceRate * 100;
  const ratingScore = (c.rating / 5) * 100;
  const loadScore = c.activeJobs < c.maxActiveJobs
    ? 100 - (c.activeJobs / c.maxActiveJobs) * 100
    : 0;

  const totalScore = Number((
    distScore * WEIGHTS.distance +
    etaScore * WEIGHTS.eta +
    acceptScore * WEIGHTS.acceptance +
    ratingScore * WEIGHTS.rating +
    loadScore * WEIGHTS.workload
  ).toFixed(2));

  return {
    ...c,
    totalScore,
    explanation: {
      distance: Number(distScore.toFixed(1)),
      eta: Number(etaScore.toFixed(1)),
      acceptance: Number(acceptScore.toFixed(1)),
      rating: Number(ratingScore.toFixed(1)),
      workload: Number(loadScore.toFixed(1)),
    },
  };
}

// ── 1. Search eligible drivers ────────────────────────────
export async function searchEligibleDrivers(params: RadarSearchParams): Promise<RadarCandidate[]> {
  const radius = params.maxRadiusKm ?? 10;
  const limit = params.limit ?? 20;

  // Fetch online, available drivers in same country
  let query = (supabase as any)
    .from("driver_profiles")
    .select("*")
    .eq("is_online", true)
    .eq("is_available", true)
    .eq("country_code", params.countryCode)
    .not("current_lat", "is", null)
    .not("current_lng", "is", null)
    .limit(100);

  const { data: drivers } = await query;
  if (!drivers?.length) return [];

  // Fetch metrics in parallel
  const driverIds = drivers.map((d: any) => d.id);
  const { data: metrics } = await (supabase as any)
    .from("driver_metrics")
    .select("*")
    .in("driver_profile_id", driverIds);

  const metricsMap = new Map((metrics ?? []).map((m: any) => [m.driver_profile_id, m]));

  // Filter and score
  const candidates: RadarCandidate[] = [];

  for (const d of drivers) {
    // City filter
    if (params.city && d.city && d.city !== params.city) continue;

    // Vehicle filter
    if (params.requiredVehicleType && d.vehicle_type && d.vehicle_type !== params.requiredVehicleType) continue;

    // Distance filter
    const dist = haversineKm(params.pickupLat, params.pickupLng, d.current_lat, d.current_lng);
    const serviceRadius = d.service_radius_km ?? 15;
    if (dist > Math.min(radius, serviceRadius)) continue;

    const m = metricsMap.get(d.id) as Record<string, any> | undefined;
    const etaMin = Math.ceil((dist / 30) * 60); // ~30km/h city avg

    // Capacity check
    const activeJobs = (m?.active_jobs_count ?? 0) as number;
    const maxJobs = d.max_active_jobs ?? 1;
    if (activeJobs >= maxJobs) continue;

    const scored = scoreCandidate({
      driverProfileId: d.id,
      userId: d.user_id,
      distanceKm: Number(dist.toFixed(2)),
      etaMinutes: etaMin,
      rating: (m?.rating ?? d.rating ?? 4.5) as number,
      acceptanceRate: (m?.acceptance_rate ?? 0.8) as number,
      reliabilityScore: (m?.reliability_score ?? 0.8) as number,
      activeJobs,
      maxActiveJobs: maxJobs,
      vehicleType: d.vehicle_type ?? null,
    });

    candidates.push(scored);
  }

  candidates.sort((a, b) => b.totalScore - a.totalScore);
  return candidates.slice(0, limit);
}

// ── 2. Choose dispatch mode ───────────────────────────────
const AUTO_ASSIGN_THRESHOLD = 70;

export function chooseDispatchMode(candidates: RadarCandidate[]): {
  mode: DispatchMode;
  bestCandidate?: RadarCandidate;
  broadcastCandidates?: RadarCandidate[];
} {
  if (!candidates.length) return { mode: "no_drivers" };

  const best = candidates[0];
  if (best.totalScore >= AUTO_ASSIGN_THRESHOLD) {
    return { mode: "auto_assign", bestCandidate: best };
  }

  return {
    mode: "broadcast_top_n",
    broadcastCandidates: candidates.slice(0, 5),
  };
}

// ── 3. Expand radius search ──────────────────────────────
const EXPANSION_STEPS = [10, 15, 22, 30];

export async function expandRadarSearch(
  params: RadarSearchParams,
  currentRadiusKm: number,
): Promise<{ candidates: RadarCandidate[]; radiusUsed: number }> {
  const nextRadius = EXPANSION_STEPS.find(r => r > currentRadiusKm) ?? currentRadiusKm * 1.5;
  const candidates = await searchEligibleDrivers({ ...params, maxRadiusKm: nextRadius });
  return { candidates, radiusUsed: nextRadius };
}
