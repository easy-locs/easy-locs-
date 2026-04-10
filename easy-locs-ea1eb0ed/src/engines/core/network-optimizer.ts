import { queryClient } from "@/lib/query-client";

const DEDUP_INFLIGHT = new Map<string, Promise<any>>();

export function deduplicateRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const inflight = DEDUP_INFLIGHT.get(key);
  if (inflight) return inflight as Promise<T>;

  const promise = fn().finally(() => {
    DEDUP_INFLIGHT.delete(key);
  });

  DEDUP_INFLIGHT.set(key, promise);
  return promise;
}

const AGGRESSIVE_STALE: Record<string, number> = {
  "wallet-balance": 30_000,
  "wallet-transactions": 60_000,
  "threads": 30_000,
  "dashboard-live-stats": 30_000,
  "radar-places": 120_000,
  "user-profile": 300_000,
  "trending": 120_000,
  "best-rated": 120_000,
  "near-you": 60_000,
};

export function applyAggressiveCaching() {
  for (const [prefix, staleTime] of Object.entries(AGGRESSIVE_STALE)) {
    queryClient.setQueryDefaults([prefix], {
      staleTime,
      gcTime: staleTime * 3,
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
      retry: 1,
    });
  }
}

let _installed = false;

export function installNetworkOptimizer() {
  if (_installed) return;
  _installed = true;

  applyAggressiveCaching();

  if (typeof window !== "undefined") {
    const conn = (navigator as any).connection;
    if (conn) {
      let _networkHandler: (() => void) | null = null;
      const adjustForNetwork = () => {
        const slow = conn.effectiveType === "2g" || conn.effectiveType === "slow-2g" || conn.saveData;
        if (slow) {
          for (const [prefix] of Object.entries(AGGRESSIVE_STALE)) {
            queryClient.setQueryDefaults([prefix], {
              staleTime: 300_000,
              gcTime: 600_000,
              refetchOnWindowFocus: false,
              retry: 0,
            });
          }
        } else {
          applyAggressiveCaching();
        }
      };
      _networkHandler = adjustForNetwork;
      conn.addEventListener("change", _networkHandler);
      adjustForNetwork();
    }
  }
}
