/**
 * smart-prefetch — Intelligent data prefetching based on route + context.
 * Preloads data the user is likely to need next.
 * Enhanced with hover-based data prefetching for key sections.
 */
import { queryClient } from "@/lib/query-client";
import { db } from "@/services/db";

type PrefetchRule = {
  trigger: string;
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
      { queryKey: ["dashboard-kpis"], fetchFn: async () => { const { data } = await db("orders").select("id, status, total_amount", { count: "exact", head: true }); return data; } },
      { queryKey: ["dashboard-counters"], fetchFn: async () => { const { count } = await db("app_notifications").select("id", { count: "exact", head: true }).eq("read_at", null as any); return count ?? 0; } },
    ],
  },
  {
    trigger: "/orbit",
    targets: [
      { queryKey: ["conversations-list"], fetchFn: async () => { const { data } = await db("conversations_v2").select("id, last_message, last_message_at, title, avatar_url").order("last_message_at", { ascending: false }).limit(20); return data || []; } },
    ],
  },
  {
    trigger: "/wallet",
    targets: [
      { queryKey: ["wallet-overview"], fetchFn: async () => { const { data } = await db("wallet_accounts").select("id, available_balance, currency, status").eq("status", "active").limit(1); return data?.[0] || null; } },
      { queryKey: ["wallet-recent-txns"], fetchFn: async () => { const { data } = await db("unified_wallet_transactions").select("id, type, amount, currency, status, created_at").order("created_at", { ascending: false }).limit(10); return data || []; } },
    ],
  },
  {
    trigger: "/marketplace",
    targets: [
      { queryKey: ["browse_marketplace_providers"], fetchFn: async () => { const { data } = await db.rpc("get_public_marketplace_providers", { p_active_only: true }); return data || []; } },
    ],
  },
  {
    trigger: "/me/properties",
    targets: [
      { queryKey: ["properties-overview"], fetchFn: async () => { const { data } = await db("properties").select("id, title, city, status, created_at").order("created_at", { ascending: false }).limit(20); return data || []; } },
    ],
  },
];

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

export function prefetchAdjacentRoutes(currentRoute: string) {
  const adjacencyMap: Record<string, string[]> = {
    "/dashboard": ["/orbit", "/wallet", "/marketplace"],
    "/orbit": ["/dashboard", "/wallet"],
    "/wallet": ["/dashboard", "/orbit"],
    "/marketplace": ["/dashboard"],
    "/rental": ["/dashboard"],
    "/me/properties": ["/dashboard", "/wallet"],
  };

  const adjacents = adjacencyMap[currentRoute] ?? [];
  for (const route of adjacents) {
    prefetchForRoute(route);
  }
}

export function prefetchOnHover(route: string) {
  const timer = setTimeout(() => prefetchForRoute(route), 100);
  return () => clearTimeout(timer);
}

export function addPrefetchRule(rule: PrefetchRule) {
  prefetchRules.push(rule);
}
