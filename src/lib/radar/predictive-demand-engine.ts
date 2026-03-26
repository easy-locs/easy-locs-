/**
 * Predictive Demand Engine — Forecasts demand by zone,
 * anticipates peaks, repositions riders, and boosts merchants proactively.
 */
import { supabase } from "@/integrations/supabase/client";
import { buildZoneKey } from "@/lib/mobility/live-context-engine";

export interface DemandPrediction {
  zone_key: string;
  current_demand: number; // 0-100
  predicted_demand: number; // 0-100
  prediction_minutes: number; // how far ahead
  trend: "rising" | "stable" | "falling";
  recommended_actions: PredictiveAction[];
  confidence: number; // 0-1
}

export interface PredictiveAction {
  type: "reposition_riders" | "boost_merchants" | "auto_promo" | "expand_radius" | "surge_pricing" | "block_zone";
  priority: "low" | "medium" | "high" | "critical";
  description: string;
  params: Record<string, any>;
}

export interface ZoneEvent {
  id: string;
  zone_key: string;
  event_type: string;
  severity: string;
  lat: number;
  lng: number;
  radius_meters: number;
  title: string | null;
  description: string | null;
  is_active: boolean;
  start_at: string;
  end_at: string | null;
}

// ── Time-based demand patterns ──

const DEMAND_PATTERNS: Record<string, number[]> = {
  // Hour 0-23 demand multiplier (0-100 scale)
  food: [10, 5, 3, 2, 2, 5, 15, 30, 25, 20, 25, 55, 85, 70, 40, 35, 40, 55, 75, 90, 80, 60, 40, 20],
  grocery: [5, 3, 2, 2, 2, 3, 8, 15, 30, 45, 55, 60, 50, 40, 35, 30, 35, 45, 55, 50, 35, 20, 10, 5],
  taxi: [15, 10, 8, 5, 5, 10, 25, 60, 75, 55, 40, 35, 40, 45, 45, 50, 55, 70, 75, 65, 50, 40, 30, 20],
  delivery: [5, 3, 2, 2, 2, 3, 10, 20, 35, 45, 50, 55, 50, 40, 35, 30, 35, 40, 50, 55, 45, 30, 15, 8],
};

// ── Fetch active zone events ──

export async function fetchActiveZoneEvents(zoneKey?: string): Promise<ZoneEvent[]> {
  let query = (supabase as any)
    .from("zone_events")
    .select("*")
    .eq("is_active", true);

  if (zoneKey) query = query.eq("zone_key", zoneKey);

  const { data } = await query;
  return data ?? [];
}

// ── Core: Predict demand ──

export function predictDemand(params: {
  currentHour: number;
  vertical: string;
  currentDemand?: number;
  activeEvents: ZoneEvent[];
  riderCount: number;
  weatherType?: string;
  dayOfWeek: number; // 0=Sun 6=Sat
}): DemandPrediction {
  const { currentHour, vertical, currentDemand, activeEvents, riderCount, weatherType, dayOfWeek } = params;

  const pattern = DEMAND_PATTERNS[vertical] ?? DEMAND_PATTERNS.food;
  const baseDemand = pattern[currentHour] ?? 30;
  const nextHourDemand = pattern[(currentHour + 1) % 24] ?? 30;

  // Weekend boost
  const weekendFactor = (dayOfWeek === 5 || dayOfWeek === 6) ? 1.25 : 1.0;

  // Weather impact
  let weatherFactor = 1.0;
  if (weatherType === "rain") weatherFactor = 1.3; // more delivery demand
  if (weatherType === "storm") weatherFactor = 0.6; // unsafe
  if (weatherType === "heat") weatherFactor = 1.2;

  // Event disruption
  const severeEvents = activeEvents.filter(e => e.severity === "critical" || e.severity === "high");
  const eventFactor = severeEvents.length > 0 ? 0.5 : 1.0;

  const predicted = Math.min(100, Math.round(nextHourDemand * weekendFactor * weatherFactor * eventFactor));
  const current = currentDemand ?? Math.round(baseDemand * weekendFactor * weatherFactor);

  const trend = predicted > current + 10 ? "rising" : predicted < current - 10 ? "falling" : "stable";

  // Generate recommended actions
  const actions: PredictiveAction[] = [];

  if (trend === "rising" && predicted > 70) {
    actions.push({
      type: "reposition_riders",
      priority: "high",
      description: `High demand predicted in zone — reposition ${Math.ceil(riderCount * 0.3)} riders`,
      params: { targetRiderCount: Math.ceil(predicted / 10) },
    });
    actions.push({
      type: "boost_merchants",
      priority: "medium",
      description: "Push fast-prep merchants to reduce ETA",
      params: { maxPrepMinutes: 15 },
    });
  }

  if (predicted > 85 && riderCount < predicted / 15) {
    actions.push({
      type: "surge_pricing",
      priority: "high",
      description: "Rider supply critically low — activate surge",
      params: { multiplier: 1.3 + (predicted - 85) * 0.02 },
    });
  }

  if (weatherType === "rain" || weatherType === "heat") {
    actions.push({
      type: "auto_promo",
      priority: "medium",
      description: `${weatherType === "rain" ? "Rainy day" : "Hot day"} — auto promo on delivery`,
      params: { discountPercent: 10, reason: weatherType },
    });
  }

  if (severeEvents.length > 0) {
    actions.push({
      type: "block_zone",
      priority: "critical",
      description: `${severeEvents.length} severe event(s) — restrict zone delivery`,
      params: { eventIds: severeEvents.map(e => e.id) },
    });
  }

  if (riderCount < 3 && predicted > 40) {
    actions.push({
      type: "expand_radius",
      priority: "medium",
      description: "Low rider supply — expand dispatch radius",
      params: { expandKm: 5 },
    });
  }

  return {
    zone_key: "",
    current_demand: current,
    predicted_demand: predicted,
    prediction_minutes: 15,
    trend,
    recommended_actions: actions,
    confidence: severeEvents.length > 0 ? 0.6 : 0.82,
  };
}

// ── Smart Dispatch Score ──

export interface DispatchCandidate {
  rider_user_id: string;
  distance_km: number;
  eta_minutes: number;
  acceptance_rate: number;
  completion_rate: number;
  avg_speed_kmh: number;
  vehicle_type: string;
  current_heading?: number;
  is_heading_toward: boolean;
}

/**
 * Smart Dispatch 2.0 — rank riders by composite score, not just distance.
 */
export function scoreDispatchCandidate(
  candidate: DispatchCandidate,
  context: {
    trafficFactor: number;
    weatherFactor: number;
    orderType: "food" | "grocery" | "parcel" | "taxi";
    requiresVehicle?: string;
    isScheduled?: boolean;
  },
): number {
  let score = 100;

  // Distance/ETA (40% weight — still important but not dominant)
  const etaPenalty = Math.min(40, candidate.eta_minutes * 2.5);
  score -= etaPenalty;

  // Rider performance (25% weight)
  const perfScore = (candidate.acceptance_rate * 0.6 + candidate.completion_rate * 0.4) * 25;
  score += perfScore;

  // Heading bonus (10% — rider already going toward pickup)
  if (candidate.is_heading_toward) score += 10;

  // Traffic-adjusted ETA (10%)
  if (context.trafficFactor < 0.7) score -= 10;

  // Weather penalty (5%)
  if (context.weatherFactor < 0.7) score -= 5;

  // Vehicle match (10%)
  if (context.requiresVehicle && candidate.vehicle_type !== context.requiresVehicle) {
    score -= 15;
  }

  // Order type bonuses
  if (context.orderType === "parcel" && candidate.vehicle_type === "van") score += 5;
  if (context.orderType === "food" && candidate.avg_speed_kmh > 20) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Rank all candidates and return sorted best-to-worst.
 */
export function rankDispatchCandidates(
  candidates: DispatchCandidate[],
  context: Parameters<typeof scoreDispatchCandidate>[1],
): (DispatchCandidate & { dispatch_score: number })[] {
  return candidates
    .map(c => ({ ...c, dispatch_score: scoreDispatchCandidate(c, context) }))
    .sort((a, b) => b.dispatch_score - a.dispatch_score);
}

// ── Auto-compensation ──

export function computeAutoCompensation(params: {
  promisedEtaMinutes: number;
  actualDeliveryMinutes: number;
  orderAmount: number;
  currency: string;
}): { shouldCompensate: boolean; amount: number; reason: string } {
  const delay = params.actualDeliveryMinutes - params.promisedEtaMinutes;

  if (delay <= 10) return { shouldCompensate: false, amount: 0, reason: "" };

  // >10 min delay = partial refund
  const percentage = delay > 30 ? 0.25 : delay > 20 ? 0.15 : 0.10;
  const amount = Math.round(params.orderAmount * percentage * 100) / 100;

  return {
    shouldCompensate: true,
    amount,
    reason: `Delivery delayed by ${delay} minutes (promised ${params.promisedEtaMinutes}min, actual ${params.actualDeliveryMinutes}min)`,
  };
}
