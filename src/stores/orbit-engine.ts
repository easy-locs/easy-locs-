/**
 * Orbit Engine — Centralized state aggregator for all platform modules.
 * Collects counters, alerts, health indicators from messaging, calls, 
 * contacts, wallet, listings, radar, notifications, etc.
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
  // Counters
  unreadMessages: number;
  missedCalls: number;
  pendingNotifications: number;
  activeContacts: number;
  newLeads: number;
  activeListings: number;
  radarNearby: number;
  walletBalance: number;
  pendingBookings: number;

  // Health
  networkStatus: "online" | "offline" | "degraded";
  syncStatus: "synced" | "syncing" | "error";
  encryptionStatus: "active" | "degraded" | "inactive";
  lastSyncAt: number | null;

  // Alerts queue
  alerts: OrbitAlert[];

  // Actions
  refresh: (userId: string, orgId?: string) => Promise<void>;
  setNetworkStatus: (s: "online" | "offline" | "degraded") => void;
  dismissAlert: (id: string) => void;
  addAlert: (alert: Omit<OrbitAlert, "id" | "timestamp">) => void;
}

export const useOrbitEngine = create<OrbitModuleState>((set, get) => ({
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
      ].slice(-20), // Keep last 20
    })),

  refresh: async (userId, orgId) => {
    set({ syncStatus: "syncing" });
    try {
      const results = await Promise.allSettled([
        // Unread messages
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", userId)
          .eq("read", false),

        // Missed calls (last 7 days)
        supabase
          .from("call_logs")
          .select("id", { count: "exact", head: true })
          .eq("status", "missed")
          .gt("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),

        // Pending notifications
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("read", false),

        // Active listings (if org)
        orgId
          ? supabase
              .from("public_listings")
              .select("id", { count: "exact", head: true })
              .eq("org_id", orgId)
              .eq("active", true)
          : Promise.resolve({ count: 0 }),

        // Pending bookings
        orgId
          ? supabase
              .from("booking_requests")
              .select("id", { count: "exact", head: true })
              .eq("org_id", orgId)
              .eq("status", "pending")
          : Promise.resolve({ count: 0 }),
      ]);

      const extract = (r: PromiseSettledResult<any>, fallback = 0) =>
        r.status === "fulfilled" ? (r.value?.count ?? fallback) : fallback;

      const unreadMessages = extract(results[0]);
      const missedCalls = extract(results[1]);
      const pendingNotifications = extract(results[2]);
      const activeListings = extract(results[3]);
      const pendingBookings = extract(results[4]);

      // Generate contextual alerts
      const alerts: OrbitAlert[] = [];
      if (unreadMessages > 0)
        alerts.push({
          id: "unread-msg",
          type: "info",
          icon: "💬",
          title: "New messages",
          message: `${unreadMessages} unread message${unreadMessages > 1 ? "s" : ""}`,
          link: "/dashboard/communication",
          timestamp: Date.now(),
        });
      if (missedCalls > 0)
        alerts.push({
          id: "missed-calls",
          type: "warning",
          icon: "📞",
          title: "Missed calls",
          message: `${missedCalls} missed call${missedCalls > 1 ? "s" : ""}`,
          link: "/dashboard/communication",
          timestamp: Date.now(),
        });
      if (pendingBookings > 0)
        alerts.push({
          id: "pending-bookings",
          type: "action",
          icon: "📩",
          title: "Pending bookings",
          message: `${pendingBookings} booking${pendingBookings > 1 ? "s" : ""} awaiting response`,
          link: "/dashboard/seasonal",
          timestamp: Date.now(),
        });

      set({
        unreadMessages,
        missedCalls,
        pendingNotifications,
        activeListings,
        pendingBookings,
        syncStatus: "synced",
        lastSyncAt: Date.now(),
        alerts,
      });
    } catch {
      set({ syncStatus: "error" });
    }
  },
}));
