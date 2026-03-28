/**
 * marketplace.repository — Single source of truth for all marketplace DB operations.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Providers ──
export async function fetchMyProvider(orgId: string) {
  const { data } = await supabase.from("marketplace_providers").select("*").eq("org_id", orgId).limit(1).single();
  return data;
}

export async function insertProvider(record: Record<string, any>) {
  const { error } = await (supabase as any).from("marketplace_providers").insert(record);
  if (error) throw error;
}

export async function updateProvider(providerId: string, record: Record<string, any>) {
  const { error } = await supabase.from("marketplace_providers").update(record).eq("id", providerId);
  if (error) throw error;
}

export async function fetchPublicProviders(slug?: string) {
  const params: any = { p_active_only: true };
  if (slug) params.p_slug = slug;
  const { data } = await supabase.rpc("get_public_marketplace_providers", params);
  return (data || []) as any[];
}

// ── Services ──
export async function fetchMyServices(providerId: string) {
  const { data } = await supabase.from("marketplace_services").select("*").eq("provider_id", providerId).order("sort_order");
  return data || [];
}

export async function fetchPublicServices(providerId: string) {
  const { data } = await supabase.from("marketplace_services").select("*").eq("provider_id", providerId).eq("active", true).order("sort_order");
  return data || [];
}

export async function insertService(record: Record<string, any>) {
  const { data, error } = await supabase.from("marketplace_services").insert(record as any).select("id, lat, lng").single();
  if (error) throw error;
  return data;
}

export async function updateService(id: string, record: Record<string, any>) {
  const { error } = await supabase.from("marketplace_services").update(record as any).eq("id", id);
  if (error) throw error;
}

export async function deleteService(id: string) {
  const { error } = await supabase.from("marketplace_services").delete().eq("id", id);
  if (error) throw error;
}

// ── Bookings ──
export async function fetchMyBookings(orgId: string) {
  const { data } = await supabase.from("marketplace_bookings").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  return data || [];
}

export async function insertBooking(record: Record<string, any>) {
  const { data, error } = await (supabase as any).from("marketplace_bookings").insert(record).select().single();
  if (error) throw error;
  return data;
}

export async function fetchBookedDates(serviceId: string) {
  const { data } = await supabase
    .from("marketplace_bookings")
    .select("service_date, date_from, date_to, status")
    .eq("service_id", serviceId)
    .in("status", ["pending", "confirmed", "completed"]);
  return data ?? [];
}

// ── Reviews ──
export async function fetchProviderReviews(providerId: string, limit = 100) {
  const { data } = await supabase.rpc("get_provider_reviews", { p_provider_id: providerId, p_limit: limit });
  return (data || []) as any[];
}

export async function checkExistingReview(bookingId: string) {
  const { data } = await supabase.from("marketplace_reviews").select("id").eq("booking_id", bookingId).maybeSingle();
  return data;
}

export async function checkBookingStatus(bookingId: string) {
  const { data } = await supabase.from("marketplace_bookings").select("status").eq("id", bookingId).maybeSingle();
  return data;
}

export async function insertReview(record: Record<string, any>) {
  const { error } = await (supabase as any).from("marketplace_reviews").insert(record);
  if (error) throw error;
}

// ── Audit ──
export async function fetchBookingAuditLogs(orgId: string, bookingId: string) {
  const { data } = await supabase.from("audit_logs").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(50);
  return (data || []).filter((l: any) => (l.metadata_json as any)?.booking_id === bookingId);
}

export async function fetchBookingNotifications(userId: string, bookingId: string) {
  const { data } = await (supabase as any).from("app_notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
  return (data || []).filter((n: any) => (n.metadata as any)?.booking_id === bookingId);
}

export async function insertAuditLog(record: Record<string, any>) {
  await (supabase as any).from("audit_logs").insert(record);
}

// ── Storage ──
export async function uploadMarketplaceFile(bucket: string, path: string, file: File | Blob) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadBookingDocument(bucket: string, path: string, file: File | Blob) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
}
