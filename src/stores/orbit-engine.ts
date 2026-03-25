/**
 * Orbit Engine V2 — Granular state aggregator with selective refresh.
 * 
 * V2 improvements over V1:
 * - Selective module refresh (only re-fetch affected counters)
 * - Per-module staleness tracking
 * - Stale-while-revalidate pattern
 * - Computed urgency score for priority sorting
 * - Smarter debounce per module group
 */
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OrbitAlert {
  id: string;
  type: "info" | "warning" | "action" | "success";
  priority: number;
  icon: string;
  title: string;
  message: string;
  link?: string;
  timestamp: number;
}

/** Refresh module groups — allows targeted counter updates */
export type OrbitModule =
  | "communication"  // unreadMessages, missedCalls, activeContacts
  | "business"       // activeListings, pendingBookings, newLeads, pendingOrders
  | "notifications"  // pendingNotifications
  | "wallet"         // walletBalance
  | "all";           // everything

interface ModuleFreshness {
  communication: number | null;
  business: number | null;
  notifications: number | null;
  wallet: number | null;
}

export interface OrbitModuleState {
  // Communication
  unreadMessages: number;
  missedCalls: number;
  activeContacts: number;

  // Business
  pendingNotifications: number;
  activeListings: number;
  pendingBookings: number;
  newLeads: number;
  pendingOrders: number;

  // System
  radarNearby: number;
  walletBalance: number;

  // Status
  networkStatus: "online" | "offline" | "degraded";
  syncStatus: "synced" | "syncing" | "error";
  encryptionStatus: "active" | "degraded" | "inactive";
  lastSyncAt: number | null;

  // V2: Per-module freshness
  moduleFreshness: ModuleFreshness;

  // V2: Computed urgency (action items needing attention)
  urgencyScore: number;

  // Track last refresh params for platform-bus triggered refreshes
  lastRefreshUserId: string | null;
  lastRefreshOrgId: string | null;

  alerts: OrbitAlert[];

  // V2: Selective module refresh
  refreshModule: (module: OrbitModule, userId: string, orgId?: string) => Promise<void>;
  // Legacy full refresh (calls refreshModule("all"))
  refresh: (userId: string, orgId?: string) => Promise<void>;

  setNetworkStatus: (s: "online" | "offline" | "degraded") => void;
  dismissAlert: (id: string) => void;
  addAlert: (alert: Omit<OrbitAlert, "id" | "timestamp">) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function computeUrgency(state: {
  pendingBookings: number;
  pendingOrders: number;
  newLeads: number;
  unreadMessages: number;
  missedCalls: number;
  pendingNotifications: number;
}): number {
  return (
    state.pendingBookings * 10 +
    state.pendingOrders * 8 +
    state.newLeads * 5 +
    state.missedCalls * 4 +
    state.unreadMessages * 2 +
    Math.min(state.pendingNotifications, 10) * 1
  );
}

/** Module-specific debounce timers */
const moduleTimers: Partial<Record<OrbitModule, ReturnType<typeof setTimeout>>> = {};

/** Staleness threshold: skip refresh if module was refreshed < N ms ago */
const STALE_THRESHOLD_MS = 5_000;

// ─── Refresh functions per module ────────────────────────────────────────────

async function refreshCommunication(userId: string, orgId?: string) {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  // Resolve user's orbit_id for call log filtering
  let userOrbitId: string | null = null;
  try {
    const { data: orbitProfile } = await (supabase as any)
      .from("orbit_profiles_v2")
      .select("orbit_id")
      .eq("id", userId)
      .maybeSingle();
    userOrbitId = orbitProfile?.orbit_id || null;
  } catch { /* silent */ }

  const [unreadMessages, missedCalls, activeContacts] = await Promise.all([
    // Canonical: count unread from chat_messages_v2 (Orbit P2P), NOT legacy messages table
    safeCount("chat_messages_v2", (q) => {
      let query = q.eq("read", false).neq("sender_user_id", userId);
      return query;
    }),
    safeCount("call_logs", (q) => {
      let query = q.eq("status", "missed").gt("created_at", weekAgo);
      // Filter by the user's actual orbit_id, not the orgId
      if (userOrbitId) query = query.eq("receiver_orbit_id", userOrbitId);
      return query;
    }),
    safeCount("contacts", (q) => q.eq("owner_id", userId)),
  ]);

  return { unreadMessages, missedCalls, activeContacts };
}

async function refreshBusiness(orgId?: string) {
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

async function refreshNotifications(userId: string) {
  const pendingNotifications = await safeCount("notifications", (q) =>
    q.eq("user_id", userId).eq("read", false)
  );
  return { pendingNotifications };
}

async function refreshWallet(userId: string) {
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

// ─── Alert generation ────────────────────────────────────────────────────────

function generateAlerts(state: {
  pendingBookings: number;
  newLeads: number;
  pendingOrders: number;
  unreadMessages: number;
  missedCalls: number;
  pendingNotifications: number;
}): OrbitAlert[] {
  const alerts: OrbitAlert[] = [];
  const now = Date.now();

  if (state.pendingBookings > 0)
    alerts.push({
      id: "pending-bookings", type: "action", priority: 1, icon: "📩",
      title: "Réservations en attente",
      message: `${state.pendingBookings} réservation${state.pendingBookings > 1 ? "s" : ""} à confirmer`,
      link: "/dashboard/seasonal", timestamp: now,
    });

  if (state.newLeads > 0)
    alerts.push({
      id: "new-leads", type: "action", priority: 2, icon: "🔥",
      title: "Nouveaux prospects",
      message: `${state.newLeads} demande${state.newLeads > 1 ? "s" : ""} cette semaine`,
      link: "/dashboard/communication", timestamp: now,
    });

  if (state.pendingOrders > 0)
    alerts.push({
      id: "pending-orders", type: "action", priority: 3, icon: "🎯",
      title: "Commandes conciergerie",
      message: `${state.pendingOrders} commande${state.pendingOrders > 1 ? "s" : ""} en attente`,
      link: "/dashboard/activities", timestamp: now,
    });

  if (state.unreadMessages > 0)
    alerts.push({
      id: "unread-msg", type: "info", priority: 4, icon: "💬",
      title: "Messages non lus",
      message: `${state.unreadMessages} message${state.unreadMessages > 1 ? "s" : ""} non lu${state.unreadMessages > 1 ? "s" : ""}`,
      link: "/dashboard/communication", timestamp: now,
    });

  if (state.missedCalls > 0)
    alerts.push({
      id: "missed-calls", type: "warning", priority: 5, icon: "📞",
      title: "Appels manqués",
      message: `${state.missedCalls} appel${state.missedCalls > 1 ? "s" : ""} manqué${state.missedCalls > 1 ? "s" : ""}`,
      link: "/dashboard/communication", timestamp: now,
    });

  if (state.pendingNotifications > 5)
    alerts.push({
      id: "notif-pile", type: "info", priority: 6, icon: "🔔",
      title: "Notifications",
      message: `${state.pendingNotifications} notifications en attente`,
      link: "/dashboard/settings", timestamp: now,
    });

  return alerts.sort((a, b) => a.priority - b.priority);
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useOrbitEngine = create<OrbitModuleState>((set, get) => ({
  unreadMessages: 0,
  missedCalls: 0,
  activeContacts: 0,
  pendingNotifications: 0,
  activeListings: 0,
  pendingBookings: 0,
  newLeads: 0,
  pendingOrders: 0,
  radarNearby: 0,
  walletBalance: 0,

  networkStatus: "online",
  syncStatus: "synced",
  encryptionStatus: "active",
  lastSyncAt: null,

  moduleFreshness: {
    communication: null,
    business: null,
    notifications: null,
    wallet: null,
  },

  urgencyScore: 0,

  lastRefreshUserId: null,
  lastRefreshOrgId: null,

  alerts: [],

  setNetworkStatus: (s) => set({ networkStatus: s }),

  dismissAlert: (id) =>
    set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [
        ...state.alerts.filter((a) => a.id !== (alert as any).id),
        { ...alert, id: (alert as any).id || crypto.randomUUID(), timestamp: Date.now() },
      ].slice(-20),
    })),

  refreshModule: async (module: OrbitModule, userId: string, orgId?: string) => {
    set({ lastRefreshUserId: userId, lastRefreshOrgId: orgId ?? null });

    const now = Date.now();
    const freshness = get().moduleFreshness;

    // Stale-while-revalidate: skip if recently refreshed (except "all")
    if (module !== "all") {
      const moduleKey = module as keyof ModuleFreshness;
      const lastFresh = freshness[moduleKey];
      if (lastFresh && now - lastFresh < STALE_THRESHOLD_MS) return;
    }

    // Debounce per module
    if (moduleTimers[module]) clearTimeout(moduleTimers[module]!);

    return new Promise<void>((resolve) => {
      moduleTimers[module] = setTimeout(async () => {
        set({ syncStatus: "syncing" });

        try {
          const updates: Partial<OrbitModuleState> = {};
          const freshnessUpdates: Partial<ModuleFreshness> = {};

          if (module === "communication" || module === "all") {
            const comm = await refreshCommunication(userId, orgId);
            Object.assign(updates, comm);
            freshnessUpdates.communication = Date.now();
          }

          if (module === "business" || module === "all") {
            const biz = await refreshBusiness(orgId);
            Object.assign(updates, biz);
            freshnessUpdates.business = Date.now();
          }

          if (module === "notifications" || module === "all") {
            const notif = await refreshNotifications(userId);
            Object.assign(updates, notif);
            freshnessUpdates.notifications = Date.now();
          }

          if (module === "wallet" || module === "all") {
            const wal = await refreshWallet(userId);
            Object.assign(updates, wal);
            freshnessUpdates.wallet = Date.now();
          }

          // Merge state and compute derived values
          const merged = { ...get(), ...updates };
          const urgencyScore = computeUrgency(merged);
          const alerts = generateAlerts(merged);

          set({
            ...updates,
            urgencyScore,
            alerts,
            syncStatus: "synced",
            lastSyncAt: Date.now(),
            moduleFreshness: { ...get().moduleFreshness, ...freshnessUpdates },
          });
        } catch (e) {
          console.warn("[OrbitEngine V2] refresh error:", e);
          set({ syncStatus: "error" });
        }

        resolve();
      }, module === "all" ? 300 : 150); // Faster for targeted, slower for full
    });
  },

  // Legacy API — delegates to refreshModule("all")
  refresh: async (userId: string, orgId?: string) => {
    return get().refreshModule("all", userId, orgId);
  },
}));
