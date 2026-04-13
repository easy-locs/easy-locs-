/**
 * Orbit Engine Fetchers — isolated DB queries for each module.
 * Zero business logic. Pure data retrieval.
 *
 * SSOT rules enforced here:
 *   - walletBalance → reads useWalletStore first, DB fallback when store not hydrated
 *   - pendingNotifications → reads useNotificationStore first, triggers hydration if needed
 */
import { db } from "@/services/db";
import { useWalletStore } from "@/stores/walletStore";
import { useNotificationStore } from "@/stores/notification.store";
import type { CommunicationState, BusinessState, NotificationCountState, WalletCountState } from "./types";

async function safeCount(table: string, build: (q: any) => any): Promise<number> {
  try {
    const q = build(
      db(table).select("id", { count: "exact", head: true })
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
    const { data: orbitProfile } = await db
      .from("orbit_profiles_v2")
      .select("orbit_id")
      .eq("id", userId)
      .maybeSingle();
    userOrbitId = orbitProfile?.orbit_id || null;
  } catch { /* silent */ }

  const effectiveOrbitId = userOrbitId || `orbit_${userId.replace(/-/g, "").substring(0, 8)}`;

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

/**
 * SSOT: reads useNotificationStore (notifications_v2 table).
 * Falls back to triggering hydration if store not yet populated.
 * Previously read app_notifications — corrected to canonical table.
 */
export async function fetchNotificationCount(userId: string): Promise<NotificationCountState> {
  const store = useNotificationStore.getState();

  // If store is already hydrated, return its count directly (no DB round-trip)
  if ((store as any).hydrated || store.notifications?.length > 0) {
    return { pendingNotifications: store.unreadCount };
  }

  // Store not yet hydrated — trigger async hydration and return 0 as provisional value.
  // Next engine refresh cycle will pick up the real count.
  if (typeof store.hydrate === "function") {
    void store.hydrate(userId);
  }
  return { pendingNotifications: 0 };
}

/**
 * SSOT: reads useWalletStore.wallet.balance (canonical store via walletRepo).
 * DB fallback only when the store has not been hydrated for this session.
 * Previously issued a separate wallet_accounts query — now eliminated when store is live.
 */
export async function fetchWalletBalance(userId: string): Promise<WalletCountState> {
  // Prefer the canonical store — zero DB cost when wallet is already loaded
  const storeWallet = useWalletStore.getState().wallet;
  if (storeWallet != null) {
    return { walletBalance: storeWallet.availableBalance ?? 0 };
  }

  // Store not yet hydrated (e.g. engine runs before wallet page loads) — DB fallback
  try {
    const { data } = await db
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
