import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/core/event-bus";
import { scoreUnifiedDrivers } from "./unified-driver-scorer";
import { computeUnifiedPricing } from "./unified-pricing-engine";
import { computeUnifiedETA } from "./unified-eta-engine";
import { normalizeZoneContext } from "./unified-zone-normalizer";
import { getSmartZoneData } from "./smart-zone-manager";
import { batchDeliveryJobs } from "./delivery-batch-engine";
import { resolveConflict } from "./dispatch-conflict-resolver";
import { recordDispatchOutcome } from "./dispatch-learning-engine";
import { bridgeOrbitOnAssign } from "./dispatch-orbit-bridge";
import { bridgeWalletOnComplete } from "./dispatch-wallet-bridge";
import { canSubmitRideRequest } from "./ride-request-guard";
import { getMobilityProfile } from "./mobility-profiles";
import type { UnifiedMobilityJobInput, UnifiedDriverScore, MobilityContext } from "./unified-mobility.types";

export interface SmartDispatchResult {
  jobId: string;
  status: "dispatched" | "batched" | "no_riders" | "duplicate";
  pricing: ReturnType<typeof computeUnifiedPricing>;
  eta: ReturnType<typeof computeUnifiedETA>;
  scoredDrivers: UnifiedDriverScore[];
  batchId?: string | null;
  dispatchLatencyMs: number;
}

const SEARCH_RADIUS_KM = [3, 5, 8, 12, 20];
const WAVE_CONFIGS = [
  { count: 3, expireSec: 12, label: "precision" },
  { count: 5, expireSec: 15, label: "expanded" },
  { count: 8, expireSec: 20, label: "wide" },
  { count: 12, expireSec: 25, label: "emergency" },
];

function estimateDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export async function smartDispatch(
  job: UnifiedMobilityJobInput,
): Promise<SmartDispatchResult> {
  const t0 = performance.now();

  const dupCheck = canSubmitRideRequest({
    customer_user_id: job.customerUserId,
    pickup_lat: job.pickup.lat,
    pickup_lng: job.pickup.lng,
    dropoff_lat: job.dropoff.lat,
    dropoff_lng: job.dropoff.lng,
    pickup_label: job.pickupLabel,
    dropoff_label: job.dropoffLabel,
  });

  if (!dupCheck.allowed) {
    return {
      jobId: "",
      status: "duplicate",
      pricing: computeUnifiedPricing({ job, distanceKm: 0, durationMin: 0 }),
      eta: computeUnifiedETA({ job }),
      scoredDrivers: [],
      dispatchLatencyMs: performance.now() - t0,
    };
  }

  const smartZone = await getSmartZoneData(job.pickup.lat, job.pickup.lng);

  const enrichedJob: UnifiedMobilityJobInput = {
    ...job,
    zone: {
      ...job.zone,
      zoneKey: smartZone.zoneKey,
      demand: smartZone.demand,
      supply: smartZone.supply,
      traffic: smartZone.traffic,
      weather: smartZone.weather,
    },
  };

  const zone = normalizeZoneContext(enrichedJob.zone);
  const distanceKm = estimateDistanceKm(job.pickup, job.dropoff);
  const profile = getMobilityProfile(job.context);
  const roadDistanceKm = distanceKm * profile.roadFactor;
  const durationMin = Math.max(4, Math.round(roadDistanceKm * 2.3));

  const [pricing, eta] = [
    computeUnifiedPricing({ job: enrichedJob, distanceKm: roadDistanceKm, durationMin }),
    computeUnifiedETA({ job: enrichedJob, driverPosition: null }),
  ];

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
        smart_dispatch: true,
        dispatch_version: "v2",
        road_distance_km: roadDistanceKm,
        ...(job.metadata ?? {}),
      },
    } as any)
    .select()
    .single();

  if (!createdJob) throw new Error("Failed to create mobility job");

  const jobId = (createdJob as any).id;

  await supabase.from("mobility_pricing_snapshots").insert({
    job_id: jobId,
    zone_key: zone.zoneKey ?? null,
    distance_km: roadDistanceKm,
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

  const scoredDrivers = await scoreUnifiedDrivers({
    jobId,
    job: enrichedJob,
  });

  if (scoredDrivers.length === 0) {
    const expanded = await expandSearchRadius(enrichedJob, jobId);
    if (expanded.length === 0) {
      await supabase
        .from("mobility_jobs")
        .update({ status: "failed_no_rider" } as any)
        .eq("id", jobId);

      void eventBus.emit("dispatch.no_riders", { jobId, zone: zone.zoneKey });
      void recordDispatchOutcome(jobId, "no_riders", performance.now() - t0);

      return {
        jobId,
        status: "no_riders",
        pricing,
        eta,
        scoredDrivers: [],
        dispatchLatencyMs: performance.now() - t0,
      };
    }
    scoredDrivers.push(...expanded);
  }

  const isDelivery = ["food_delivery", "grocery_delivery", "parcel"].includes(job.context);
  let batchId: string | null = null;

  if (isDelivery) {
    const batch = await batchDeliveryJobs(jobId, job.pickup, job.dropoff, job.context);
    batchId = batch.batchId;
  }

  await createDispatchRun(jobId, zone.zoneKey, scoredDrivers);

  await dispatchWaveIntelligent(jobId, scoredDrivers, 0, zone);

  void eventBus.emit("dispatch.started", {
    jobId,
    context: job.context,
    zone: zone.zoneKey,
    driversScored: scoredDrivers.length,
    pricing: pricing.finalPrice,
  });

  const latency = performance.now() - t0;
  void recordDispatchOutcome(jobId, "dispatched", latency);

  return {
    jobId,
    status: batchId ? "batched" : "dispatched",
    pricing,
    eta,
    scoredDrivers,
    batchId,
    dispatchLatencyMs: latency,
  };
}

async function expandSearchRadius(
  job: UnifiedMobilityJobInput,
  jobId: string,
): Promise<UnifiedDriverScore[]> {
  for (let r = 1; r < SEARCH_RADIUS_KM.length; r++) {
    const radius = SEARCH_RADIUS_KM[r];

    const { data: drivers } = await supabase
      .from("rider_presence")
      .select("user_id, lat, lng, is_online, is_available, vehicle_type, zone_key")
      .eq("is_online", true)
      .eq("is_available", true)
      .limit(50);

    if (!drivers?.length) continue;

    const inRange = (drivers as any[]).filter((d) => {
      if (!d.lat || !d.lng) return false;
      const dist = estimateDistanceKm(
        { lat: job.pickup.lat, lng: job.pickup.lng },
        { lat: Number(d.lat), lng: Number(d.lng) },
      );
      return dist <= radius;
    });

    if (inRange.length > 0) {
      return scoreUnifiedDrivers({ jobId, job });
    }
  }
  return [];
}

async function createDispatchRun(
  jobId: string,
  zoneKey: string | null,
  drivers: UnifiedDriverScore[],
) {
  await supabase
    .from("mobility_dispatch_runs")
    .insert({
      job_id: jobId,
      zone_key: zoneKey,
      status: "running",
      dispatch_strategy: "smart_v2",
      current_wave: 1,
      max_waves: WAVE_CONFIGS.length,
      metadata: {
        total_candidates: drivers.length,
        top_score: drivers[0]?.score_total ?? 0,
        dispatch_version: "v2",
      },
    } as any)
    .select()
    .single();
}

async function dispatchWaveIntelligent(
  jobId: string,
  drivers: UnifiedDriverScore[],
  waveIndex: number,
  zone: ReturnType<typeof normalizeZoneContext>,
) {
  if (waveIndex >= WAVE_CONFIGS.length) return;

  const wave = WAVE_CONFIGS[waveIndex];
  const offset = WAVE_CONFIGS.slice(0, waveIndex).reduce((s, w) => s + w.count, 0);
  const selected = drivers.slice(offset, offset + wave.count);

  if (selected.length === 0) return;

  const expiresAt = new Date(Date.now() + wave.expireSec * 1000).toISOString();

  await supabase.from("mobility_job_offers").insert(
    selected.map((d) => ({
      job_id: jobId,
      rider_user_id: d.rider_user_id,
      status: "pending",
      eta_minutes: Math.max(1, Math.round(d.distance_km * 2)),
      expires_at: expiresAt,
      metadata_json: {
        wave: waveIndex + 1,
        wave_label: wave.label,
        score_total: d.score_total,
        distance_km: d.distance_km,
        dispatch_version: "v2",
      },
    })) as any,
  );

  void eventBus.emit("dispatch.wave_sent", {
    jobId,
    wave: waveIndex + 1,
    label: wave.label,
    count: selected.length,
  });
}

export async function handleOfferResponse(
  jobId: string,
  offerId: string,
  riderId: string,
  action: "accept" | "reject",
) {
  if (action === "accept") {
    const assigned = await resolveConflict(jobId, offerId, riderId);
    if (assigned) {
      void bridgeOrbitOnAssign(jobId, riderId);
      void eventBus.emit("dispatch.assigned", { jobId, riderId });
    }
    return assigned;
  }

  await supabase
    .from("mobility_job_offers")
    .update({ status: "rejected", responded_at: new Date().toISOString() } as any)
    .eq("id", offerId);

  void eventBus.emit("dispatch.offer_rejected", { jobId, offerId, riderId });

  return false;
}

export async function handleRideComplete(jobId: string) {
  const { data: job } = await supabase
    .from("mobility_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (!job) return;

  await supabase
    .from("mobility_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    } as any)
    .eq("id", jobId);

  void bridgeWalletOnComplete(jobId, (job as any).customer_user_id, (job as any).current_price, (job as any).currency ?? "AED");
  void recordDispatchOutcome(jobId, "completed", 0);
  void eventBus.emit("dispatch.completed", { jobId });
}

export async function escalateDispatch(jobId: string) {
  const { data: run } = await supabase
    .from("mobility_dispatch_runs")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle();

  if (!run || (run as any).status !== "running") return;

  const currentWave = ((run as any).current_wave as number) ?? 1;
  const nextWaveIndex = currentWave;

  if (nextWaveIndex >= WAVE_CONFIGS.length) {
    await supabase
      .from("mobility_dispatch_runs")
      .update({ status: "failed", updated_at: new Date().toISOString() } as any)
      .eq("id", (run as any).id);

    await supabase
      .from("mobility_jobs")
      .update({ status: "failed_no_rider" } as any)
      .eq("id", jobId);

    void eventBus.emit("dispatch.failed", { jobId, reason: "all_waves_exhausted" });
    void recordDispatchOutcome(jobId, "failed", 0);
    return;
  }

  const { data: scores } = await supabase
    .from("mobility_driver_scores")
    .select("*")
    .eq("job_id", jobId)
    .order("rank_index", { ascending: true });

  const drivers: UnifiedDriverScore[] = (scores ?? []).map((s: any) => ({
    rider_user_id: s.rider_user_id,
    distance_km: s.distance_km ?? 0,
    score_total: Number(s.score_total),
    score_distance: Number(s.score_distance ?? 0),
    score_acceptance: Number(s.score_acceptance ?? 0),
    score_response: Number(s.score_response ?? 0),
    score_reliability: Number(s.score_reliability ?? 0),
    score_zone: Number(s.score_zone ?? 0),
    score_activity: Number(s.score_activity ?? 0),
    score_vehicle_fit: Number(s.score_vehicle_fit ?? 0),
    score_gps_quality: Number(s.score_gps_quality ?? 0),
    rank_index: s.rank_index,
    explanation_json: s.explanation_json ?? {},
  }));

  await supabase
    .from("mobility_dispatch_runs")
    .update({
      current_wave: nextWaveIndex + 1,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", (run as any).id);

  const zone = normalizeZoneContext(null);
  await dispatchWaveIntelligent(jobId, drivers, nextWaveIndex, zone);
}

let cronInterval: ReturnType<typeof setInterval> | null = null;

export function startSmartDispatchCron(intervalMs = 5000) {
  if (cronInterval) return;

  cronInterval = setInterval(async () => {
    try {
      const nowIso = new Date().toISOString();
      const { data: expired } = await supabase
        .from("mobility_job_offers")
        .select("id,job_id")
        .eq("status", "pending")
        .lt("expires_at", nowIso)
        .limit(50);

      if (!expired?.length) return;

      await supabase
        .from("mobility_job_offers")
        .update({ status: "expired", responded_at: nowIso } as any)
        .in("id", expired.map((o: any) => o.id));

      const jobIds = [...new Set(expired.map((o: any) => o.job_id))];

      for (const jobId of jobIds) {
        const { data: accepted } = await supabase
          .from("mobility_job_offers")
          .select("id")
          .eq("job_id", jobId)
          .eq("status", "accepted")
          .limit(1)
          .maybeSingle();

        if (!accepted) {
          await escalateDispatch(jobId);
        }
      }
    } catch {
    }
  }, intervalMs);
}

export function stopSmartDispatchCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
  }
}
