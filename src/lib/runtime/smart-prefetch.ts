/**
 * smart-prefetch — Intelligent data prefetching based on route + context.
 * Preloads data the user is likely to need next.
 */
import { queryClient } from "@/lib/query-client";
import { supabase } from "@/integrations/supabase/client";

type PrefetchRule = {
  trigger: string; // current route
  targets: Array<{
    queryKey: string[];
    fetchFn: () => Promise<any>;
    staleTime?: number;
  }>;
};

const prefetchRules: PrefetchRule[] = [
  {
    trigger: "/dashboard",
    targets: [
      { queryKey: ["dashboard-kpis"], fetchFn: () => supabase.from("orders").select("id, status, total_amount", { count: "exact", head: true }).then(r => r) },
      { queryKey: ["dashboard-counters"], fetchFn: () => supabase.from("app_notifications").select("id", { count: "exact", head: true }).eq("read_at", null as any).then(r => r) },
    ],
  },
  {
    trigger: "/orbit",
    targets: [
      { queryKey: ["conversations"], fetchFn: () => (supabase as any).from("conversations_v2").select("id, last_message, last_message_at").order("last_message_at", { ascending: false }).limit(20).then((r: any) => r) },
    ],
  },
  {
    trigger: "/wallet",
    targets: [
      { queryKey: ["wallet-balance"], fetchFn: () => (supabase as any).from("wallet_balances_v2").select("*").limit(1).then((r: any) => r) },
    ],
  },
];

/**
 * Prefetch data for a target route.
 */
export function prefetchForRoute(route: string) {
  const rules = prefetchRules.filter(r => route.startsWith(r.trigger));
  for (const rule of rules) {
    for (const target of rule.targets) {
      queryClient.prefetchQuery({
        queryKey: target.queryKey,
        queryFn: target.fetchFn,
        staleTime: target.staleTime ?? 30_000,
      });
    }
  }
}

/**
 * Prefetch adjacent routes based on current location.
 */
export function prefetchAdjacentRoutes(currentRoute: string) {
  const adjacencyMap: Record<string, string[]> = {
    "/dashboard": ["/orbit", "/wallet"],
    "/orbit": ["/dashboard", "/wallet"],
    "/wallet": ["/dashboard", "/orbit"],
    "/marketplace": ["/dashboard"],
    "/rental": ["/dashboard"],
  };

  const adjacents = adjacencyMap[currentRoute] ?? [];
  for (const route of adjacents) {
    prefetchForRoute(route);
  }
}

/**
 * Register a custom prefetch rule at runtime.
 */
export function addPrefetchRule(rule: PrefetchRule) {
  prefetchRules.push(rule);
}
