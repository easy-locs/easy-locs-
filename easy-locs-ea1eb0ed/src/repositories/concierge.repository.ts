/**
 * concierge.repository — Single source of truth for all concierge DB operations.
 */
import { db, domainDb } from "@/services/db";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { assertValidBookingStatus } from "@/lib/security/enum-validators";

// ── Services ──
export async function fetchConciergeServices(orgId: string) {
  const { data, error } = await db("concierge_services").select("*").eq("org_id", orgId).order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function upsertConciergeService(record: Record<string, any>, editingId: string | null) {
  if (editingId) {
    const { error } = await db("concierge_services").update(record).eq("id", editingId);
    if (error) throw error;
  } else {
    const { error } = await db("concierge_services").insert(record);
    if (error) throw error;
  }
}

export async function deleteConciergeService(id: string) {
  const { error } = await db("concierge_services").delete().eq("id", id);
  if (error) throw error;
}

// ── Orders ──
export async function fetchConciergeOrders(orgId: string, limit = 200) {
  const { data, error } = await domainDb.commerce.from("transactions").select("*").eq("org_id", orgId).eq("transaction_type", "service_request").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function updateConciergeOrderStatus(orderId: string, status: string) {
  assertValidBookingStatus(status);
  const updates: any = { status };
  if (status === "confirmed") updates.confirmed_at = new Date().toISOString();
  if (status === "completed") updates.completed_at = new Date().toISOString();
  if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
  if (status === "refunded") updates.refunded_at = new Date().toISOString();
  const { error } = await domainDb.commerce.from("transactions").update(updates).eq("id", orderId);
  if (error) throw error;
}

export async function markConciergeOrderPaid(orderId: string) {
  const { error } = await domainDb.commerce.from("transactions").update({ payment_status: "paid" } as any).eq("id", orderId);
  if (error) throw error;
}

export async function updateConciergeOrderField(orderId: string, fields: Record<string, any>) {
  const { error } = await domainDb.commerce.from("transactions").update(fields as any).eq("id", orderId);
  if (error) throw error;
}

// ── Showcase (public) ──
export async function fetchShowcaseBySlug(slug: string) {
  const { data, error } = await db
    .from("landlord_profiles")
    .select("*, orgs!landlord_profiles_org_id_fkey(id, brand_name, logo_url, city, country, email, phone)")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchShowcaseServices(orgId: string) {
  const { data } = await db("concierge_services_public" as any).select("*").eq("org_id", orgId).order("sort_order");
  return data ?? [];
}

export async function fetchShowcaseListings(orgId: string) {
  const { data } = await db("public_listings").select("*").eq("org_id", orgId).eq("active", true).order("created_at", { ascending: false });
  return data ?? [];
}

// ── Storage ──
export async function uploadConciergeFile(bucket: string, path: string, file: File | Blob) {
  const { error } = await db.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = db.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ── Profile ──
export async function fetchLandlordProfile(orgId: string) {
  const { data } = await db("landlord_profiles").select("slug").eq("org_id", orgId).eq("active", true).limit(1).maybeSingle();
  return data;
}

export async function fetchPreferredCurrency(userId: string) {
  const { data } = await db("profiles").select("preferred_currency").eq("id", userId).single();
  return data?.preferred_currency || "EUR";
}

export async function updatePreferredCurrency(userId: string, currency: string) {
  await db("profiles").update({ preferred_currency: currency } as any).eq("id", userId);
}

// ── Realtime ──
export function subscribeConciergeOrders(orgId: string, onChange: () => void) {
  const channel = db
    .channel('concierge-orders-sync')
    .on('postgres_changes', { event: '*', schema: 'commerce', table: 'transactions', filter: `org_id=eq.${orgId}` }, (payload) => {
      const row = (payload.new ?? payload.old) as any;
      if (row?.transaction_type && row.transaction_type !== "service_request") return;
      onChange();
    })
    .subscribe();
  return () => { removeRealtimeChannel(channel); };
}

// ── Dashboard Queries (ConciergeOperations) ──
export async function fetchUserOrg(userId: string) {
  const { data: member } = await db("org_members").select("org_id").eq("user_id", userId).limit(1).single();
  if (!member) return null;
  const { data: org } = await db("orgs").select("*").eq("id", member.org_id).single();
  return org;
}

export async function fetchOrgProperties(orgId: string) {
  const { data } = await db("properties").select("id, label, city, country").eq("org_id", orgId);
  return data ?? [];
}

export async function fetchAllBookings(orgId: string) {
  const [{ data: seasonal }, { data: requests }] = await Promise.all([
    db("seasonal_bookings" as any).select("*").eq("org_id", orgId),
    domainDb.commerce.from("bookings").select("*").eq("org_id", orgId).eq("booking_type", "request").in("status", ["confirmed", "paid", "approved"]) as any,
  ]);
  const merged: any[] = [];
  const seen = new Set<string>();
  for (const b of [...(seasonal || []), ...(requests || [])] as any[]) {
    const key = `${b.property_id}-${b.check_in}-${b.check_out}-${b.guest_name}`;
    if (!seen.has(key)) { seen.add(key); merged.push(b); }
  }
  return merged;
}

export async function fetchBookingTasks(orgId: string) {
  const { data } = await db("booking_tasks").select("*").eq("org_id", orgId);
  return data ?? [];
}

// ── Merchant Orders (all orders, no org filter) ──
export async function fetchAllConciergeOrders() {
  const { data } = await domainDb.commerce.from("transactions")
    .select("id, status, guest_name, total_price, currency, created_at, notes")
    .eq("transaction_type", "service_request")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export function subscribeMerchantOrders(onInsert: (payload: any) => void) {
  const channel = db
    .channel("merchant-orders")
    .on("postgres_changes", { event: "INSERT", schema: "commerce", table: "transactions", filter: "transaction_type=eq.service_request" }, (payload) => onInsert(payload.new))
    .subscribe();
  return () => { removeRealtimeChannel(channel); };
}
