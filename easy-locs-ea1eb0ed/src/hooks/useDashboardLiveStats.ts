import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletBalance } from "@/payments/wallet-hooks";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { db } from "@/services/db";

const ACTIVE_ORDER_STATUSES = ["pending", "confirmed", "preparing", "ready_for_pickup", "on_the_way", "driver_assigned"] as const;

export interface DashboardLiveStats {
  walletBalance: number;
  walletCurrency: string;
  unreadMessages: number;
  activeOrders: number;
  loading: boolean;
}

export function useDashboardLiveStats(): DashboardLiveStats {
  const { user } = useAuth();
  const { balance, currency, loading: walletLoading } = useWalletBalance();
  const { unreadCount: unreadMessages } = useUnreadMessages();

  const { data: activeOrders = 0, isLoading: ordersLoading } = useQuery({
    queryKey: ["dashboard-live-stats", "active-orders", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { count } = await db("storefront_orders")
        .select("*", { count: "exact", head: true })
        .eq("buyer_id", user!.id)
        .in("status", [...ACTIVE_ORDER_STATUSES]);
      return count ?? 0;
    },
  });

  return {
    walletBalance: balance,
    walletCurrency: currency || "AED",
    unreadMessages,
    activeOrders,
    loading: walletLoading || ordersLoading,
  };
}
