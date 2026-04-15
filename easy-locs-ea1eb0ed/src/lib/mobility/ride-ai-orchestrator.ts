/**
 * ride-ai-orchestrator — Central orchestrator: idempotency → pricing → scoring → dispatch waves.
 */
import { db } from "@/services/db";
import { scoreDriversForJob, type ScoredDriver } from "./driver-ai-scorer";
import { computeAIPricing, type PricingAIResult } from "./pricing-ai-engine";
import { createDispatchRun, dispatchWave } from "./dispatch-wave-engine";
import { findRecentDuplicateRide, buildRideIdempotencyKey } from "./ride-idempotency";

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dx = lat1 - lat2;
  const dy = lng1 - lng2;
  return Math.sqrt(dx * dx + dy * dy) * 111;
}

interface MobilityJobRow {
  id: string;
  status: string;
  customer_user_id: string | null;
  current_price: number | null;
  currency: string;
  [key: string]: unknown;
}

interface RidePayload {
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  pickup_label?: string;
  dropoff_label?: string;
  currency?: string;
  customer_user_id?: string;
  zone_key?: string;
  service_level?: string;
  zone?: {
    demand?: number;
    supply?: number;
    traffic?: "low" | "moderate" | "heavy";
    weather?: "clear" | "rain" | "storm";
  };
}

export interface RideAIResult {
  reused: boolean;
  job: MobilityJobRow;
  pricing: PricingAIResult | null;
  scoredDrivers: ScoredDriver[];
}

export async function orchestrateRideAI(payload: RidePayload): Promise<RideAIResult> {
  const idempotencyKey = buildRideIdempotencyKey(payload);

  const duplicate = await findRecentDuplicateRide(idempotencyKey);
  if (duplicate) {
    return { reused: true, job: duplicate as MobilityJobRow, pricing: null, scoredDrivers: [] };
  }

  const distKm = distanceKm(
    payload.pickup_lat,
    payload.pickup_lng,
    payload.dropoff_lat,
    payload.dropoff_lng,
  );
  const durationMin = Math.max(4, Math.round(distKm * 2.3));

  const zone = {
    demand: payload.zone?.demand ?? 20,
    supply: payload.zone?.supply ?? 10,
    traffic: payload.zone?.traffic ?? ("moderate" as const),
    weather: payload.zone?.weather ?? ("clear" as const),
  };

  const pricing = computeAIPricing({
    distanceKm: distKm,
    durationMin,
    zoneKey: payload.zone_key ?? null,
    zone,
  });

  const { data: job } = await db
    .from("mobility_jobs")
    .insert({
      job_type: "taxi",
      status: "searching",
      pickup_lat: payload.pickup_lat,
      pickup_lng: payload.pickup_lng,
      dropoff_lat: payload.dropoff_lat,
      dropoff_lng: payload.dropoff_lng,
      pickup_label: payload.pickup_label,
      dropoff_label: payload.dropoff_label,
      current_price: pricing.finalPrice,
      quoted_price: pricing.finalPrice,
      surge_multiplier: pricing.surgeMultiplier,
      currency: payload.currency ?? "AED",
      customer_user_id: payload.customer_user_id ?? null,
    } as Record<string, unknown>)
    .select()
    .single();

  if (!job) throw new Error("Failed to create mobility job");

  const typedJob = job as MobilityJobRow;

  await db("mobility_pricing_snapshots").insert({
    job_id: typedJob.id,
    zone_key: payload.zone_key ?? null,
    distance_km: distKm,
    duration_min: durationMin,
    base_fare: pricing.baseFare,
    distance_fare: pricing.distanceFare,
    time_fare: pricing.timeFare,
    surge_multiplier: pricing.surgeMultiplier,
    traffic_multiplier: pricing.trafficMultiplier,
    demand_multiplier: pricing.demandMultiplier,
    weather_multiplier: pricing.weatherMultiplier,
    final_price: pricing.finalPrice,
    explanation_json: pricing.explanation_json,
  } as Record<string, unknown>);

  const scoredDrivers = await scoreDriversForJob({
    jobId: typedJob.id,
    pickupLat: payload.pickup_lat,
    pickupLng: payload.pickup_lng,
    serviceLevel: payload.service_level ?? "taxi_standard",
    zoneKey: payload.zone_key ?? null,
  });

  await createDispatchRun(typedJob.id, payload.zone_key ?? null);
  await dispatchWave(typedJob.id, scoredDrivers, 1);

  return { reused: false, job: typedJob, pricing, scoredDrivers };
}
