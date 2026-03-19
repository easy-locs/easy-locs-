/**
 * Smart Dispatch Engine — Uber-like driver radar, auto-assignment, and delivery lifecycle.
 * Connected to unified orders, wallet splits, and Orbit events.
 */
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { getCurrencyFromCountry } from "@/lib/currency";
import { getOrCreateWalletAccount, attachDriverToSplit } from "@/lib/wallet/wallet-engine";

// ── Types ─────────────────────────────────────────────────
export type DispatchStatus =
  | "open" | "broadcasted" | "offered" | "assigned" | "accepted"
  | "driver_arriving_pickup" | "picked_up" | "in_progress"
  | "delivered" | "failed" | "cancelled" | "expired";

export interface DispatchJobInput {
  orderId: string;
  merchantProfileId: string;
  customerUserId: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  countryCode: string;
  city?: string;
  distanceKm: number;
  estimatedDurationMin?: number;
  deliveryFee: number;
  currency?: string;
  isSelfDelivery?: boolean;
}

export interface DriverCandidate {
  id: string;
  userId: string;
  distanceKm: number;
  etaMinutes: number;
  rating: number;
  acceptanceRate: number;
  activeJobs: number;
  maxActiveJobs: number;
  score: number;
  rankExplanation: string;
}

// ── Haversine distance ────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Score a driver candidate ──────────────────────────────
function scoreDriver(d: Omit<DriverCandidate, "score" | "rankExplanation">): DriverCandidate {
  const distScore = Math.max(0, 100 - d.distanceKm * 10); // 0-100
  const etaScore = Math.max(0, 100 - d.etaMinutes * 5);
  const ratingScore = (d.rating / 5) * 100;
  const acceptScore = d.acceptanceRate * 100;
  const loadScore = d.activeJobs < d.maxActiveJobs ? 100 - (d.activeJobs / d.maxActiveJobs) * 100 : 0;

  const score = distScore * 0.30 + etaScore * 0.22 + ratingScore * 0.16 + acceptScore * 0.18 + loadScore * 0.14;
  const parts = [
    `dist=${distScore.toFixed(0)}*0.30`,
    `eta=${etaScore.toFixed(0)}*0.22`,
    `rating=${ratingScore.toFixed(0)}*0.16`,
    `accept=${acceptScore.toFixed(0)}*0.18`,
    `load=${loadScore.toFixed(0)}*0.14`,
  ];

  return { ...d, score: Number(score.toFixed(2)), rankExplanation: parts.join(" + ") };
}

// ── 1. Create dispatch job ────────────────────────────────
export async function createDispatchJob(input: DispatchJobInput) {
  if (input.isSelfDelivery) {
    return { id: null, selfDelivery: true };
  }

  const currency = input.currency || getCurrencyFromCountry(input.countryCode);

  const { data, error } = await (supabase as any)
    .from("dispatch_jobs")
    .insert({
      order_id: input.orderId,
      seller_id: input.merchantProfileId,
      buyer_id: input.customerUserId,
      pickup_lat: input.pickupLat,
      pickup_lng: input.pickupLng,
      pickup_label: `Merchant ${input.merchantProfileId}`,
      dropoff_lat: input.dropoffLat,
      dropoff_lng: input.dropoffLng,
      dropoff_label: `Customer ${input.customerUserId}`,
      country_code: input.countryCode,
      city: input.city ?? null,
      distance_km: input.distanceKm,
      estimated_duration_min: input.estimatedDurationMin ?? Math.ceil(input.distanceKm * 4),
      quoted_fee: input.deliveryFee,
      currency,
      status: "open",
      retry_count: 0,
    } as any)
    .select("*")
    .single();

  if (error) throw error;

  platformBus.emit("commerce:driver_assigned", { jobId: data.id, orderId: input.orderId, stage: "dispatch_job_created" }, "system");
  return data;
}

// ── 2. Smart driver radar ─────────────────────────────────
export async function findNearbyDrivers(params: {
  pickupLat: number;
  pickupLng: number;
  countryCode: string;
  city?: string;
  radiusKm?: number;
  vehicleType?: string;
  limit?: number;
}): Promise<DriverCandidate[]> {
  const radius = params.radiusKm ?? 10;
  const limit = params.limit ?? 20;

  // Get all online, available drivers in the same country
  const { data: drivers } = await (supabase as any)
    .from("driver_profiles")
    .select("*")
    .eq("is_online", true)
    .eq("is_available", true)
    .eq("country_code", params.countryCode)
    .limit(100);

  if (!drivers?.length) return [];

  // Filter by city if specified
  let filtered = params.city
    ? drivers.filter((d: any) => !d.city || d.city === params.city)
    : drivers;

  // Filter by vehicle type
  if (params.vehicleType) {
    filtered = filtered.filter((d: any) => !d.vehicle_type || d.vehicle_type === params.vehicleType);
  }

  // Calculate distance and filter by radius
  const candidates: DriverCandidate[] = [];
  for (const d of filtered) {
    if (!d.current_lat || !d.current_lng) continue;
    const dist = haversineKm(params.pickupLat, params.pickupLng, d.current_lat, d.current_lng);
    const serviceRadius = d.service_radius_km ?? 15;
    if (dist > Math.min(radius, serviceRadius)) continue;

    const etaMin = Math.ceil((dist / 30) * 60); // ~30km/h avg city speed
    const candidate = scoreDriver({
      id: d.id,
      userId: d.user_id,
      distanceKm: Number(dist.toFixed(2)),
      etaMinutes: etaMin,
      rating: d.rating ?? 4.5,
      acceptanceRate: d.acceptance_rate ?? 0.8,
      activeJobs: d.active_jobs ?? 0,
      maxActiveJobs: d.max_active_jobs ?? 3,
    });
    candidates.push(candidate);
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, limit);
}

// ── 3. Auto-assign or broadcast ───────────────────────────
export async function dispatchToDrivers(jobId: string): Promise<{ mode: "auto_assigned" | "broadcasted" | "no_drivers"; driverId?: string }> {
  const { data: job } = await (supabase as any).from("dispatch_jobs").select("*").eq("id", jobId).single();
  if (!job) throw new Error("Dispatch job not found");

  const candidates = await findNearbyDrivers({
    pickupLat: job.pickup_lat,
    pickupLng: job.pickup_lng,
    countryCode: job.country_code ?? "AE",
    city: job.city,
  });

  if (!candidates.length) {
    await (supabase as any).from("dispatch_jobs").update({ status: "expired", ranking_snapshot: { reason: "no_drivers" } } as any).eq("id", jobId);
    return { mode: "no_drivers" };
  }

  const best = candidates[0];
  const confidenceThreshold = 70;

  // Save ranking snapshot
  await (supabase as any).from("dispatch_jobs").update({
    ranking_snapshot: { candidates: candidates.slice(0, 5), topScore: best.score },
  } as any).eq("id", jobId);

  if (best.score >= confidenceThreshold) {
    // Auto-assign
    await assignDriverToJob(jobId, best.id, best.userId);
    return { mode: "auto_assigned", driverId: best.userId };
  }

  // Broadcast to top 5
  await (supabase as any).from("dispatch_jobs").update({ status: "broadcasted" } as any).eq("id", jobId);

  for (const c of candidates.slice(0, 5)) {
    await (supabase as any).from("dispatch_offers").insert({
      job_id: jobId,
      driver_profile_id: c.id,
      driver_user_id: c.userId,
      offer_status: "pending",
      score: c.score,
      eta_minutes: c.etaMinutes,
      distance_km: c.distanceKm,
      expires_at: new Date(Date.now() + 30_000).toISOString(), // 30s timeout
    } as any);
  }

  return { mode: "broadcasted" };
}

// ── 4. Assign driver to job ───────────────────────────────
export async function assignDriverToJob(jobId: string, driverProfileId: string, driverUserId: string) {
  const { data: job } = await (supabase as any).from("dispatch_jobs").select("*").eq("id", jobId).single();
  if (!job) throw new Error("Job not found");
  if (job.assigned_driver_id) throw new Error("Job already assigned");

  // Get driver wallet
  const driverWallet = await getOrCreateWalletAccount({
    ownerType: "driver",
    ownerUserId: driverUserId,
    countryCode: job.country_code ?? "AE",
  });

  // Update dispatch job
  await (supabase as any).from("dispatch_jobs").update({
    assigned_driver_id: driverUserId,
    assigned_driver_wallet_id: driverWallet.id,
    status: "assigned",
  } as any).eq("id", jobId);

  // Attach driver to order + wallet split
  if (job.order_id) {
    await attachDriverToSplit({
      orderId: job.order_id,
      driverWalletId: driverWallet.id,
      deliveryFee: Number(job.quoted_fee ?? 0),
    });
  }

  // Reject other offers
  await (supabase as any).from("dispatch_offers").update({ offer_status: "rejected" } as any)
    .eq("job_id", jobId).neq("driver_user_id", driverUserId);

  platformBus.emit("commerce:driver_assigned", {
    jobId, orderId: job.order_id, driverId: driverUserId, stage: "driver_assigned",
  }, "system");

  return { ok: true, driverWalletId: driverWallet.id };
}

// ── 5. Driver accept offer ────────────────────────────────
export async function driverAcceptOffer(offerId: string) {
  const { data: offer } = await (supabase as any).from("dispatch_offers").select("*").eq("id", offerId).single();
  if (!offer) throw new Error("Offer not found");
  if (offer.offer_status !== "pending") throw new Error("Offer no longer available");

  // Check job still unassigned (race safety)
  const { data: job } = await (supabase as any).from("dispatch_jobs").select("assigned_driver_id").eq("id", offer.job_id).single();
  if (job?.assigned_driver_id) throw new Error("Job already taken");

  await (supabase as any).from("dispatch_offers").update({ offer_status: "accepted" } as any).eq("id", offerId);
  await assignDriverToJob(offer.job_id, offer.driver_profile_id, offer.driver_user_id);

  return { ok: true };
}

// ── 6. Driver decline offer ───────────────────────────────
export async function driverDeclineOffer(offerId: string) {
  await (supabase as any).from("dispatch_offers").update({ offer_status: "declined" } as any).eq("id", offerId);
  return { ok: true };
}

// ── 7. Update dispatch status ─────────────────────────────
export async function updateDispatchStatus(jobId: string, status: DispatchStatus) {
  const patch: Record<string, any> = { status };
  if (status === "picked_up") patch.picked_up_at = new Date().toISOString();
  if (status === "delivered") patch.completed_at = new Date().toISOString();
  if (status === "driver_arriving_pickup") patch.driver_arriving_at = new Date().toISOString();

  await (supabase as any).from("dispatch_jobs").update(patch as any).eq("id", jobId);

  // Emit Orbit event
  const eventMap: Record<string, string> = {
    picked_up: "delivery.picked_up",
    in_progress: "delivery.in_progress",
    delivered: "delivery.delivered",
    failed: "delivery.failed",
    cancelled: "commerce:order_cancelled",
  };

  if (eventMap[status]) {
    platformBus.emit(eventMap[status] as any, { jobId, status, stage: status }, "system");
  }

  return { ok: true };
}

// ── 8. Retry dispatch (expand radius / rebroadcast) ───────
export async function retryDispatch(jobId: string): Promise<{ mode: "auto_assigned" | "broadcasted" | "no_drivers"; driverId?: string }> {
  const { data: job } = await (supabase as any).from("dispatch_jobs").select("*").eq("id", jobId).single();
  if (!job) throw new Error("Job not found");

  const retryCount = (job.retry_count ?? 0) + 1;
  await (supabase as any).from("dispatch_jobs").update({ retry_count: retryCount, status: "open" } as any).eq("id", jobId);

  return dispatchToDrivers(jobId);
}

// ── 9. Cancel dispatch job ────────────────────────────────
export async function cancelDispatchJob(jobId: string, reason?: string) {
  await (supabase as any).from("dispatch_jobs").update({
    status: "cancelled",
    ranking_snapshot: { cancel_reason: reason ?? "manual" },
  } as any).eq("id", jobId);

  // Reject all pending offers
  await (supabase as any).from("dispatch_offers").update({ offer_status: "cancelled" } as any)
    .eq("job_id", jobId).eq("offer_status", "pending");

  return { ok: true };
}

// ── 10. Get dispatch job details ──────────────────────────
export async function getDispatchJob(jobId: string) {
  const { data, error } = await (supabase as any).from("dispatch_jobs").select("*").eq("id", jobId).single();
  if (error) throw error;
  return data;
}

// ── 11. Get dispatch jobs for order ───────────────────────
export async function getDispatchJobsForOrder(orderId: string) {
  const { data } = await (supabase as any).from("dispatch_jobs").select("*").eq("order_id", orderId).order("created_at", { ascending: false });
  return data ?? [];
}
