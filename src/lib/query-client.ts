/**
 * query-client — Singleton QueryClient for cache invalidation from service layers.
 * Import this in repositories/invalidators instead of accessing from React context.
 */
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});
