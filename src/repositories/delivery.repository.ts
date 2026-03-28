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
