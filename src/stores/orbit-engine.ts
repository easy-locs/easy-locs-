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
      // Fetch counts in parallel using simple queries
      const [messagesRes, callsRes, notifRes, listingsRes, bookingsRes] = await Promise.all([
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", userId)
          .eq("read", false)
          .then((r) => r.count ?? 0),

        supabase
          .from("call_logs")
          .select("id", { count: "exact", head: true })
          .eq("status", "missed")
          .gt("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
          .then((r) => r.count ?? 0),

        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("read", false)
          .then((r) => r.count ?? 0),

        orgId
          ? supabase
              .from("public_listings")
              .select("id", { count: "exact", head: true })
              .eq("org_id", orgId)
              .eq("active", true)
              .then((r) => r.count ?? 0)
          : Promise.resolve(0),

        orgId
          ? supabase
              .from("booking_requests")
              .select("id", { count: "exact", head: true })
              .eq("org_id", orgId)
              .eq("status", "pending")
              .then((r) => r.count ?? 0)
          : Promise.resolve(0),
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
