import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";
import { scoreUnifiedDrivers } from "./unified-driver-scorer";
import { computeUnifiedPricing } from "./unified-pricing-engine";
import { computeUnifiedETA } from "./unified-eta-engine";
import { normalizeZoneContext } from "./unified-zone-normalizer";
import { getSmartZoneData } from "./smart-zone-manager";
import { batchDeliveryJobs } from "./delivery-batch-engine";
import { resolveConflict } from "./dispatch-conflict-resolver";
import { recordDispatchOutcome } from "./dispatch-learning-engine";
import { recordETAPrediction, recordActualArrival } from "./eta-accuracy-tracker";
import { computeSmartETA } from "./smart-eta-engine";
import { bridgeOrbitOnAssign } from "./dispatch-orbit-bridge";
import { bridgeWalletOnComplete } from "./dispatch-wallet-bridge";
import { canSubmitRideRequest } from "./ride-request-guard";
import { getMobilityProfile } from "./mobility-profiles";
import type { UnifiedMobilityJobInput, UnifiedDriverScore, MobilityContext } from "./unified-mobility.types";

interface MobilityJobRow {
  id: string;
  status: string;
  customer_user_id: string | null;
  current_price: number | null;
  currency: string;
  [key: string]: unknown;
}

interface DispatchRunRow {
  id: string;
  status: string;
  current_wave: number;
  [key: string]: unknown;
}

interface DriverPresenceRow {
  user_id: string;
  lat: number | null;
  lng: number | null;
  is_online: boolean;
  is_available: boolean;
  vehicle_type: string | null;
  zone_key: string | null;
}

interface DriverScoreRow {
  rider_user_id: string;
  distance_km: number | null;
  score_total: number | string;
  score_distance: number | string | null;
  score_acceptance: number | string | null;
  score_response: number | string | null;
  score_reliability: number | string | null;
  score_zone: number | string | null;
  score_activity: number | string | null;
  score_vehicle_fit: number | string | null;
  score_gps_quality: number | string | null;
  rank_index: number;
  explanation_json: Record<string, unknown> | null;
}

interface OfferRow {
  id: string;
  job_id: string;
}

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

  let smartEtaResult: Awaited<ReturnType<typeof computeSmartETA>> | null = null;
  try {
    smartEtaResult = await computeSmartETA(job.pickup, job.dropoff, { skipDriverCount: true });
  } catch { /* fall through to legacy ETA */ }

  const { data: createdJob } = await db
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
    } as Record<string, unknown>)
    .select()
    .single();

  if (!createdJob) throw new Error("Failed to create mobility job");

  const typedJob = createdJob as MobilityJobRow;
  const jobId = typedJob.id;

  await db.from("mobility_pricing_snapshots").insert({
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
  } as Record<string, unknown>);

  if (smartEtaResult) {
    void recordETAPrediction({
      job_id: jobId,
      prediction_type: "dispatch",
      predicted_eta_minutes: smartEtaResult.etaMinutes,
      predicted_range_min: smartEtaResult.etaRangeMin,
      predicted_range_max: smartEtaResult.etaRangeMax,
      traffic_level: smartEtaResult.trafficLevel,
      weather_impact: smartEtaResult.weatherImpact,
      rush_hour_multiplier: smartEtaResult.rushHourMultiplier,
      confidence_score: smartEtaResult.confidenceScore,
      origin_lat: job.pickup.lat,
      origin_lng: job.pickup.lng,
      destination_lat: job.dropoff.lat,
      destination_lng: job.dropoff.lng,
    }).catch((e) => { console.warn("[ETA_TRACKING] Failed to record dispatch prediction:", e); });
  }

  const scoredDrivers = await scoreUnifiedDrivers({
    jobId,
    job: enrichedJob,
  });

  if (scoredDrivers.length === 0) {
    const expanded = await expandSearchRadius(enrichedJob, jobId);
    if (expanded.length === 0) {
      await db
        .from("mobility_jobs")
        .update({ status: "failed_no_rider" } as Record<string, unknown>)
        .eq("id", jobId);

      platformBus.emit("dispatch:no_riders", { jobId, zone: zone.zoneKey }, "system");
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

  platformBus.emit("dispatch:started", {
    jobId,
    context: job.context,
    zone: zone.zoneKey,
    driversScored: scoredDrivers.length,
    pricing: pricing.finalPrice,
  }, "system");

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

    const degDelta = radius / 111.0;
    const { data: drivers } = await db
      .from("rider_presence")
      .select("user_id, lat, lng, is_online, is_available, vehicle_type, zone_key")
      .eq("is_online", true)
      .eq("is_available", true)
      .gte("lat", job.pickup.lat - degDelta)
      .lte("lat", job.pickup.lat + degDelta)
      .gte("lng", job.pickup.lng - degDelta)
      .lte("lng", job.pickup.lng + degDelta)
      .limit(50);

    if (!drivers?.length) continue;

    const typedDrivers = drivers as DriverPresenceRow[];
    const inRange = typedDrivers.filter((d) => {
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
  await db
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
    } as Record<string, unknown>)
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

  await db.from("mobility_job_offers").insert(
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
    })) as Record<string, unknown>[],
  );

  platformBus.emit("dispatch:wave_sent", {
    jobId,
    wave: waveIndex + 1,
    label: wave.label,
    count: selected.length,
  }, "system");
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
      platformBus.emit("dispatch:assigned", { jobId, riderId }, "system");
    }
    return assigned;
  }

  await db
    .from("mobility_job_offers")
    .update({ status: "rejected", responded_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("id", offerId);

  platformBus.emit("dispatch:offer_rejected", { jobId, offerId, riderId }, "system");

  return false;
}

export async function handleRideComplete(jobId: string) {
  const { data: job } = await db
    .from("mobility_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (!job) return;

  const typedJob = job as MobilityJobRow;
  const completedAt = new Date().toISOString();

  await db
    .from("mobility_jobs")
    .update({
      status: "completed",
      completed_at: completedAt,
    } as Record<string, unknown>)
    .eq("id", jobId);

  const pickedUpAt = (job as Record<string, unknown>).picked_up_at as string | null;
  const acceptedAt = (job as Record<string, unknown>).accepted_at as string | null;
  const referenceTime = pickedUpAt ?? acceptedAt ?? ((job as Record<string, unknown>).created_at as string | null);
  if (referenceTime) {
    const actualDurationMinutes = (Date.now() - new Date(referenceTime).getTime()) / 60_000;
    void recordActualArrival(jobId, Math.round(actualDurationMinutes)).catch(() => {});
  }

  void bridgeWalletOnComplete(jobId, typedJob.customer_user_id, typedJob.current_price, typedJob.currency ?? "AED");
  void recordDispatchOutcome(jobId, "completed", 0);
  platformBus.emit("dispatch:completed", { jobId }, "system");
}

export async function escalateDispatch(jobId: string) {
  const { data: run } = await db
    .from("mobility_dispatch_runs")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle();

  if (!run) return;

  const typedRun = run as DispatchRunRow;
  if (typedRun.status !== "running") return;

  const currentWave = typedRun.current_wave ?? 1;
  const nextWaveIndex = currentWave;

  if (nextWaveIndex >= WAVE_CONFIGS.length) {
    await db
      .from("mobility_dispatch_runs")
      .update({ status: "failed", updated_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", typedRun.id);

    await db
      .from("mobility_jobs")
      .update({ status: "failed_no_rider" } as Record<string, unknown>)
      .eq("id", jobId);

    platformBus.emit("dispatch:failed", { jobId, reason: "all_waves_exhausted" }, "system");
    void recordDispatchOutcome(jobId, "failed", 0);
    return;
  }

  const { data: scores } = await db
    .from("mobility_driver_scores")
    .select("*")
    .eq("job_id", jobId)
    .order("rank_index", { ascending: true });

  const drivers: UnifiedDriverScore[] = (scores ?? []).map((s: DriverScoreRow) => ({
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

  await db
    .from("mobility_dispatch_runs")
    .update({
      current_wave: nextWaveIndex + 1,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq("id", typedRun.id);

  const zone = normalizeZoneContext(null);
  await dispatchWaveIntelligent(jobId, drivers, nextWaveIndex, zone);
}

/**
 * dispatchCronTick — Single tick of the dispatch expiry/escalation loop.
 * Called by the scheduled Edge Function `dispatch-cron` (pg_cron every 5s).
 * Exposed for testing and manual invocation. Do NOT use setInterval on client.
 */
export async function dispatchCronTick(): Promise<{ expired: number; escalated: number }> {
  const nowIso = new Date().toISOString();
  const { data: expired } = await db
    .from("mobility_job_offers")
    .select("id,job_id")
    .eq("status", "pending")
    .lt("expires_at", nowIso)
    .limit(50);

  if (!expired?.length) return { expired: 0, escalated: 0 };

  const typedExpired = expired as OfferRow[];

  await db
    .from("mobility_job_offers")
    .update({ status: "expired", responded_at: nowIso } as Record<string, unknown>)
    .in("id", typedExpired.map((o) => o.id));

  const jobIds = [...new Set(typedExpired.map((o) => o.job_id))];
  let escalated = 0;

  for (const jobId of jobIds) {
    const { data: accepted } = await db
      .from("mobility_job_offers")
      .select("id")
      .eq("job_id", jobId)
      .eq("status", "accepted")
      .limit(1)
      .maybeSingle();

    if (!accepted) {
      await escalateDispatch(jobId);
      escalated++;
    }
  }

  return { expired: typedExpired.length, escalated };
}

let cronInterval: ReturnType<typeof setInterval> | null = null;

/**
 * startSmartDispatchCron — Client-side fallback cron for dispatch expiry/escalation.
 * Primary path is the `dispatch-cron` Edge Function via pg_cron.
 * This fallback stays active until backend parity is verified; set
 * DISABLE_CLIENT_DISPATCH_CRON=true in env to disable.
 */
export function startSmartDispatchCron(intervalMs = 5000) {
  if (cronInterval) return;
  if (typeof window !== "undefined" && (window as Record<string, unknown>).__DISABLE_CLIENT_DISPATCH_CRON__) {
    console.log("[dispatch] Client cron disabled via feature flag");
    return;
  }

  cronInterval = setInterval(async () => {
    try {
      await dispatchCronTick();
    } catch {}
  }, intervalMs);
}

export function stopSmartDispatchCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
  }
}
