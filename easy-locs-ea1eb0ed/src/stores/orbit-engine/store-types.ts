/**
 * Orbit Engine Store Types — the full store interface.
 * Separated from domain types to avoid circular imports.
 */
import type { OrbitAlert, OrbitModule, ModuleFreshness } from "./types";

export type { OrbitAlert, OrbitModule, ModuleFreshness };

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

  // V2: Computed urgency
  urgencyScore: number;

  // Track last refresh params
  lastRefreshUserId: string | null;
  lastRefreshOrgId: string | null;

  alerts: OrbitAlert[];

  // Actions
  refreshModule: (module: OrbitModule, userId: string, orgId?: string) => Promise<void>;
  refresh: (userId: string, orgId?: string) => Promise<void>;
  setNetworkStatus: (s: "online" | "offline" | "degraded") => void;
  dismissAlert: (id: string) => void;
  addAlert: (alert: Omit<OrbitAlert, "id" | "timestamp">) => void;
}
