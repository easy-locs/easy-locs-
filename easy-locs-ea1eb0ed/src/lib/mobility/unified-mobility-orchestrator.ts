/**
 * Unified Mobility Orchestrator — single entry point for all mobility dispatch.
 */
import { supabase } from "@/integrations/supabase/client";
import { normalizeZoneContext } from "./unified-zone-normalizer";
import { computeUnifiedPricing } from "./unified-pricing-engine";
import { computeUnifiedETA } from "./unified-eta-engine";
import { scoreUnifiedDrivers } from "./unified-driver-scorer";
import { sliceDispatchWave } from "./unified-dispatch-wave";
import type { UnifiedMobilityJobInput } from "./unified-mobility.types";

function estimateDistanceKm(
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number },
) {
  const dx = pickup.lat - dropoff.lat;
  const dy = pickup.lng - dropoff.lng;
  return Math.sqrt(dx * dx + dy * dy) * 111;
}

export async function orchestrateUnifiedMobility(job: UnifiedMobilityJobInput) {
  const zone = normalizeZoneContext(job.zone);
  const distanceKm = estimateDistanceKm(job.pickup, job.dropoff);
  const durationMin = Math.max(4, Math.round(distanceKm * 2.3));

  const pricing = computeUnifiedPricing({
    job: { ...job, zone },
    distanceKm,
    durationMin,
  });

  const eta = computeUnifiedETA({
    job: { ...job, zone },
    driverPosition: null,
  });

  const { data: createdJob } = await supabase
    .from("mobility_jobs")
    .insert({
      job_type: job.context,
      status: "searching",
      pickup_lat: job.pickup.lat,
      pickup_lng: job.pickup.lng,
      dropoff_lat: job.dropoff.lat,
      dropoff_lng: job.dropoff.lng,
      pickup_label: job.pickupLabel ?? null,
      dropoff_label: job.dropoffLabel ?? null,
      current_price: pricing.finalPrice,
      quoted_price: pricing.finalPrice,
      surge_multiplier: pricing.surgeMultiplier,
      currency: job.currency ?? "AED",
      customer_user_id: job.customerUserId ?? null,
      metadata: {
        mobility_context: job.context,
        zone_key: zone.zoneKey,
        merchant_id: job.merchantId ?? null,
        ...(job.metadata ?? {}),
      },
    } as any)
    .select()
    .single();

  if (!createdJob) throw new Error("Failed to create unified mobility job");

  // Persist pricing snapshot
  await supabase.from("mobility_pricing_snapshots").insert({
    job_id: (createdJob as any).id,
    zone_key: zone.zoneKey ?? null,
    distance_km: distanceKm,
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

  // Score drivers
  const scoredDrivers = await scoreUnifiedDrivers({
    jobId: (createdJob as any).id,
    job: { ...job, zone },
  });

  // Wave 1 dispatch
  const wave1 = sliceDispatchWave(job.context, scoredDrivers, 1);

  if (wave1.selected.length > 0) {
    await supabase.from("mobility_job_offers").insert(
      wave1.selected.map((driver) => ({
        job_id: (createdJob as any).id,
        rider_user_id: driver.rider_user_id,
        status: "pending",
        eta_minutes: eta.etaPickupMinutes ?? 5,
        expires_at: new Date(
          Date.now() + wave1.expiresSec * 1000,
        ).toISOString(),
        metadata_json: {
          mobility_context: job.context,
          wave: 1,
          score_total: driver.score_total,
        },
      })) as any,
    );
  }

  return {
    job: createdJob,
    pricing,
    eta,
    scoredDrivers,
  };
}
