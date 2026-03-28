/**
 * client-portal.repository — All DB operations for client portal pages.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Dashboard Stats ──
export async function fetchClientStats(email: string, userId: string) {
  const [seasonalRes, conciergeRes, marketplaceRes] = await Promise.all([
    supabase.from("booking_requests").select("id", { count: "exact", head: true }).eq("guest_email", email),
    supabase.from("concierge_orders").select("id", { count: "exact", head: true }).eq("guest_email", email),
    supabase.from("marketplace_bookings").select("id", { count: "exact", head: true }).eq("booker_email", email),
  ]);
  const bookingCount = (seasonalRes.count || 0) + (conciergeRes.count || 0) + (marketplaceRes.count || 0);

  const { count: unreadCount } = await (supabase as any)
    .from("app_notifications").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("category", "message").is("read_at", null);

  const [{ count: paidConcierge }, { count: paidMarketplace }] = await Promise.all([
    supabase.from("concierge_orders").select("id", { count: "exact", head: true }).eq("guest_email", email).eq("payment_status", "paid"),
    supabase.from("marketplace_bookings").select("id", { count: "exact", head: true }).eq("booker_email", email).eq("payment_confirmed", true),
  ]);

  let docCount = 0;
  const { data: tenantLinks } = await supabase.from("tenants").select("id").eq("tenant_user_id", userId);
  if (tenantLinks && tenantLinks.length > 0) {
    const { count } = await supabase.from("documents").select("id", { count: "exact", head: true })
      .in("tenant_id", tenantLinks.map(tl => tl.id));
    docCount = count || 0;
  }

  return {
    bookings: bookingCount,
    messages: unreadCount || 0,
    documents: docCount,
    payments: (paidConcierge || 0) + (paidMarketplace || 0),
  };
}

export async function fetchClientTimeline(email: string, userId: string) {
  const [{ data: recentBookings }, { data: recentConcierge }, { data: recentMsgs }] = await Promise.all([
    supabase.from("marketplace_bookings")
      .select("id, service_date, status, created_at, marketplace_services(title)")
      .eq("booker_email", email).order("created_at", { ascending: false }).limit(5),
    supabase.from("concierge_orders")
      .select("id, service_date, status, total_price, currency, created_at")
      .eq("guest_email", email).order("created_at", { ascending: false }).limit(5),
    (supabase as any).from("chat_messages_v2")
      .select("id, body, sender_user_id, created_at, metadata")
      .eq("sender_user_id", userId).order("created_at", { ascending: false }).limit(3),
  ]);
  return { recentBookings: recentBookings || [], recentConcierge: recentConcierge || [], recentMsgs: recentMsgs || [] };
}

// ── Bookings ──
export async function fetchClientAllBookings(email: string) {
  const [{ data: seasonal }, { data: concierge }, { data: marketplace }] = await Promise.all([
    supabase.from("booking_requests").select("id, guest_name, check_in, check_out, status, created_at").eq("guest_email", email).order("created_at", { ascending: false }).limit(50),
    supabase.from("concierge_orders").select("id, guest_name, service_date, status, total_price, currency, created_at").eq("guest_email", email).order("created_at", { ascending: false }).limit(50),
    supabase.from("marketplace_bookings").select("id, booker_name, booker_email, service_date, status, total_price, currency, created_at, completed_at, service_id, provider_id, marketplace_services(title)").eq("booker_email", email).order("created_at", { ascending: false }).limit(50),
  ]);
  return { seasonal: seasonal || [], concierge: concierge || [], marketplace: marketplace || [] };
}

export async function fetchReviewedBookingIds(bookingIds: string[]) {
  if (bookingIds.length === 0) return new Set<string>();
  const { data } = await supabase.from("marketplace_reviews").select("booking_id").in("booking_id", bookingIds);
  return new Set((data || []).map((r: any) => r.booking_id).filter(Boolean));
}

// ── Payments ──
export async function fetchClientPayments(email: string) {
  const [{ data: concierge }, { data: marketplace }] = await Promise.all([
    supabase.from("concierge_orders").select("id, service_date, total_price, currency, payment_status, status, created_at").eq("guest_email", email).order("created_at", { ascending: false }).limit(50),
    supabase.from("marketplace_bookings").select("id, service_date, total_price, currency, payment_confirmed, status, created_at").eq("booker_email", email).order("created_at", { ascending: false }).limit(50),
  ]);
  return { concierge: concierge || [], marketplace: marketplace || [] };
}

// ── Messages ──
export async function fetchClientMessagesByEmail(email: string) {
  const { data } = await (supabase as any)
    .from("chat_messages_v2")
    .select("conversation_id, sender_user_id, body, created_at, metadata")
    .eq("metadata->>contact_email", email.toLowerCase())
    .order("created_at", { ascending: false }).limit(500);
  return data || [];
}

export async function fetchClientMessagesBySender(userId: string) {
  const { data } = await (supabase as any)
    .from("chat_messages_v2")
    .select("conversation_id, sender_user_id, body, created_at, metadata")
    .eq("sender_user_id", userId)
    .order("created_at", { ascending: false }).limit(500);
  return data || [];
}

export async function fetchConversationPrefs(userId: string) {
  const { data } = await supabase.from("conversation_preferences").select("context_id, muted, archived").eq("user_id", userId);
  return data || [];
}

export async function fetchBlockedUsers(userId: string) {
  const { data } = await supabase.from("blocked_users").select("blocked_id").eq("blocker_id", userId);
  return (data || []).map((b: any) => b.blocked_id);
}

export async function fetchThreadMessages(conversationId: string) {
  const { data } = await (supabase as any)
    .from("chat_messages_v2").select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return data || [];
}

export async function insertClientMessage(record: Record<string, any>) {
  const { data, error } = await (supabase as any).from("chat_messages_v2").insert(record).select("*").single();
  if (error) throw error;
  return data;
}

export async function uploadClientMedia(orgId: string, contextId: string, file: File) {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${orgId}/${contextId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("chat-media").upload(path, file);
  if (error) throw error;
  const { data } = await supabase.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl || path;
}

export function subscribeToThread(conversationId: string, onInsert: (msg: any) => void, onUpdate: (msg: any) => void) {
  const channel = supabase
    .channel(`client-thread-v2-${conversationId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages_v2", filter: `conversation_id=eq.${conversationId}` }, (payload) => onInsert(payload.new))
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages_v2", filter: `conversation_id=eq.${conversationId}` }, (payload) => onUpdate(payload.new))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
