/**
 * Orbit Engine Fetchers — isolated DB queries for each module.
 * Zero business logic. Pure data retrieval.
 */
import { supabase } from "@/integrations/supabase/client";
import type { CommunicationState, BusinessState, NotificationCountState, WalletCountState } from "./types";

async function safeCount(table: string, build: (q: any) => any): Promise<number> {
  try {
    const q = build(
      (supabase as any).from(table).select("id", { count: "exact", head: true })
    );
    const { count } = await q;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchCommunicationCounters(userId: string, _orgId?: string): Promise<CommunicationState> {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  let userOrbitId: string | null = null;
  try {
    const { data: orbitProfile } = await (supabase as any)
      .from("orbit_profiles_v2")
      .select("orbit_id")
      .eq("id", userId)
      .maybeSingle();
    userOrbitId = orbitProfile?.orbit_id || null;
  } catch { /* silent */ }

  const effectiveOrbitId = userOrbitId || `orbit_${userId.slice(0, 12)}`;

  const [unreadMessages, missedCalls, activeContacts] = await Promise.all([
    safeCount("chat_messages_v2", (q) =>
      q.is("read_at", null).neq("sender_user_id", userId)
    ),
    safeCount("call_logs", (q) =>
      q.eq("status", "missed")
        .gt("created_at", weekAgo)
        .eq("receiver_orbit_id", effectiveOrbitId)
    ),
    safeCount("contacts", (q) => q.eq("owner_id", userId)),
  ]);

  return { unreadMessages, missedCalls, activeContacts };
}

export async function fetchBusinessCounters(orgId?: string): Promise<BusinessState> {
  if (!orgId) return { activeListings: 0, pendingBookings: 0, newLeads: 0, pendingOrders: 0 };
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [activeListings, pendingBookings, newLeads, pendingOrders] = await Promise.all([
    safeCount("public_listings", (q) => q.eq("org_id", orgId).eq("active", true)),
    safeCount("booking_requests", (q) => q.eq("org_id", orgId).eq("status", "pending")),
    safeCount("deal_rooms", (q) => q.eq("org_id", orgId).eq("status", "inquiry").gt("created_at", weekAgo)),
    safeCount("concierge_orders", (q) => q.eq("org_id", orgId).eq("status", "pending")),
  ]);

  return { activeListings, pendingBookings, newLeads, pendingOrders };
}

export async function fetchNotificationCount(userId: string): Promise<NotificationCountState> {
  const pendingNotifications = await safeCount("app_notifications", (q) =>
    q.eq("user_id", userId).is("read_at", null).is("dismissed_at", null)
  );
  return { pendingNotifications };
}

export async function fetchWalletBalance(userId: string): Promise<WalletCountState> {
  try {
    const { data } = await supabase
      .from("wallet_accounts")
      .select("balance")
      .eq("owner_user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    return { walletBalance: (data as any)?.balance ?? 0 };
  } catch {
    return { walletBalance: 0 };
  }
}
