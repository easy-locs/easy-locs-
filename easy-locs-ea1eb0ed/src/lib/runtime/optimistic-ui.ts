/**
 * optimistic-ui — Zero-latency perceived action helpers.
 * Wrap mutations with instant UI update + rollback on failure.
 */
import { queryClient } from "@/lib/query-client";

type OptimisticConfig<T> = {
  queryKey: string[];
  mutationFn: () => Promise<T>;
  optimisticUpdate: (old: any) => any;
  onSuccess?: (result: T) => void;
  onError?: (error: Error, rollback: any) => void;
};

/**
 * Execute a mutation with optimistic UI update.
 * Instantly applies change, rolls back on failure.
 */
export async function runOptimistic<T>({
  queryKey,
  mutationFn,
  optimisticUpdate,
  onSuccess,
  onError,
}: OptimisticConfig<T>): Promise<T | null> {
  // Snapshot previous state
  const previous = queryClient.getQueryData(queryKey);

  // Optimistically update
  queryClient.setQueryData(queryKey, (old: any) => optimisticUpdate(old));

  try {
    const result = await mutationFn();
    onSuccess?.(result);
    // Invalidate to get fresh server state
    queryClient.invalidateQueries({ queryKey });
    return result;
  } catch (error) {
    // Rollback to previous state
    queryClient.setQueryData(queryKey, previous);
    onError?.(error as Error, previous);
    return null;
  }
}

/**
 * Prefetch data for a route before navigation.
 */
export function prefetchRoute(queryKey: string[], fetchFn: () => Promise<any>, staleTime = 30_000) {
  queryClient.prefetchQuery({ queryKey, queryFn: fetchFn, staleTime });
}

/**
 * Warm cache for multiple queries in parallel.
 */
export function warmCaches(queries: Array<{ key: string[]; fn: () => Promise<any> }>) {
  for (const q of queries) {
    queryClient.prefetchQuery({ queryKey: q.key, queryFn: q.fn, staleTime: 60_000 });
  }
}
