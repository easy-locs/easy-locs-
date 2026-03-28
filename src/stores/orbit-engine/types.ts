/**
 * Orbit Engine Types — shared type definitions for split stores.
 */

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
  | "communication"
  | "business"
  | "notifications"
  | "wallet"
  | "all";

export interface ModuleFreshness {
  communication: number | null;
  business: number | null;
  notifications: number | null;
  wallet: number | null;
}

/** Communication counters */
export interface CommunicationState {
  unreadMessages: number;
  missedCalls: number;
  activeContacts: number;
}

/** Business counters */
export interface BusinessState {
  activeListings: number;
  pendingBookings: number;
  newLeads: number;
  pendingOrders: number;
}

/** Notification counter */
export interface NotificationCountState {
  pendingNotifications: number;
}

/** Wallet counter */
export interface WalletCountState {
  walletBalance: number;
}

/** System status */
export interface SystemStatusState {
  networkStatus: "online" | "offline" | "degraded";
  syncStatus: "synced" | "syncing" | "error";
  encryptionStatus: "active" | "degraded" | "inactive";
  lastSyncAt: number | null;
}
