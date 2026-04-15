import { QueryClient } from "@tanstack/react-query";
import { getCached, setCached, listAllKeys } from "@/lib/cache/idb-cache";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: 1,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
      networkMode: "offlineFirst",
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: "offlineFirst",
    },
  },
});

export const STALE_TIMES = {
  REALTIME: 30 * 1000,
  WALLET: 60 * 1000,
  MESSAGES: 30 * 1000,
  FEEDS: 2 * 60 * 1000,
  STANDARD: 10 * 60 * 1000,
  TAXONOMY: 30 * 60 * 1000,
  PROFILE: 30 * 60 * 1000,
  STATIC: 60 * 60 * 1000,
} as const;

const PERSIST_QUERY_PREFIXES = [
  "profile",
  "taxonomy",
  "shops-browse",
  "browse_marketplace_providers",
];

function shouldPersist(queryKey: unknown[]): boolean {
  const first = String(queryKey[0] ?? "");
  return PERSIST_QUERY_PREFIXES.some(p => first === p);
}

function queryCacheKey(queryKey: unknown[]): string {
  return `qc:${JSON.stringify(queryKey)}`;
}

export function setupQueryPersistence() {
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === "updated" && event.action.type === "success") {
      const query = event.query;
      if (shouldPersist(query.queryKey)) {
        const key = queryCacheKey(query.queryKey);
        setCached(key, query.state.data, STALE_TIMES.STATIC).catch(() => {});
      }
    }
  });
}

export async function hydrateFromCache() {
  const allCacheKeys = await listPersistedKeys();

  for (const cacheKey of allCacheKeys) {
    if (!cacheKey.startsWith("qc:")) continue;
    try {
      const queryKey = JSON.parse(cacheKey.slice(3)) as unknown[];
      const first = String(queryKey[0] ?? "");
      if (!PERSIST_QUERY_PREFIXES.some(p => first === p)) continue;
      const existing = queryClient.getQueryData(queryKey);
      if (existing !== undefined) continue;
      const cached = await getCached(cacheKey);
      if (cached !== undefined) {
        queryClient.setQueryData(queryKey, cached);
      }
    } catch {}
  }
}

async function listPersistedKeys(): Promise<string[]> {
  return listAllKeys();
}
