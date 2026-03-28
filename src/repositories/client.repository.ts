/**
 * client.repository — Single source of truth for client portal DB operations.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Dashboard Stats ──
export async function fetchClientBookingCounts(email: string) {
  const [seasonalRes, conciergeRes, marketplaceRes] = await Promise.all([
    supabase.from("booking_requests").select("id", { count: "exact", head: true }).eq("guest_email", email),
    supabase.from("concierge_orders").select("id", { count: "exact", head: true }).eq("guest_email", email),
    supabase.from("marketplace_bookings").select("id", { count: "exact", head: true }).eq("booker_email", email),
  ]);
  return (seasonalRes.count || 0) + (conciergeRes.count || 0) + (marketplaceRes.count || 0);
}

export async function fetchUnreadCount(userId: string) {
  const { count } = await (supabase as any)
    .from("app_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("category", "message")
    .is("read_at", null);
  return count || 0;
}

// ── Bookings ──
export async function fetchClientBookings(email: string) {
  const [{ data: seasonal }, { data: concierge }, { data: marketplace }] = await Promise.all([
    supabase.from("booking_requests").select("id, check_in, check_out, status, created_at, guest_name").eq("guest_email", email).order("created_at", { ascending: false }).limit(50),
    supabase.from("concierge_orders").select("id, service_date, total_price, currency, status, created_at, guest_name, completed_at").eq("guest_email", email).order("created_at", { ascending: false }).limit(50),
    supabase.from("marketplace_bookings").select("id, service_date, total_price, currency, status, created_at, booker_name, completed_at, service_id, provider_id, booker_email").eq("booker_email", email).order("created_at", { ascending: false }).limit(50),
  ]);
  return { seasonal: seasonal || [], concierge: concierge || [], marketplace: marketplace || [] };
}

export async function fetchReviewedBookingIds(email: string) {
  const { data } = await supabase.from("marketplace_reviews").select("booking_id").eq("reviewer_email", email);
  return new Set((data || []).map((r: any) => r.booking_id));
}

// ── Payments ──
export async function fetchClientPayments(email: string) {
  const [{ data: concierge }, { data: marketplace }] = await Promise.all([
    supabase.from("concierge_orders").select("id, service_date, total_price, currency, payment_status, status, created_at").eq("guest_email", email).order("created_at", { ascending: false }).limit(50),
    supabase.from("marketplace_bookings").select("id, service_date, total_price, currency, payment_confirmed, status, created_at").eq("booker_email", email).order("created_at", { ascending: false }).limit(50),
  ]);
  return { concierge: concierge || [], marketplace: marketplace || [] };
}

// ── Messages (legacy isolated) ──
export async function fetchClientThreads(userId: string) {
  const { data } = await (supabase as any)
    .from("chat_messages_v2")
    .select("conversation_id, body, created_at, sender_user_id, metadata")
    .order("created_at", { ascending: false })
    .limit(500);
  return data ?? [];
}

export async function fetchThreadMessages(conversationId: string) {
  const { data } = await (supabase as any)
    .from("chat_messages_v2")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  return data ?? [];
}

export async function sendClientMessage(record: Record<string, any>) {
  const { error } = await (supabase as any).from("chat_messages_v2").insert(record);
  if (error) throw error;
}

export async function uploadClientAttachment(bucket: string, path: string, file: File | Blob) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ── Activity ──
export async function fetchClientActivity(email: string, userId: string) {
  const [{ data: recentBookings }, { data: recentNotifs }] = await Promise.all([
    supabase.from("concierge_orders").select("id, status, created_at, service_date").eq("guest_email", email).order("created_at", { ascending: false }).limit(5),
    (supabase as any).from("app_notifications").select("id, title, body, created_at, category, route").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
  ]);
  return { recentBookings: recentBookings || [], recentNotifs: recentNotifs || [] };
}
