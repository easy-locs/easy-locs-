/**
 * ride-ai-orchestrator — Central orchestrator: idempotency → pricing → scoring → dispatch waves.
 */
import { supabase } from "@/integrations/supabase/client";
import { scoreDriversForJob, type ScoredDriver } from "./driver-ai-scorer";
import { computeAIPricing, type PricingAIResult } from "./pricing-ai-engine";
import { createDispatchRun, dispatchWave } from "./dispatch-wave-engine";
import { findRecentDuplicateRide, buildRideIdempotencyKey } from "./ride-idempotency";

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dx = lat1 - lat2;
  const dy = lng1 - lng2;
  return Math.sqrt(dx * dx + dy * dy) * 111;
}

export interface RideAIResult {
  reused: boolean;
  job: any;
  pricing: PricingAIResult | null;
  scoredDrivers: ScoredDriver[];
}

export async function orchestrateRideAI(payload: any): Promise<RideAIResult> {
  const idempotencyKey = buildRideIdempotencyKey(payload);

  // Dedup check
  const duplicate = await findRecentDuplicateRide(idempotencyKey);
  if (duplicate) {
    return { reused: true, job: duplicate, pricing: null, scoredDrivers: [] };
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

  // 1. AI Pricing
  const pricing = computeAIPricing({
    distanceKm: distKm,
    durationMin,
    zoneKey: payload.zone_key ?? null,
    zone,
  });

  // 2. Create job with idempotency key
  const { data: job } = await supabase
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
    } as any)
    .select()
    .single();

  if (!job) throw new Error("Failed to create mobility job");

  // 3. Persist pricing snapshot
  await supabase.from("mobility_pricing_snapshots").insert({
    job_id: (job as any).id,
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
  } as any);

  // 4. Score drivers
  const scoredDrivers = await scoreDriversForJob({
    jobId: (job as any).id,
    pickupLat: payload.pickup_lat,
    pickupLng: payload.pickup_lng,
    serviceLevel: payload.service_level ?? "taxi_standard",
    zoneKey: payload.zone_key ?? null,
  });

  // 5. Create dispatch run + wave 1
  await createDispatchRun((job as any).id, payload.zone_key ?? null);
  await dispatchWave((job as any).id, scoredDrivers, 1);

  return { reused: false, job, pricing, scoredDrivers };
}
