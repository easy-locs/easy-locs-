/**
 * mobility.repository — Single source of truth for ALL mobility/delivery DB operations.
 * Tables: mobility_jobs, mobility_job_offers, rider_profiles, rider_presence,
 *         delivery_disputes, delivery_ratings, delivery_proofs,
 *         trip_live_state, trip_location_points, merchant_profiles
 */
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { getCurrentUserIdOrNull } from "@/families/identity";

// Re-export for backward compatibility — consumers should migrate to @/families/identity
export const getCurrentUserId = getCurrentUserIdOrNull;

// ─── Mobility Jobs ───
export async function fetchMobilityJobs(filters: {
  riderUserId?: string;
  customerUserId?: string;
  merchantId?: string;
  statuses?: string[];
  notStatuses?: string[];
  jobTypes?: string[];
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
}) {
  let q = db("mobility_jobs").select("*");
  if (filters.riderUserId) q = q.eq("rider_user_id", filters.riderUserId);
  if (filters.customerUserId) q = q.eq("customer_user_id", filters.customerUserId);
  if (filters.merchantId) q = q.eq("merchant_id", filters.merchantId);
  if (filters.statuses?.length) q = q.in("status", filters.statuses);
  if (filters.notStatuses?.length) {
    for (const s of filters.notStatuses) q = q.neq("status", s);
  }
  if (filters.jobTypes?.length) q = q.in("job_type", filters.jobTypes);
  q = q.order(filters.orderBy || "created_at", { ascending: filters.ascending ?? false });
  if (filters.limit) q = q.limit(filters.limit);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchMobilityJobById(jobId: string) {
  const { data, error } = await db("mobility_jobs").select("*").eq("id", jobId).single();
  if (error) throw error;
  return data;
}

export async function fetchMobilityJobMaybe(jobId: string) {
  const { data } = await db("mobility_jobs").select("*").eq("id", jobId).single();
  return data;
}

export async function updateMobilityJob(jobId: string, updates: Record<string, any>) {
  const { error } = await db("mobility_jobs").update(updates as any).eq("id", jobId);
  if (error) throw error;
}

export async function insertMobilityJobs(jobs: Record<string, any>[]) {
  const { error } = await db("mobility_jobs").insert(jobs);
  if (error) throw error;
}

// ─── Dispatch (edge function with DB fallback for transport errors) ───
function isTransportError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || err).toLowerCase();
  return msg.includes("failed to send") || msg.includes("fetch") ||
    msg.includes("networkerror") || msg.includes("edge function") ||
    msg.includes("typeerror") || msg.includes("aborted") ||
    msg.includes("econnrefused") || msg.includes("timeout") ||
    msg.includes("relay") || msg.includes("503") || msg.includes("502");
}

export async function invokeDispatchRide(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("dispatch-ride", { body });
  if (error) {
    if (isTransportError(error) && body.action === "create_job") {
      return createJobFallback(body);
    }
    throw new Error(error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

async function createJobFallback(body: Record<string, any>) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Authentication required");

  const confirmationCode = String(Math.floor(100000 + Math.random() * 900000));
  const isScheduled = body.booking_mode === "scheduled";

  let dispatchWindowStart: string | null = null;
  let dispatchWindowEnd: string | null = null;
  if (isScheduled && body.scheduled_for) {
    const sf = new Date(body.scheduled_for);
    dispatchWindowStart = new Date(sf.getTime() - 15 * 60 * 1000).toISOString();
    dispatchWindowEnd = new Date(sf.getTime() + 5 * 60 * 1000).toISOString();
  }

  const { data: job, error } = await db("mobility_jobs").insert({
    job_type: body.job_type,
    service_level: body.service_level,
    customer_user_id: userId,
    merchant_id: body.merchant_id || null,
    order_id: body.order_id || null,
    status: isScheduled ? "scheduled" : "searching",
    dispatch_status: isScheduled ? "pending" : "dispatching",
    booking_mode: body.booking_mode || "now",
    scheduled_for: isScheduled ? body.scheduled_for : null,
    dispatch_window_start: dispatchWindowStart,
    dispatch_window_end: dispatchWindowEnd,
    pickup_label: body.pickup_label || null,
    pickup_address: body.pickup_address || "",
    pickup_lat: body.pickup_lat,
    pickup_lng: body.pickup_lng,
    dropoff_label: body.dropoff_label || null,
    dropoff_address: body.dropoff_address || "",
    dropoff_lat: body.dropoff_lat,
    dropoff_lng: body.dropoff_lng,
    seats_requested: body.seats_requested || null,
    package_size: body.package_size || null,
    notes: body.notes || null,
    quoted_price: body.quoted_price || 0,
    current_price: body.quoted_price || 0,
    currency: body.currency || "AED",
    confirmation_code: confirmationCode,
    search_radius_km: 2.0,
    dispatch_attempt_count: 0,
  }).select().single();

  if (error) throw new Error(`Create job failed: ${error.message}`);
  return { success: true, job, confirmation_code: confirmationCode, dispatch: { offered: 0 }, booking_mode: isScheduled ? "scheduled" : "now" };
}

export async function invokeDispatchDelivery(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("dispatch-delivery", { body });
  if (error) {
    if (isTransportError(error) && body.action === "create_job") {
      return createJobFallback(body);
    }
    throw new Error(error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

// ─── Rider Profiles & Presence ───
export async function fetchRiderProfile(userId: string) {
  const { data } = await supabase
    .from("rider_profiles")
    .select("id, vehicle_type, rider_mode, is_online, is_available")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function fetchRiderPresence(riderProfileId: string) {
  const { data } = await supabase
    .from("rider_presence").select("*").eq("rider_profile_id", riderProfileId).maybeSingle();
  return data;
}

export async function upsertRiderPresence(payload: Record<string, any>) {
  await db("rider_presence").upsert(payload);
}

export async function updateRiderProfile(profileId: string, updates: Record<string, any>) {
  await db("rider_profiles").update(updates).eq("id", profileId);
}

export async function fetchOnlineRiders(limit = 20) {
  const { data } = await supabase
    .from("rider_presence").select("*").eq("is_online", true).limit(limit);
  return data ?? [];
}

export async function fetchAvailableRiders(limit = 20) {
  const { data } = await supabase
    .from("rider_presence").select("*").eq("is_online", true).eq("is_available", true).limit(limit);
  return data ?? [];
}

export async function fetchRiderPresenceByUserId(userId: string) {
  const { data } = await supabase
    .from("rider_presence").select("lat, lng, vehicle_type").eq("user_id", userId).maybeSingle();
  return data;
}

// ─── Job Offers ───
export async function fetchPendingOffers(riderUserId: string) {
  const { data } = await supabase
    .from("mobility_job_offers")
    .select("*, job:mobility_jobs(*)")
    .eq("rider_user_id", riderUserId)
    .in("status", ["pending"])
    .order("offered_at", { ascending: false });
  return data ?? [];
}

// ─── Delivery Disputes ───
export async function fetchDeliveryDisputes(orgId: string, limit = 100) {
  const { data } = await supabase
    .from("delivery_disputes").select("*").eq("org_id", orgId)
    .order("created_at", { ascending: false }).limit(limit);
  return data ?? [];
}

export async function insertDeliveryDispute(payload: Record<string, any>) {
  const { error } = await db("delivery_disputes").insert(payload);
  if (error) throw error;
}

export async function updateDeliveryDispute(id: string, updates: Record<string, any>) {
  const { error } = await db("delivery_disputes").update(updates).eq("id", id);
  if (error) throw error;
}

// ─── Delivery Ratings ───
export async function fetchDeliveryRatings(riderUserId: string) {
  const { data } = await supabase
    .from("delivery_ratings").select("rating, created_at").eq("driver_id", riderUserId);
  return data ?? [];
}

export async function insertDeliveryRating(payload: Record<string, any>) {
  const { error } = await db("delivery_ratings").insert(payload);
  if (error) throw error;
}

// ─── Delivery Proofs ───
export async function insertDeliveryProof(payload: Record<string, any>) {
  const { error } = await db("delivery_proofs").insert(payload);
  if (error) throw error;
}

// ─── Delivery Offers ───
export async function insertDeliveryOffer(payload: Record<string, any>) {
  const { error } = await db("delivery_offers").insert(payload);
  if (error) throw error;
}

// ─── Trip Live State ───
export async function fetchTripLiveState(jobId: string) {
  const { data } = await supabase
    .from("trip_live_state").select("*").eq("job_id", jobId).maybeSingle();
  return data;
}

export async function upsertTripLiveState(payload: Record<string, any>) {
  await db("trip_live_state").upsert(payload);
}

export async function insertTripLocationPoint(payload: Record<string, any>) {
  await db("trip_location_points").insert(payload);
}

// ─── Merchant Profiles ───
export async function fetchMerchantProfileByUserId(userId: string) {
  const { data } = await supabase
    .from("merchant_profiles").select("id").eq("user_id", userId).maybeSingle();
  return data;
}

// ─── Profiles (name resolution) ───
export async function fetchProfileNames(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>();
  const { data } = await supabase
    .from("profiles").select("id, name, first_name, last_name").in("id", userIds);
  const map = new Map<string, string>();
  (data ?? []).forEach((p: any) => {
    map.set(p.id, p.name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "");
  });
  return map;
}

// ─── Audit Logs ───
export async function insertAuditLog(payload: Record<string, any>) {
  await db("audit_logs").insert(payload);
}

// ─── App Notifications ───
export async function insertAppNotification(payload: Record<string, any>) {
  await db("app_notifications").insert(payload);
}

// ─── User Subscriptions ───
export async function upsertUserSubscription(payload: Record<string, any>) {
  await db("user_subscriptions").upsert(payload);
}

// ─── Driver Onboarding ───
export async function updateProfile(userId: string, updates: Record<string, any>) {
  await db("profiles").update(updates as any).eq("id", userId);
}

export async function uploadDocument(path: string, file: File) {
  const { error } = await db.storage.from("documents").upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = db.storage.from("documents").getPublicUrl(path);
  return publicUrl;
}

// ─── Realtime helpers ───
export function subscribeToTable(channelName: string, table: string, filter: string, callback: (payload: any) => void) {
  const ch = supabase
    .channel(channelName)
    .on("postgres_changes", { event: "*", schema: "public", table, filter }, callback)
    .subscribe();
  return ch;
}

export function unsubscribeChannel(channel: any) {
  removeRealtimeChannel(channel);
}

// ─── Orders (legacy driver mission detail) ───
export async function fetchOrderById(orderId: string) {
  const { data, error } = await db("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throw error;
  return data;
}
