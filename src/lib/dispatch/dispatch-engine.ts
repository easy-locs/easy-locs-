/**
 * Dispatch Engine v2 — Full dispatch lifecycle using dispatch_jobs_v2 and driver_mission_offers.
 * Connected to unified orders, wallet splits, driver radar, and Orbit events.
 */
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { getCurrencyFromCountry } from "@/lib/currency";
import { searchEligibleDrivers, chooseDispatchMode, expandRadarSearch } from "@/lib/dispatch/driver-radar";
import { attachDriverWalletToOrder } from "@/lib/dispatch/dispatch-wallet-link";
import type { RadarCandidate } from "@/lib/dispatch/driver-radar";

// ── Types ─────────────────────────────────────────────────
export type DispatchStatus =
  | "open" | "broadcasted" | "offered" | "assigned" | "accepted"
  | "driver_arriving_pickup" | "picked_up" | "in_progress"
  | "delivered" | "validated" | "failed" | "cancelled" | "expired" | "self_delivery";

export interface DispatchJobInput {
  orderId: string;
  merchantProfileId: string;
  customerUserId?: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  countryCode: string;
  city?: string;
  distanceKm?: number;
  estimatedDurationMin?: number;
  deliveryFee: number;
  currency?: string;
  selfDelivery?: boolean;
}

// ── Haversine ─────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── 1. Create dispatch job ────────────────────────────────
export async function createDispatchJob(input: DispatchJobInput) {
  const currency = input.currency || getCurrencyFromCountry(input.countryCode);
  const distKm = input.distanceKm ?? haversineKm(input.pickupLat, input.pickupLng, input.dropoffLat, input.dropoffLng);

  if (input.selfDelivery) {
    // Self-delivery: create job but skip external radar
    const { data, error } = await (supabase as any)
      .from("dispatch_jobs_v2")
      .insert({
        order_id: input.orderId,
        merchant_profile_id: input.merchantProfileId,
        customer_user_id: input.customerUserId ?? null,
        country_code: input.countryCode,
        city: input.city ?? null,
        pickup_lat: input.pickupLat,
        pickup_lng: input.pickupLng,
        dropoff_lat: input.dropoffLat,
        dropoff_lng: input.dropoffLng,
        distance_km: distKm,
        estimated_duration_min: input.estimatedDurationMin ?? Math.ceil(distKm * 4),
        delivery_fee: input.deliveryFee,
        currency,
        dispatch_status: "self_delivery",
      } as any)
      .select("*")
      .single();
    if (error) throw error;

    await (supabase as any).from("orders").update({
      dispatch_job_id: data.id,
      delivery_status: "self_delivery",
    } as any).eq("id", input.orderId);

    return data;
  }

  const { data, error } = await (supabase as any)
    .from("dispatch_jobs_v2")
    .insert({
      order_id: input.orderId,
      merchant_profile_id: input.merchantProfileId,
      customer_user_id: input.customerUserId ?? null,
      country_code: input.countryCode,
      city: input.city ?? null,
      pickup_lat: input.pickupLat,
      pickup_lng: input.pickupLng,
      dropoff_lat: input.dropoffLat,
      dropoff_lng: input.dropoffLng,
      distance_km: distKm,
      estimated_duration_min: input.estimatedDurationMin ?? Math.ceil(distKm * 4),
      delivery_fee: input.deliveryFee,
      currency,
      dispatch_status: "open",
    } as any)
    .select("*")
    .single();

  if (error) throw error;

  // Link dispatch job to order
  await (supabase as any).from("orders").update({
    dispatch_job_id: data.id,
    delivery_status: "awaiting_dispatch",
  } as any).eq("id", input.orderId);

  platformBus.emit("dispatch:job_created" as any, {
    jobId: data.id,
    orderId: input.orderId,
  }, "system");

  return data;
}

// ── 2. Broadcast dispatch job ─────────────────────────────
export async function broadcastDispatchJob(dispatchJobId: string): Promise<{
  mode: "auto_assigned" | "broadcasted" | "no_drivers";
  driverId?: string;
}> {
  const { data: job } = await (supabase as any)
    .from("dispatch_jobs_v2")
    .select("*")
    .eq("id", dispatchJobId)
    .single();

  if (!job) throw new Error("Dispatch job not found");

  const candidates = await searchEligibleDrivers({
    pickupLat: job.pickup_lat,
    pickupLng: job.pickup_lng,
    countryCode: job.country_code,
    city: job.city,
  });

  // Save ranking snapshot
  await (supabase as any).from("dispatch_jobs_v2").update({
    ranking_snapshot: {
      candidates: candidates.slice(0, 5).map(c => ({
        id: c.driverProfileId,
        score: c.totalScore,
        explanation: c.explanation,
        distanceKm: c.distanceKm,
        etaMinutes: c.etaMinutes,
      })),
      searchedAt: new Date().toISOString(),
    },
  } as any).eq("id", dispatchJobId);

  const decision = chooseDispatchMode(candidates);

  if (decision.mode === "no_drivers") {
    await (supabase as any).from("dispatch_jobs_v2").update({
      dispatch_status: "expired",
      ai_dispatch_metadata: { reason: "no_eligible_drivers" },
    } as any).eq("id", dispatchJobId);
    return { mode: "no_drivers" };
  }

  if (decision.mode === "auto_assign" && decision.bestCandidate) {
    await autoAssignDriver({
      dispatchJobId,
      orderId: job.order_id,
      candidate: decision.bestCandidate,
      countryCode: job.country_code,
      deliveryFee: Number(job.delivery_fee),
    });
    return { mode: "auto_assigned", driverId: decision.bestCandidate.userId };
  }

  // Broadcast to top candidates
  await (supabase as any).from("dispatch_jobs_v2").update({
    dispatch_status: "broadcasted",
  } as any).eq("id", dispatchJobId);

  platformBus.emit("dispatch:broadcast_started" as any, { jobId: dispatchJobId }, "system");

  const broadcastList = decision.broadcastCandidates ?? candidates.slice(0, 5);
  for (const c of broadcastList) {
    await (supabase as any).from("driver_mission_offers").insert({
      dispatch_job_id: dispatchJobId,
      driver_profile_id: c.driverProfileId,
      offer_status: "sent",
      ranking_score: c.totalScore,
      ranking_reason: c.explanation,
      expires_at: new Date(Date.now() + 30_000).toISOString(),
    } as any);

    platformBus.emit("dispatch:offer_sent" as any, {
      jobId: dispatchJobId,
      driverProfileId: c.driverProfileId,
      score: c.totalScore,
    }, "system");
  }

  return { mode: "broadcasted" };
}

// ── 3. Auto-assign driver ─────────────────────────────────
async function autoAssignDriver(params: {
  dispatchJobId: string;
  orderId: string;
  candidate: RadarCandidate;
  countryCode: string;
  deliveryFee: number;
}) {
  const now = new Date().toISOString();

  // Lock driver on dispatch job
  await (supabase as any).from("dispatch_jobs_v2").update({
    dispatch_status: "assigned",
    assigned_driver_id: params.candidate.driverProfileId,
    assigned_at: now,
  } as any).eq("id", params.dispatchJobId);

  // Attach driver wallet to order + split
  await attachDriverWalletToOrder({
    orderId: params.orderId,
    driverProfileId: params.candidate.driverProfileId,
    driverUserId: params.candidate.userId,
    deliveryFee: params.deliveryFee,
    countryCode: params.countryCode,
  });

  platformBus.emit("dispatch:driver_assigned" as any, {
    jobId: params.dispatchJobId,
    orderId: params.orderId,
    driverProfileId: params.candidate.driverProfileId,
    driverUserId: params.candidate.userId,
    mode: "auto_assigned",
  }, "system");
}

// ── 4. Driver accept offer ────────────────────────────────
export async function acceptDriverOffer(params: {
  offerId: string;
  driverProfileId: string;
}) {
  const { data: offer } = await (supabase as any)
    .from("driver_mission_offers")
    .select("*")
    .eq("id", params.offerId)
    .single();

  if (!offer) throw new Error("Offer not found");
  if (offer.offer_status !== "sent") throw new Error("Offer no longer available");

  // Race-safe check: is job still unassigned?
  const { data: job } = await (supabase as any)
    .from("dispatch_jobs_v2")
    .select("assigned_driver_id, order_id, country_code, delivery_fee")
    .eq("id", offer.dispatch_job_id)
    .single();

  if (!job) throw new Error("Job not found");
  if (job.assigned_driver_id) throw new Error("Job already taken by another driver");

  // Accept this offer
  await (supabase as any).from("driver_mission_offers").update({
    offer_status: "accepted",
    responded_at: new Date().toISOString(),
  } as any).eq("id", params.offerId);

  // Mark all other offers as won_by_other
  await (supabase as any).from("driver_mission_offers").update({
    offer_status: "won_by_other",
  } as any)
    .eq("dispatch_job_id", offer.dispatch_job_id)
    .neq("id", params.offerId)
    .in("offer_status", ["sent"]);

  // Assign driver
  const now = new Date().toISOString();
  await (supabase as any).from("dispatch_jobs_v2").update({
    dispatch_status: "assigned",
    assigned_driver_id: params.driverProfileId,
    assigned_at: now,
  } as any).eq("id", offer.dispatch_job_id);

  // Attach wallet + split
  // We need the driver user_id from the profile
  const { data: profile } = await (supabase as any)
    .from("driver_profiles")
    .select("user_id")
    .eq("id", params.driverProfileId)
    .single();

  if (profile) {
    await attachDriverWalletToOrder({
      orderId: job.order_id,
      driverProfileId: params.driverProfileId,
      driverUserId: profile.user_id,
      deliveryFee: Number(job.delivery_fee),
      countryCode: job.country_code,
    });
  }

  platformBus.emit("dispatch:driver_accepted" as any, {
    jobId: offer.dispatch_job_id,
    orderId: job.order_id,
    driverProfileId: params.driverProfileId,
    offerId: params.offerId,
  }, "system");

  return { ok: true };
}

// ── 5. Driver decline offer ───────────────────────────────
export async function declineDriverOffer(params: {
  offerId: string;
  driverProfileId: string;
}) {
  await (supabase as any).from("driver_mission_offers").update({
    offer_status: "declined",
    responded_at: new Date().toISOString(),
  } as any).eq("id", params.offerId);

  platformBus.emit("dispatch:driver_declined" as any, {
    offerId: params.offerId,
    driverProfileId: params.driverProfileId,
  }, "system");

  return { ok: true };
}

// ── 6. Retry dispatch ─────────────────────────────────────
export async function retryDispatch(dispatchJobId: string) {
  const { data: job } = await (supabase as any)
    .from("dispatch_jobs_v2")
    .select("retry_count")
    .eq("id", dispatchJobId)
    .single();

  if (!job) throw new Error("Job not found");

  const retryCount = (job.retry_count ?? 0) + 1;
  await (supabase as any).from("dispatch_jobs_v2").update({
    retry_count: retryCount,
    dispatch_status: "open",
    updated_at: new Date().toISOString(),
  } as any).eq("id", dispatchJobId);

  return broadcastDispatchJob(dispatchJobId);
}

// ── 7. Cancel dispatch job ────────────────────────────────
export async function cancelDispatchJob(jobId: string, reason?: string) {
  await (supabase as any).from("dispatch_jobs_v2").update({
    dispatch_status: "cancelled",
    ai_dispatch_metadata: { cancel_reason: reason ?? "manual" },
    updated_at: new Date().toISOString(),
  } as any).eq("id", jobId);

  // Expire all pending offers
  await (supabase as any).from("driver_mission_offers").update({
    offer_status: "expired",
  } as any).eq("dispatch_job_id", jobId).in("offer_status", ["sent"]);

  return { ok: true };
}

// ── 8. Get dispatch job ───────────────────────────────────
export async function getDispatchJob(jobId: string) {
  const { data, error } = await (supabase as any)
    .from("dispatch_jobs_v2")
    .select("*")
    .eq("id", jobId)
    .single();
  if (error) throw error;
  return data;
}

// ── 9. Get dispatch jobs for order ────────────────────────
export async function getDispatchJobsForOrder(orderId: string) {
  const { data } = await (supabase as any)
    .from("dispatch_jobs_v2")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
