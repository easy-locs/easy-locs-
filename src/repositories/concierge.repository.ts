/**
 * concierge.repository — Single source of truth for all concierge DB operations.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Services ──
export async function fetchConciergeServices(orgId: string) {
  const { data, error } = await supabase.from("concierge_services").select("*").eq("org_id", orgId).order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function upsertConciergeService(record: Record<string, any>, editingId: string | null) {
  if (editingId) {
    const { error } = await (supabase as any).from("concierge_services").update(record).eq("id", editingId);
    if (error) throw error;
  } else {
    const { error } = await (supabase as any).from("concierge_services").insert(record);
    if (error) throw error;
  }
}

export async function deleteConciergeService(id: string) {
  const { error } = await supabase.from("concierge_services").delete().eq("id", id);
  if (error) throw error;
}

// ── Orders ──
export async function fetchConciergeOrders(orgId: string, limit = 200) {
  const { data, error } = await supabase.from("concierge_orders").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function updateConciergeOrderStatus(orderId: string, status: string) {
  const updates: any = { status };
  if (status === "confirmed") updates.confirmed_at = new Date().toISOString();
  if (status === "completed") updates.completed_at = new Date().toISOString();
  if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
  if (status === "refunded") updates.refunded_at = new Date().toISOString();
  const { error } = await supabase.from("concierge_orders").update(updates).eq("id", orderId);
  if (error) throw error;
}

export async function markConciergeOrderPaid(orderId: string) {
  const { error } = await supabase.from("concierge_orders").update({ payment_status: "paid" } as any).eq("id", orderId);
  if (error) throw error;
}

export async function updateConciergeOrderField(orderId: string, fields: Record<string, any>) {
  const { error } = await supabase.from("concierge_orders").update(fields as any).eq("id", orderId);
  if (error) throw error;
}

// ── Showcase (public) ──
export async function fetchShowcaseBySlug(slug: string) {
  const { data, error } = await supabase
    .from("landlord_profiles")
    .select("*, orgs!landlord_profiles_org_id_fkey(id, brand_name, logo_url, city, country, email, phone)")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchShowcaseServices(orgId: string) {
  const { data } = await supabase.from("concierge_services_public" as any).select("*").eq("org_id", orgId).order("sort_order");
  return data ?? [];
}

export async function fetchShowcaseListings(orgId: string) {
  const { data } = await supabase.from("public_listings").select("*").eq("org_id", orgId).eq("active", true).order("created_at", { ascending: false });
  return data ?? [];
}

// ── Storage ──
export async function uploadConciergeFile(bucket: string, path: string, file: File | Blob) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ── Profile ──
export async function fetchLandlordProfile(orgId: string) {
  const { data } = await supabase.from("landlord_profiles").select("slug").eq("org_id", orgId).eq("active", true).limit(1).maybeSingle();
  return data;
}

export async function fetchPreferredCurrency(userId: string) {
  const { data } = await supabase.from("profiles").select("preferred_currency").eq("id", userId).single();
  return data?.preferred_currency || "EUR";
}

export async function updatePreferredCurrency(userId: string, currency: string) {
  await supabase.from("profiles").update({ preferred_currency: currency } as any).eq("id", userId);
}

// ── Realtime ──
export function subscribeConciergeOrders(orgId: string, onChange: () => void) {
  const channel = supabase
    .channel('concierge-orders-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'concierge_orders', filter: `org_id=eq.${orgId}` }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ── Dashboard Queries (ConciergeOperations) ──
export async function fetchUserOrg(userId: string) {
  const { data: member } = await supabase.from("org_members").select("org_id").eq("user_id", userId).limit(1).single();
  if (!member) return null;
  const { data: org } = await supabase.from("orgs").select("*").eq("id", member.org_id).single();
  return org;
}

export async function fetchOrgProperties(orgId: string) {
  const { data } = await supabase.from("properties").select("id, label, city, country").eq("org_id", orgId);
  return data ?? [];
}

export async function fetchAllBookings(orgId: string) {
  const [{ data: seasonal }, { data: requests }] = await Promise.all([
    supabase.from("seasonal_bookings" as any).select("*").eq("org_id", orgId),
    supabase.from("booking_requests").select("*").eq("org_id", orgId).in("status", ["confirmed", "paid", "approved"]) as any,
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
  const { data } = await supabase.from("booking_tasks").select("*").eq("org_id", orgId);
  return data ?? [];
}

// ── Merchant Orders (all orders, no org filter) ──
export async function fetchAllConciergeOrders() {
  const { data } = await supabase
    .from("concierge_orders")
    .select("id, status, guest_name, total_price, currency, created_at, notes")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export function subscribeMerchantOrders(onInsert: (payload: any) => void) {
  const channel = supabase
    .channel("merchant-orders")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "concierge_orders" }, (payload) => onInsert(payload.new))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
