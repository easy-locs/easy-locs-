/**
 * Orbit Engine — Centralized state aggregator for all platform modules.
 * Phase 2: enriched signals, smarter alerts, resilient per-query error handling.
 */
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export interface OrbitAlert {
  id: string;
  type: "info" | "warning" | "action" | "success";
  priority: number; // 1 = highest
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

  alerts: OrbitAlert[];

  refresh: (userId: string, orgId?: string) => Promise<void>;
  setNetworkStatus: (s: "online" | "offline" | "degraded") => void;
  dismissAlert: (id: string) => void;
  addAlert: (alert: Omit<OrbitAlert, "id" | "timestamp">) => void;
}

/** Safe count query — returns 0 on failure instead of crashing the whole refresh */
async function safeCount(
  table: string,
  build: (q: any) => any
): Promise<number> {
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

export const useOrbitEngine = create<OrbitModuleState>((set) => ({
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
    set({ syncStatus: "syncing" });

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [
      unreadMessages,
      missedCalls,
      pendingNotifications,
      activeListings,
      pendingBookings,
      newLeads,
      pendingOrders,
      activeContacts,
    ] = await Promise.all([
      // Unread messages (not sent by me)
      safeCount("messages", (q) => {
        let query = q.eq("read", false).neq("sender_id", userId);
        if (orgId) query = query.eq("org_id", orgId);
        return query;
      }),

      // Missed calls (last 7 days)
      safeCount("call_logs", (q) => {
        let query = q.eq("status", "missed").gt("created_at", weekAgo);
        if (orgId) query = query.eq("callee_org_id", orgId);
        return query;
      }),

      // Unread notifications
      safeCount("notifications", (q) => q.eq("user_id", userId).eq("read", false)),

      // Active listings
      orgId
        ? safeCount("public_listings", (q) => q.eq("org_id", orgId).eq("active", true))
        : 0,

      // Pending booking requests
      orgId
        ? safeCount("booking_requests", (q) => q.eq("org_id", orgId).eq("status", "pending"))
        : 0,

      // New leads (open deal rooms, last 7 days)
      orgId
        ? safeCount("deal_rooms", (q) =>
            q.eq("org_id", orgId).eq("status", "inquiry").gt("created_at", weekAgo)
          )
        : 0,

      // Pending concierge orders
      orgId
        ? safeCount("concierge_orders", (q) =>
            q.eq("org_id", orgId).eq("status", "pending")
          )
        : 0,

      // Active contacts
      safeCount("contacts", (q) => q.eq("owner_id", userId)),
    ]);

    // ── Build prioritized alerts ──
    const alerts: OrbitAlert[] = [];

    if (pendingBookings > 0)
      alerts.push({
        id: "pending-bookings",
        type: "action",
        priority: 1,
        icon: "📩",
        title: "Réservations en attente",
        message: `${pendingBookings} réservation${pendingBookings > 1 ? "s" : ""} à confirmer`,
        link: "/dashboard/seasonal",
        timestamp: Date.now(),
      });

    if (newLeads > 0)
      alerts.push({
        id: "new-leads",
        type: "action",
        priority: 2,
        icon: "🔥",
        title: "Nouveaux prospects",
        message: `${newLeads} demande${newLeads > 1 ? "s" : ""} cette semaine`,
        link: "/dashboard/communication",
        timestamp: Date.now(),
      });

    if (pendingOrders > 0)
      alerts.push({
        id: "pending-orders",
        type: "action",
        priority: 3,
        icon: "🎯",
        title: "Commandes conciergerie",
        message: `${pendingOrders} commande${pendingOrders > 1 ? "s" : ""} en attente`,
        link: "/dashboard/concierge",
        timestamp: Date.now(),
      });

    if (unreadMessages > 0)
      alerts.push({
        id: "unread-msg",
        type: "info",
        priority: 4,
        icon: "💬",
        title: "Messages non lus",
        message: `${unreadMessages} message${unreadMessages > 1 ? "s" : ""} non lu${unreadMessages > 1 ? "s" : ""}`,
        link: "/dashboard/communication",
        timestamp: Date.now(),
      });

    if (missedCalls > 0)
      alerts.push({
        id: "missed-calls",
        type: "warning",
        priority: 5,
        icon: "📞",
        title: "Appels manqués",
        message: `${missedCalls} appel${missedCalls > 1 ? "s" : ""} manqué${missedCalls > 1 ? "s" : ""}`,
        link: "/dashboard/communication",
        timestamp: Date.now(),
      });

    if (pendingNotifications > 5)
      alerts.push({
        id: "notif-pile",
        type: "info",
        priority: 6,
        icon: "🔔",
        title: "Notifications",
        message: `${pendingNotifications} notifications en attente`,
        link: "/dashboard/settings",
        timestamp: Date.now(),
      });

    // Sort by priority
    alerts.sort((a, b) => a.priority - b.priority);

    set({
      unreadMessages,
      missedCalls,
      activeContacts,
      pendingNotifications,
      activeListings,
      pendingBookings,
      newLeads,
      pendingOrders,
      syncStatus: "synced",
      lastSyncAt: Date.now(),
      alerts,
    });
  },
}));
