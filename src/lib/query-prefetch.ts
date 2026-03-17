/**
 * Query prefetch config — PASS145
 * Prefetch critical data on app boot for instant navigation.
 */
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Prefetch high-priority queries after initial render.
 * Call once from AppShell or root layout after auth is resolved.
 */
export function prefetchCriticalData(queryClient: QueryClient, userId?: string) {
  // Shops feed — used by /shops
  queryClient.prefetchQuery({
    queryKey: ["shops-browse"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, logo_url, description, vertical, boost_tier, boost_until, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []).map((s: any) => ({ ...s, title: s.name }));
    },
    staleTime: 5 * 60 * 1000,
  });

  // User orders — used by /my-orders and home
  if (userId) {
    queryClient.prefetchQuery({
      queryKey: ["my-orders-recent", userId],
      queryFn: async () => {
        const { data } = await (supabase as any)
          .from("storefront_orders")
          .select("id, status, total, currency, created_at, shop_id")
          .eq("buyer_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);
        return data || [];
      },
      staleTime: 60_000,
    });
  }
}
