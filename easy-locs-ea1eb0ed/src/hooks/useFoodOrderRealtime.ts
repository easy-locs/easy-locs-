import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/services/db";
import { toast } from "sonner";
import { NotificationSound } from "@/families/notifications/notification-sound";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export function useFoodOrderRealtime(shopId: string | undefined) {
  const qc = useQueryClient();
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    if (!shopId) return;
    mountedAt.current = Date.now();

    const channel = db
      .channel(`food-orders-${shopId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "storefront_orders",
          filter: `shop_id=eq.${shopId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          qc.invalidateQueries({ queryKey: ["food-active-orders", shopId] });
          qc.invalidateQueries({ queryKey: ["food-daily-stats", shopId] });
          qc.invalidateQueries({ queryKey: ["kitchen-queue", shopId] });
          qc.invalidateQueries({ queryKey: ["merchant-order-board", shopId] });
          qc.invalidateQueries({ queryKey: ["merchant-kds-orders", shopId] });

          if (payload.eventType === "INSERT" && Date.now() - mountedAt.current > 2000) {
            NotificationSound.play("order_new");
            const orderId = (payload.new as Record<string, unknown>)?.id as string | undefined;
            toast.info("New order received!", {
              description: orderId ? `Order #${orderId.slice(0, 8)}` : undefined,
              duration: 8000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [shopId, qc]);
}

export function useFoodOrderTrackingRealtime(orderId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!orderId) return;

    const channel = db
      .channel(`food-order-track-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "storefront_orders",
          filter: `id=eq.${orderId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["order-detail", orderId] });
          qc.invalidateQueries({ queryKey: ["unified-order", orderId] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [orderId, qc]);
}
