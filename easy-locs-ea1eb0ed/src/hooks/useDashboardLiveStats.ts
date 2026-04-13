import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletBalance } from "@/payments/wallet-hooks";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

const ACTIVE_ORDER_STATUSES = ["pending", "confirmed", "preparing", "ready_for_pickup", "on_the_way", "driver_assigned"] as const;

export interface DashboardLiveStats {
  walletBalance: number;
  walletCurrency: string;
  totalRevenue: number;
  unreadMessages: number;
  activeOrders: number;
  /** Whether the current user has uploaded at least one identity/profile document. */
  hasDocuments: boolean;
  loading: boolean;
}

export function useDashboardLiveStats(): DashboardLiveStats {
  const { user } = useAuth();
  const { balance, currency, loading: walletLoading } = useWalletBalance();
  const { unreadCount: unreadMessages } = useUnreadMessages();
  const queryClient = useQueryClient();

  const { data: activeOrders = 0, isLoading: ordersLoading } = useQuery({
    queryKey: ["dashboard-live-stats", "active-orders", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { count } = await db("storefront_orders")
        .select("*", { count: "exact", head: true })
        .eq("buyer_id", user?.id)
        .in("status", [...ACTIVE_ORDER_STATUSES]);
      return count ?? 0;
    },
  });

  // Check if the user has at least one profile/identity document uploaded.
  const { data: hasDocuments = false, isLoading: docsLoading } = useQuery({
    queryKey: ["dashboard-live-stats", "has-documents", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { count } = await db("property_documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id)
        .limit(1);
      return (count ?? 0) > 0;
    },
  });

  const { data: totalRevenue = 0, isLoading: revenueLoading } = useQuery({
    queryKey: ["dashboard-live-stats", "total-revenue", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await db("wallet_transactions")
        .select("amount")
        .eq("recipient_id", user!.id)
        .eq("status", "completed");
      return Array.isArray(data)
        ? (data as { amount: number }[]).reduce((sum, tx) => sum + (tx.amount ?? 0), 0)
        : 0;
    },
  });

  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  useEffect(() => {
    const unsub = platformBus.on(APP_EVENTS.WALLET_BALANCE_UPDATED, () => {
      void queryClient.invalidateQueries({
        queryKey: ["dashboard-live-stats", "total-revenue", userIdRef.current],
      });
    });

    const unsub2 = platformBus.on(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard-live-stats"] });
    });

    return () => {
      unsub();
      unsub2();
    };
  }, [queryClient]);

  return {
    walletBalance: balance,
    walletCurrency: currency || "EUR",
    totalRevenue,
    unreadMessages,
    activeOrders,
    hasDocuments,
    loading: walletLoading || ordersLoading || docsLoading || revenueLoading,
  };
}
