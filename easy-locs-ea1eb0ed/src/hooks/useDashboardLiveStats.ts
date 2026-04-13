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
  /** Whether the current user has uploaded at least one identity/profile document. */
  hasDocuments: boolean;
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
        .eq("buyer_id", user?.id)
        .in("status", [...ACTIVE_ORDER_STATUSES]);
      return count ?? 0;
    },
  });

  // Check if the user has at least one profile/identity document uploaded.
  // property_documents is the canonical user-linked document table (user_id FK).
  const { data: hasDocuments = false, isLoading: docsLoading } = useQuery({
    queryKey: ["dashboard-live-stats", "has-documents", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000, // 5 min — documents change infrequently
    queryFn: async () => {
      const { count } = await db("property_documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id)
        .limit(1);
      return (count ?? 0) > 0;
    },
  });

  return {
    walletBalance: balance,
    walletCurrency: currency || "EUR",
    unreadMessages,
    activeOrders,
    hasDocuments,
    loading: walletLoading || ordersLoading || docsLoading,
  };
}
