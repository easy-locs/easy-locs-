/**
 * Query prefetch config — PASS145
 * Prefetch critical data on app boot for instant navigation.
 * Enhanced with wallet, conversations, and property data prefetching.
 */
import type { QueryClient } from "@tanstack/react-query";
import { db } from "@/services/db";

export function prefetchCriticalData(queryClient: QueryClient, userId?: string) {
  queryClient.prefetchQuery({
    queryKey: ["shops-browse"],
    queryFn: async () => {
      const { data } = await db
        .from("storefront_pages")
        .select("id, name, slug, logo_url, description, vertical, boost_tier, boost_until, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []).map((s: any) => ({ ...s, title: s.name }));
    },
    staleTime: 5 * 60 * 1000,
  });

  if (userId) {
    queryClient.prefetchQuery({
      queryKey: ["my-orders-recent", userId],
      queryFn: async () => {
        const { data } = await db
          .from("storefront_orders")
          .select("id, status, total, currency, created_at, shop_id")
          .eq("buyer_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);
        return data || [];
      },
      staleTime: 60_000,
    });

    queryClient.prefetchQuery({
      queryKey: ["wallet-balance", userId],
      queryFn: async () => {
        const { data } = await db
          .from("wallet_accounts")
          .select("id, available_balance, currency, status")
          .eq("user_id", userId)
          .eq("status", "active")
          .limit(1);
        return data?.[0] || null;
      },
      staleTime: 60_000,
    });

    queryClient.prefetchQuery({
      queryKey: ["conversations-recent", userId],
      queryFn: async () => {
        const { data } = await db
          .from("conversations_v2")
          .select("id, last_message, last_message_at, title, avatar_url")
          .order("last_message_at", { ascending: false })
          .limit(20);
        return data || [];
      },
      staleTime: 30_000,
    });

    queryClient.prefetchQuery({
      queryKey: ["properties-count", userId],
      queryFn: async () => {
        const { count } = await db
          .from("properties")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);
        return count ?? 0;
      },
      staleTime: 5 * 60 * 1000,
    });
  }
}
