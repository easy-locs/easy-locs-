/**
 * Orbit Engine — Centralized state aggregator for all platform modules.
 * Phase 3: connected to Platform Bus for reactive cross-module sync.
 */
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

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

  // Track last refresh params for platform-bus triggered refreshes
  lastRefreshUserId: string | null;
  lastRefreshOrgId: string | null;

  alerts: OrbitAlert[];

  refresh: (userId: string, orgId?: string) => Promise<void>;
  setNetworkStatus: (s: "online" | "offline" | "degraded") => void;
  dismissAlert: (id: string) => void;
  addAlert: (alert: Omit<OrbitAlert, "id" | "timestamp">) => void;
}

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

/** Debounce refresh to prevent rapid-fire from platform bus */
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

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

  refresh: async (userId: string, orgId?: string) => {
    // Store params for platform-bus triggered re-refreshes
    set({ lastRefreshUserId: userId, lastRefreshOrgId: orgId ?? null });

    // Debounce: if called rapidly, only execute the last one
    if (refreshTimer) clearTimeout(refreshTimer);

    return new Promise<void>((resolve) => {
      refreshTimer = setTimeout(async () => {
        set({ syncStatus: "syncing" });
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

        const [
          unreadMessages, missedCalls, pendingNotifications,
          activeListings, pendingBookings, newLeads,
          pendingOrders, activeContacts, walletBalance,
        ] = await Promise.all([
          safeCount("messages", (q) => {
            let query = q.eq("read", false).neq("sender_id", userId);
            if (orgId) query = query.eq("org_id", orgId);
            return query;
          }),
          safeCount("call_logs", (q) => {
            let query = q.eq("status", "missed").gt("created_at", weekAgo);
            if (orgId) query = query.eq("callee_org_id", orgId);
            return query;
          }),
          safeCount("notifications", (q) => q.eq("user_id", userId).eq("read", false)),
          orgId ? safeCount("public_listings", (q) => q.eq("org_id", orgId).eq("active", true)) : 0,
          orgId ? safeCount("booking_requests", (q) => q.eq("org_id", orgId).eq("status", "pending")) : 0,
          orgId ? safeCount("deal_rooms", (q) => q.eq("org_id", orgId).eq("status", "inquiry").gt("created_at", weekAgo)) : 0,
          orgId ? safeCount("concierge_orders", (q) => q.eq("org_id", orgId).eq("status", "pending")) : 0,
          safeCount("contacts", (q) => q.eq("owner_id", userId)),
          // Wallet balance
          (async () => {
            try {
              const { data } = await supabase
                .from("wallet_balances")
                .select("balance")
                .eq("user_id", userId)
                .eq("currency", "LOCS")
                .maybeSingle();
              return (data as any)?.balance ?? 0;
            } catch { return 0; }
          })(),
        ]);

        const alerts: OrbitAlert[] = [];

        if (pendingBookings > 0)
          alerts.push({
            id: "pending-bookings", type: "action", priority: 1, icon: "📩",
            title: "Réservations en attente",
            message: `${pendingBookings} réservation${pendingBookings > 1 ? "s" : ""} à confirmer`,
            link: "/dashboard/seasonal", timestamp: Date.now(),
          });

        if (newLeads > 0)
          alerts.push({
            id: "new-leads", type: "action", priority: 2, icon: "🔥",
            title: "Nouveaux prospects",
            message: `${newLeads} demande${newLeads > 1 ? "s" : ""} cette semaine`,
            link: "/dashboard/communication", timestamp: Date.now(),
          });

        if (pendingOrders > 0)
          alerts.push({
            id: "pending-orders", type: "action", priority: 3, icon: "🎯",
            title: "Commandes conciergerie",
            message: `${pendingOrders} commande${pendingOrders > 1 ? "s" : ""} en attente`,
            link: "/dashboard/activities", timestamp: Date.now(),
          });

        if (unreadMessages > 0)
          alerts.push({
            id: "unread-msg", type: "info", priority: 4, icon: "💬",
            title: "Messages non lus",
            message: `${unreadMessages} message${unreadMessages > 1 ? "s" : ""} non lu${unreadMessages > 1 ? "s" : ""}`,
            link: "/dashboard/communication", timestamp: Date.now(),
          });

        if (missedCalls > 0)
          alerts.push({
            id: "missed-calls", type: "warning", priority: 5, icon: "📞",
            title: "Appels manqués",
            message: `${missedCalls} appel${missedCalls > 1 ? "s" : ""} manqué${missedCalls > 1 ? "s" : ""}`,
            link: "/dashboard/communication", timestamp: Date.now(),
          });

        if (pendingNotifications > 5)
          alerts.push({
            id: "notif-pile", type: "info", priority: 6, icon: "🔔",
            title: "Notifications",
            message: `${pendingNotifications} notifications en attente`,
            link: "/dashboard/settings", timestamp: Date.now(),
          });

        alerts.sort((a, b) => a.priority - b.priority);

        set({
          unreadMessages, missedCalls, activeContacts,
          pendingNotifications, activeListings, pendingBookings,
          newLeads, pendingOrders, walletBalance,
          syncStatus: "synced", lastSyncAt: Date.now(), alerts,
        });

        resolve();
      }, 300);
    });
  },
}));
