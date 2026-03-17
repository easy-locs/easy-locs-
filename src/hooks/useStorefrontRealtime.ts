/**
 * StorefrontRealtimeSync — PASS123-124: Realtime subscription for storefront orders.
 * Provides live order status updates for both buyers and sellers.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { platformBus } from "@/lib/shared/platform-bus";
import { toast } from "sonner";

interface Props {
  shopId?: string;  // Seller mode: subscribe to shop orders
  buyerId?: string; // Buyer mode: subscribe to buyer orders
}

export function useStorefrontRealtime({ shopId, buyerId }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!shopId && !buyerId) return;

    const channel = supabase
      .channel(`storefront-orders-${shopId || buyerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "storefront_orders",
          ...(shopId ? { filter: `shop_id=eq.${shopId}` } : { filter: `buyer_id=eq.${buyerId}` }),
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          // Refresh queries
          if (shopId) {
            qc.invalidateQueries({ queryKey: ["shop-orders", shopId] });
            qc.invalidateQueries({ queryKey: ["seller-analytics-v2", shopId] });
            qc.invalidateQueries({ queryKey: ["shop-event-stats", shopId] });
          }
          if (buyerId) {
            qc.invalidateQueries({ queryKey: ["buyer-orders", buyerId] });
            qc.invalidateQueries({ queryKey: ["buyer-stats", buyerId] });
          }

          // Emit platform bus event
          if (eventType === "INSERT") {
            platformBus.emit("marketplace:booking_created", {
              orderId: (newRecord as any)?.id,
              type: "storefront_order",
            }, "marketplace", { userId: user?.id, orgId: undefined });

            if (shopId) toast.info("🛒 New order received!");
          }

          if (eventType === "UPDATE") {
            const newStatus = (newRecord as any)?.status;
            const oldStatus = (oldRecord as any)?.status;
            if (newStatus !== oldStatus) {
              if (newStatus === "completed") {
                platformBus.emit("marketplace:booking_completed", {
                  orderId: (newRecord as any)?.id,
                }, "marketplace", { userId: user?.id });
              }
              if ((newRecord as any)?.payment_status === "paid") {
                platformBus.emit("marketplace:booking_paid", {
                  orderId: (newRecord as any)?.id,
                  total: (newRecord as any)?.total,
                }, "marketplace", { userId: user?.id });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, buyerId, qc, user]);
}
