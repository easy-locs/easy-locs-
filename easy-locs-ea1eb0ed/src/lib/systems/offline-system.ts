import { platformBus } from "@/lib/shared/platform-bus";

export type SyncStatus = "synced" | "pending" | "syncing" | "conflict" | "failed";
export type ConflictResolution = "server_wins" | "client_wins" | "merge" | "manual";

export interface PendingAction {
  actionId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
  status: SyncStatus;
  conflictResolution: ConflictResolution;
}

export interface OfflineState {
  isOnline: boolean;
  pendingActions: PendingAction[];
  lastSyncAt: number | null;
  syncInProgress: boolean;
  failedActions: PendingAction[];
}

export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  cachedAt: number;
  expiresAt: number;
  version: number;
  stale: boolean;
}

const CACHE_TTL: Record<string, number> = {
  "user-profile": 3600000,
  "wallet-balance": 60000,
  "threads": 300000,
  "contacts": 600000,
  "listings": 300000,
  "dashboard-stats": 120000,
  "notifications": 60000,
};

const offlineCache = new Map<string, CacheEntry>();
const pendingQueue: PendingAction[] = [];
let isOnline = true;

export function getCacheTTL(key: string): number {
  const prefix = Object.keys(CACHE_TTL).find((p) => key.startsWith(p));
  return prefix ? CACHE_TTL[prefix] : 300000;
}

export function setCacheEntry<T>(key: string, data: T, version = 1): void {
  const ttl = getCacheTTL(key);
  offlineCache.set(key, {
    key,
    data,
    cachedAt: Date.now(),
    expiresAt: Date.now() + ttl,
    version,
    stale: false,
  });
}

export function getCacheEntry<T>(key: string): CacheEntry<T> | null {
  const entry = offlineCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    entry.stale = true;
  }
  return entry;
}

export function invalidateCacheEntry(key: string): void {
  offlineCache.delete(key);
}

export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of offlineCache.keys()) {
    if (key.startsWith(prefix)) offlineCache.delete(key);
  }
}

export function queueAction(type: string, payload: Record<string, unknown>): string {
  const actionId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const action: PendingAction = {
    actionId,
    type,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
    maxRetries: 5,
    status: "pending",
    conflictResolution: "server_wins",
  };
  pendingQueue.push(action);
  return actionId;
}

export function getPendingActions(): readonly PendingAction[] {
  return pendingQueue.filter((a) => a.status === "pending");
}

export function getFailedActions(): readonly PendingAction[] {
  return pendingQueue.filter((a) => a.status === "failed");
}

export async function processPendingQueue(
  executor: (action: PendingAction) => Promise<boolean>
): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  const pending = pendingQueue.filter((a) => a.status === "pending");
  for (const action of pending) {
    action.status = "syncing";
    action.retryCount++;
    try {
      const success = await executor(action);
      if (success) {
        action.status = "synced";
        synced++;
      } else {
        action.status = action.retryCount >= action.maxRetries ? "failed" : "pending";
        if (action.status === "failed") failed++;
      }
    } catch {
      action.status = action.retryCount >= action.maxRetries ? "failed" : "pending";
      if (action.status === "failed") failed++;
    }
  }

  if (synced > 0) {
    platformBus.emit("system:sync_completed", { synced, failed, timestamp: Date.now() }, "offline-system");
  }

  return { synced, failed };
}

export function setOnlineStatus(online: boolean): void {
  const wasOffline = !isOnline;
  isOnline = online;
  if (online && wasOffline) {
    platformBus.emit("system:online_recovered", { timestamp: Date.now() }, "offline-system");
  }
}

export function getOnlineStatus(): boolean {
  return isOnline;
}

export function resolveConflict(
  localVersion: number,
  serverVersion: number,
  strategy: ConflictResolution
): "use_local" | "use_server" | "merge" {
  if (strategy === "client_wins") return "use_local";
  if (strategy === "server_wins") return "use_server";
  if (strategy === "merge") return "merge";
  return serverVersion > localVersion ? "use_server" : "use_local";
}
