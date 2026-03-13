/**
 * Orbit Engine — Centralized state aggregator for all platform modules.
 */
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export interface OrbitAlert {
  id: string;
  type: "info" | "warning" | "action" | "success";
  icon: string;
  title: string;
  message: string;
  link?: string;
  timestamp: number;
}

export interface OrbitModuleState {
  unreadMessages: number;
  missedCalls: number;
  pendingNotifications: number;
  activeContacts: number;
  newLeads: number;
  activeListings: number;
  radarNearby: number;
  walletBalance: number;
  pendingBookings: number;

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

async function countRows(table: string, filters: Record<string, any>): Promise<number> {
  let q = (supabase as any).from(table).select("id", { count: "exact", head: true });
  for (const [key, value] of Object.entries(filters)) {
    if (key.startsWith("gt:")) {
      q = q.gt(key.slice(3), value);
    } else {
      q = q.eq(key, value);
    }
  }
  const { count } = await q;
  return count ?? 0;
}

export const useOrbitEngine = create<OrbitModuleState>((set) => ({
  unreadMessages: 0,
  missedCalls: 0,
  pendingNotifications: 0,
  activeContacts: 0,
  newLeads: 0,
  activeListings: 0,
  radarNearby: 0,
  walletBalance: 0,
  pendingBookings: 0,

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
        ...state.alerts,
        { ...alert, id: crypto.randomUUID(), timestamp: Date.now() },
      ].slice(-20),
    })),

  refresh: async (userId: string, orgId?: string) => {
    set({ syncStatus: "syncing" });
    try {
      // messages: count unread where user is NOT the sender (no recipient_id column)
      const messagesQuery = (supabase as any)
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("read", false)
        .neq("sender_id", userId);
      if (orgId) messagesQuery.eq("org_id", orgId);

      // call_logs: missed calls where user's org was called (callee_org_id)
      const callsQuery = (supabase as any)
        .from("call_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "missed")
        .gt("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
      if (orgId) callsQuery.eq("callee_org_id", orgId);

      const [messagesRes, callsRes, notifRes, listingsRes, bookingsRes] = await Promise.all([
        messagesQuery.then((r: any) => r.count ?? 0),
        callsQuery.then((r: any) => r.count ?? 0),
        countRows("notifications", { user_id: userId, read: false }),
        orgId ? countRows("public_listings", { org_id: orgId, active: true }) : 0,
        orgId ? countRows("booking_requests", { org_id: orgId, status: "pending" }) : 0,
      ]);

      const alerts: OrbitAlert[] = [];
      if (messagesRes > 0)
        alerts.push({
          id: "unread-msg", type: "info", icon: "💬",
          title: "New messages",
          message: `${messagesRes} unread message${messagesRes > 1 ? "s" : ""}`,
          link: "/dashboard/communication", timestamp: Date.now(),
        });
      if (callsRes > 0)
        alerts.push({
          id: "missed-calls", type: "warning", icon: "📞",
          title: "Missed calls",
          message: `${callsRes} missed call${callsRes > 1 ? "s" : ""}`,
          link: "/dashboard/communication", timestamp: Date.now(),
        });
      if (bookingsRes > 0)
        alerts.push({
          id: "pending-bookings", type: "action", icon: "📩",
          title: "Pending bookings",
          message: `${bookingsRes} booking${bookingsRes > 1 ? "s" : ""} awaiting response`,
          link: "/dashboard/seasonal", timestamp: Date.now(),
        });

      set({
        unreadMessages: messagesRes,
        missedCalls: callsRes,
        pendingNotifications: notifRes,
        activeListings: listingsRes,
        pendingBookings: bookingsRes,
        syncStatus: "synced",
        lastSyncAt: Date.now(),
        alerts,
      });
    } catch {
      set({ syncStatus: "error" });
    }
  },
}));
