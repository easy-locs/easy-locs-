/**
 * marketplace.repository — Single source of truth for all marketplace DB operations.
 * Optimized: targeted column selection, pagination support.
 */
import { db, domainDb } from "@/services/db";

// ── Providers ──
export async function fetchMyProvider(orgId: string) {
  const { data, error } = await db("marketplace_providers")
    .select("id, org_id, name, slug, description, logo_url, banner_url, city, country, active, rating, reviews_count, currency, vertical, contact_phone")
    .eq("org_id", orgId)
    .limit(1)
    .single();
  if (error) {
    console.error("[marketplace.repo] fetchMyProvider error:", error.message);
    throw new Error(`Failed to fetch provider: ${error.message}`);
  }
  return data;
}

export async function insertProvider(record: Record<string, any>) {
  const { error } = await db("marketplace_providers").insert(record);
  if (error) throw error;
}

export async function updateProvider(providerId: string, record: Record<string, any>) {
  const { error } = await db("marketplace_providers").update(record).eq("id", providerId);
  if (error) throw error;
}

export async function fetchPublicProviders(slug?: string, opts?: { limit?: number; offset?: number }) {
  const params: any = { p_active_only: true };
  if (slug) params.p_slug = slug;
  if (opts?.limit) params.p_limit = opts.limit;
  if (opts?.offset) params.p_offset = opts.offset;
  const { data, error } = await db.rpc("get_public_marketplace_providers", params);
  if (error) {
    console.error("[marketplace.repo] fetchPublicProviders error:", error.message);
    throw new Error(`Failed to fetch providers: ${error.message}`);
  }
  return (data || []) as any[];
}

// ── Services ──
export async function fetchMyServices(providerId: string, opts?: { limit?: number; offset?: number }) {
  let q = domainDb.marketplace.from("listings")
    .select("id, provider_id, title, description, price, currency, category, active, sort_order, photo_urls, city, country")
    .eq("provider_id", providerId)
    .order("sort_order");
  if (opts?.limit) q = q.limit(opts.limit);
  if (opts?.offset) q = q.range(opts.offset, opts.offset + (opts.limit ?? 30) - 1);
  const { data, error } = await q;
  if (error) {
    console.error("[marketplace.repo] fetchMyServices error:", error.message);
    throw new Error(`Failed to fetch services: ${error.message}`);
  }
  return data || [];
}

export async function fetchPublicServices(providerId: string) {
  const { data, error } = await domainDb.marketplace.from("listings")
    .select("id, title, description, price, currency, category, photo_urls, city, country, sort_order")
    .eq("provider_id", providerId)
    .eq("active", true)
    .order("sort_order");
  if (error) {
    console.error("[marketplace.repo] fetchPublicServices error:", error.message);
    throw new Error(`Failed to fetch public services: ${error.message}`);
  }
  return data || [];
}

export async function insertService(record: Record<string, any>) {
  const { data, error } = await domainDb.marketplace.from("listings").insert(record as any).select("id, lat, lng").single();
  if (error) throw error;
  return data;
}

export async function updateService(id: string, record: Record<string, any>) {
  const { error } = await domainDb.marketplace.from("listings").update(record as any).eq("id", id);
  if (error) throw error;
}

export async function deleteService(id: string) {
  const { error } = await domainDb.marketplace.from("listings").delete().eq("id", id);
  if (error) throw error;
}

// ── Bookings ──
export async function fetchMyBookings(orgId: string, opts?: { limit?: number; offset?: number }) {
  let q = domainDb.commerce.from("bookings")
    .select("id, org_id, service_id, status, total_price, currency, payment_confirmed, created_at, booking_type, service_date")
    .eq("org_id", orgId)
    .eq("booking_type", "marketplace")
    .order("created_at", { ascending: false });
  if (opts?.limit) q = q.limit(opts.limit);
  if (opts?.offset) q = q.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1);
  const { data, error } = await q;
  if (error) {
    console.error("[marketplace.repo] fetchMyBookings error:", error.message);
    throw new Error(`Failed to fetch bookings: ${error.message}`);
  }
  return data || [];
}

export async function insertBooking(record: Record<string, any>) {
  const { data, error } = await domainDb.commerce.from("bookings").insert({ ...record, booking_type: "marketplace" }).select().single();
  if (error) throw error;
  return data;
}

export async function fetchBookedDates(serviceId: string) {
  const { data, error } = await domainDb.commerce.from("bookings")
    .select("service_date, date_from, date_to, status")
    .eq("service_id", serviceId)
    .eq("booking_type", "marketplace")
    .in("status", ["pending", "confirmed", "completed"]);
  if (error) {
    console.error("[marketplace.repo] fetchBookedDates error:", error.message);
    throw new Error(`Failed to fetch booked dates: ${error.message}`);
  }
  return data ?? [];
}

// ── Reviews ──
export async function fetchProviderReviews(providerId: string, limit = 100) {
  const { data, error } = await db.rpc("get_provider_reviews", { p_provider_id: providerId, p_limit: limit });
  if (error) {
    console.error("[marketplace.repo] fetchProviderReviews error:", error.message);
    throw new Error(`Failed to fetch reviews: ${error.message}`);
  }
  return (data || []) as any[];
}

export async function checkExistingReview(bookingId: string) {
  const { data, error } = await db("marketplace_reviews").select("id").eq("booking_id", bookingId).maybeSingle();
  if (error) {
    console.error("[marketplace.repo] checkExistingReview error:", error.message);
    throw new Error(`Failed to check review: ${error.message}`);
  }
  return data;
}

export async function checkBookingStatus(bookingId: string) {
  const { data, error } = await domainDb.commerce.from("bookings").select("status").eq("id", bookingId).eq("booking_type", "marketplace").maybeSingle();
  if (error) {
    console.error("[marketplace.repo] checkBookingStatus error:", error.message);
    throw new Error(`Failed to check booking status: ${error.message}`);
  }
  return data;
}

export async function insertReview(record: Record<string, any>) {
  const { error } = await db("marketplace_reviews").insert(record);
  if (error) throw error;
}

// ── Audit ──
export async function fetchBookingAuditLogs(orgId: string, bookingId: string) {
  const { data, error } = await db("audit_logs")
    .select("id, action, actor_id, metadata_json, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("[marketplace.repo] fetchBookingAuditLogs error:", error.message);
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }
  return (data || []).filter((l: any) => (l.metadata_json as any)?.booking_id === bookingId);
}

export async function fetchBookingNotifications(userId: string, bookingId: string) {
  const { data, error } = await db("app_notifications")
    .select("id, title, body, metadata, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("[marketplace.repo] fetchBookingNotifications error:", error.message);
    throw new Error(`Failed to fetch notifications: ${error.message}`);
  }
  return (data || []).filter((n: any) => (n.metadata as any)?.booking_id === bookingId);
}

export async function insertAuditLog(record: Record<string, any>) {
  await db("audit_logs").insert(record);
}

// ── Storage ──
export async function uploadMarketplaceFile(bucket: string, path: string, file: File | Blob) {
  const { error } = await db.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = db.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadBookingDocument(bucket: string, path: string, file: File | Blob) {
  const { error } = await db.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
}
