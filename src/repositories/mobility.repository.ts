/**
 * mobility.repository — Single source of truth for ALL mobility/delivery DB operations.
 * Tables: mobility_jobs, mobility_job_offers, rider_profiles, rider_presence,
 *         delivery_disputes, delivery_ratings, delivery_proofs,
 *         trip_live_state, trip_location_points, merchant_profiles
 */
import { supabase } from "@/integrations/supabase/client";
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
  let q = (supabase as any).from("mobility_jobs").select("*");
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
  const { data, error } = await supabase
    .from("mobility_jobs").select("*").eq("id", jobId).single();
  if (error) throw error;
  return data;
}

export async function fetchMobilityJobMaybe(jobId: string) {
  const { data } = await supabase
    .from("mobility_jobs").select("*").eq("id", jobId).single();
  return data;
}

export async function updateMobilityJob(jobId: string, updates: Record<string, any>) {
  const { error } = await supabase.from("mobility_jobs").update(updates as any).eq("id", jobId);
  if (error) throw error;
}

export async function insertMobilityJobs(jobs: Record<string, any>[]) {
  const { error } = await (supabase as any).from("mobility_jobs").insert(jobs);
  if (error) throw error;
}

// ─── Dispatch (edge function) ───
export async function invokeDispatchRide(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("dispatch-ride", { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function invokeDispatchDelivery(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("dispatch-delivery", { body });
  if (error) throw new Error(error.message);
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
  await (supabase as any).from("rider_presence").upsert(payload);
}

export async function updateRiderProfile(profileId: string, updates: Record<string, any>) {
  await (supabase as any).from("rider_profiles").update(updates).eq("id", profileId);
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
  const { error } = await (supabase as any).from("delivery_disputes").insert(payload);
  if (error) throw error;
}

export async function updateDeliveryDispute(id: string, updates: Record<string, any>) {
  const { error } = await (supabase as any).from("delivery_disputes").update(updates).eq("id", id);
  if (error) throw error;
}

// ─── Delivery Ratings ───
export async function fetchDeliveryRatings(riderUserId: string) {
  const { data } = await supabase
    .from("delivery_ratings").select("rating, created_at").eq("driver_id", riderUserId);
  return data ?? [];
}

export async function insertDeliveryRating(payload: Record<string, any>) {
  const { error } = await (supabase as any).from("delivery_ratings").insert(payload);
  if (error) throw error;
}

// ─── Delivery Proofs ───
export async function insertDeliveryProof(payload: Record<string, any>) {
  const { error } = await (supabase as any).from("delivery_proofs").insert(payload);
  if (error) throw error;
}

// ─── Delivery Offers ───
export async function insertDeliveryOffer(payload: Record<string, any>) {
  const { error } = await (supabase as any).from("delivery_offers").insert(payload);
  if (error) throw error;
}

// ─── Trip Live State ───
export async function fetchTripLiveState(jobId: string) {
  const { data } = await supabase
    .from("trip_live_state").select("*").eq("job_id", jobId).maybeSingle();
  return data;
}

export async function upsertTripLiveState(payload: Record<string, any>) {
  await (supabase as any).from("trip_live_state").upsert(payload);
}

export async function insertTripLocationPoint(payload: Record<string, any>) {
  await (supabase as any).from("trip_location_points").insert(payload);
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
  await (supabase as any).from("audit_logs").insert(payload);
}

// ─── App Notifications ───
export async function insertAppNotification(payload: Record<string, any>) {
  await (supabase as any).from("app_notifications").insert(payload);
}

// ─── User Subscriptions ───
export async function upsertUserSubscription(payload: Record<string, any>) {
  await (supabase as any).from("user_subscriptions").upsert(payload);
}

// ─── Driver Onboarding ───
export async function updateProfile(userId: string, updates: Record<string, any>) {
  await supabase.from("profiles").update(updates as any).eq("id", userId);
}

export async function uploadDocument(path: string, file: File) {
  const { error } = await supabase.storage.from("documents").upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);
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
  supabase.removeChannel(channel);
}

// ─── Orders (legacy driver mission detail) ───
export async function fetchOrderById(orderId: string) {
  const { data, error } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throw error;
  return data;
}
