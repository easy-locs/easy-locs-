/**
 * delivery.repository — All DB ops for delivery components.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Disputes ──
export async function fetchDisputes() {
  const { data } = await supabase.from("delivery_disputes").select("*").order("created_at", { ascending: false }).limit(50);
  return data ?? [];
}

export async function updateDispute(id: string, updates: Record<string, any>) {
  const { error } = await (supabase as any).from("delivery_disputes").update(updates).eq("id", id);
  if (error) throw error;
}

export async function insertAuditLog(record: Record<string, any>) {
  await (supabase as any).from("audit_logs").insert(record);
}

export async function fetchProfilesByIds(ids: string[]) {
  const { data } = await supabase.from("profiles").select("id, name, first_name, last_name").in("id", ids);
  return data ?? [];
}

// ── Escrow ──
export async function invokeDispatchDelivery(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("dispatch-delivery", { body });
  if (error) throw error;
  return data;
}

// ── Ratings ──
export async function insertDeliveryRating(record: Record<string, any>) {
  const { error } = await (supabase as any).from("delivery_ratings").insert(record);
  if (error) throw error;
}

// ── Driver analytics ──
export async function fetchDriverJobs(userId: string) {
  const { data } = await (supabase as any).from("mobility_jobs").select("id, status, current_price, quoted_price, currency, created_at, completed_at").eq("rider_user_id", userId).order("created_at", { ascending: false }).limit(200);
  return data ?? [];
}

export async function fetchDriverRatings(userId: string) {
  const { data } = await (supabase as any).from("delivery_ratings").select("rating, created_at").eq("driver_user_id", userId);
  return data ?? [];
}

// ── Offers ──
export async function insertDeliveryOffer(record: Record<string, any>) {
  const { error } = await (supabase as any).from("delivery_offers").insert(record);
  if (error) throw error;
}

// ── Onboarding ──
export async function updateDriverProfile(userId: string, updates: Record<string, any>) {
  const { error } = await supabase.from("profiles").update(updates as any).eq("id", userId);
  if (error) throw error;
}

export async function uploadDriverDocument(path: string, file: File) {
  const { error } = await supabase.storage.from("documents").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("documents").getPublicUrl(path);
  return data.publicUrl;
}

// ── Multi-stop ──
export async function insertMobilityJobs(jobs: Record<string, any>[]) {
  const { error } = await (supabase as any).from("mobility_jobs").insert(jobs);
  if (error) throw error;
}

// ── Parcel ──
export async function insertParcelDetails(record: Record<string, any>) {
  await (supabase as any).from("parcel_job_details").insert(record);
}

// ── Proof ──
export async function invokeProofOfDelivery(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("dispatch-delivery", { body });
  if (error) throw error;
  return data;
}

// ── Live Tracking ──
export async function insertLiveTracking(record: Record<string, any>) {
  const { data, error } = await supabase.from("live_trackings").insert(record as any).select().single();
  if (error) throw error;
  return (data as any).id;
}

export async function updateLiveTracking(id: string, updates: Record<string, any>) {
  await supabase.from("live_trackings").update(updates as any).eq("id", id);
}

export async function fetchLiveTracking(id: string) {
  const { data } = await supabase.from("live_trackings").select("*").eq("id", id).single();
  return data;
}

export function subscribeLiveTracking(trackingId: string, onUpdate: (data: any) => void) {
  const channel = supabase
    .channel(`tracking-${trackingId}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_trackings", filter: `id=eq.${trackingId}` }, (payload) => onUpdate(payload.new))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export async function findActiveTracking(contextType: string, contextId: string): Promise<string | null> {
  const { data } = await supabase
    .from("live_trackings")
    .select("id")
    .eq("context_type", contextType)
    .eq("context_id", contextId)
    .in("status", ["pending", "en_route", "nearby", "arrived"] as any)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any)?.id || null;
}

// ── Buyer orders ──
export async function fetchBuyerOrders(userId: string) {
  const { data } = await (supabase as any)
    .from("mobility_jobs")
    .select("id, status, pickup_address, dropoff_address, dropoff_lat, dropoff_lng, package_description, delivery_fee, currency, created_at, delivered_at, scheduled_at, confirmation_code, escrow_status, escrow_amount")
    .eq("buyer_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

// ── Available jobs (marketplace) ──
export async function fetchAvailableJobs() {
  const { data } = await (supabase as any)
    .from("mobility_jobs")
    .select("id, pickup_address, dropoff_address, notes, current_price, currency, package_size, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, created_at, status")
    .in("status", ["pending", "open"])
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function acceptJob(jobId: string, userId: string) {
  const { error } = await (supabase as any)
    .from("mobility_jobs")
    .update({ rider_user_id: userId, status: "accepted" })
    .eq("id", jobId);
  if (error) throw error;
}

// ── Rider presence ──
export async function upsertRiderPresence(record: Record<string, any>) {
  const { error } = await (supabase as any).from("rider_presence").upsert(record, { onConflict: "user_id" });
  if (error) throw error;
}

// ── Pending jobs (batch) ──
export async function fetchPendingJobsForBatch() {
  const { data } = await (supabase as any)
    .from("mobility_jobs")
    .select("id, pickup_address, dropoff_address, dropoff_lat, dropoff_lng, pickup_lat, pickup_lng, notes, current_price, currency, package_size, status")
    .in("status", ["pending", "open"])
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function batchAssignJobs(jobIds: string[], userId: string) {
  const { error } = await (supabase as any)
    .from("mobility_jobs")
    .update({ rider_user_id: userId, status: "accepted" })
    .in("id", jobIds);
  if (error) throw error;
}

// ── Proof photo upload ──
export async function uploadProofPhoto(path: string, file: Blob) {
  const { error } = await supabase.storage.from("delivery-proofs").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("delivery-proofs").getPublicUrl(path);
  return data.publicUrl;
}
