import { QueryClient } from "@tanstack/react-query";

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
