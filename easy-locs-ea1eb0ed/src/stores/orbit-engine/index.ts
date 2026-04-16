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
const STALE_THRESHOLD_MS = 10_000;

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

    if (module !== "all") {
      const moduleKey = module as keyof ModuleFreshness;
      const lastFresh = freshness[moduleKey];
      if (lastFresh && now - lastFresh < STALE_THRESHOLD_MS) return;
    }

    if (moduleTimers[module]) clearTimeout(moduleTimers[module]!);

    return new Promise<void>((resolve) => {
      moduleTimers[module] = setTimeout(async () => {
        set({ syncStatus: "syncing" });

        try {
          const fetchers: Array<Promise<Partial<OrbitModuleState>>> = [];
          const freshnessKeys: Array<keyof ModuleFreshness> = [];

          if (module === "communication" || module === "all") {
            fetchers.push(fetchCommunicationCounters(userId, orgId));
            freshnessKeys.push("communication");
          }
          if (module === "business" || module === "all") {
            fetchers.push(fetchBusinessCounters(orgId));
            freshnessKeys.push("business");
          }
          if (module === "notifications" || module === "all") {
            fetchers.push(fetchNotificationCount(userId));
            freshnessKeys.push("notifications");
          }
          if (module === "wallet" || module === "all") {
            fetchers.push(fetchWalletBalance(userId));
            freshnessKeys.push("wallet");
          }

          const results = await Promise.allSettled(fetchers);
          const batchedUpdates: Partial<OrbitModuleState> = {};
          const freshnessUpdates: Partial<ModuleFreshness> = {};
          const refreshTime = Date.now();
          let failedCount = 0;

          for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.status === "fulfilled") {
              Object.assign(batchedUpdates, result.value);
              freshnessUpdates[freshnessKeys[i]] = refreshTime;
            } else {
              failedCount++;
              console.warn(`[OrbitEngine V3] module "${freshnessKeys[i]}" fetch failed:`, result.reason);
            }
          }

          const merged = { ...get(), ...batchedUpdates };
          const urgencyScore = computeUrgency(merged);
          const alerts = generateAlerts(merged);

          const allFailed = failedCount === results.length;
          const partialFailure = failedCount > 0 && !allFailed;

          set({
            ...batchedUpdates,
            urgencyScore,
            alerts,
            syncStatus: allFailed ? "error" : "synced",
            lastSyncAt: allFailed ? get().lastSyncAt : refreshTime,
            moduleFreshness: { ...get().moduleFreshness, ...freshnessUpdates },
          });

          if (partialFailure) {
            console.warn(`[OrbitEngine V3] partial sync: ${failedCount}/${results.length} modules failed`);
          }
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
