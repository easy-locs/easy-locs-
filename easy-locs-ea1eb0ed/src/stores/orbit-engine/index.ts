/**
 * Orbit Engine V3 — Decomposed store.
 * 
 * Responsibilities split into:
 * - types.ts     → type definitions
 * - fetchers.ts  → isolated DB queries per module
 * - alerts.ts    → pure alert generation + urgency computation
 * - index.ts     → store composition (this file)
 * 
 * Zero business logic in the store. Pure state coordination.
 */
import { create } from "zustand";
import type { OrbitAlert, OrbitModule, ModuleFreshness, OrbitModuleState } from "./store-types";
import { fetchCommunicationCounters, fetchBusinessCounters, fetchNotificationCount, fetchWalletBalance } from "./fetchers";
import { generateAlerts, computeUrgency } from "./alerts";

// Re-export types for consumers
export type { OrbitAlert, OrbitModule } from "./types";
export type { OrbitModuleState } from "./store-types";

/** Module-specific debounce timers */
const moduleTimers: Partial<Record<OrbitModule, ReturnType<typeof setTimeout>>> = {};

/** Staleness threshold: skip refresh if module was refreshed < N ms ago */
const STALE_THRESHOLD_MS = 5_000;

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
            Object.assign(updates, await fetchCommunicationCounters(userId, orgId));
            freshnessUpdates.communication = Date.now();
          }

          if (module === "business" || module === "all") {
            Object.assign(updates, await fetchBusinessCounters(orgId));
            freshnessUpdates.business = Date.now();
          }

          if (module === "notifications" || module === "all") {
            Object.assign(updates, await fetchNotificationCount(userId));
            freshnessUpdates.notifications = Date.now();
          }

          if (module === "wallet" || module === "all") {
            Object.assign(updates, await fetchWalletBalance(userId));
            freshnessUpdates.wallet = Date.now();
          }

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
          console.warn("[OrbitEngine V3] refresh error:", e);
          set({ syncStatus: "error" });
        }

        resolve();
      }, module === "all" ? 300 : 150);
    });
  },

  refresh: async (userId: string, orgId?: string) => {
    return get().refreshModule("all", userId, orgId);
  },
}));
