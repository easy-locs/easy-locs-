/**
 * StorefrontRealtimeSync — PASS123-124: Realtime subscription for storefront orders.
 * Emits proper storefront:* bus events consumed by storefront-reactions.
 */
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { useAuth } from "@/contexts/AuthContext";
import { platformBus } from "@/lib/shared/platform-bus";
import { toast } from "sonner";

interface Props {
  shopId?: string;
  buyerId?: string;
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
          const { eventType, new: rec, old: oldRec } = payload;
          const newRecord = rec as any;
          const oldRecord = oldRec as any;

          if (eventType === "INSERT") {
            platformBus.emit("storefront:order_placed", {
              orderId: newRecord?.id,
              shopId: newRecord?.shop_id,
              total: newRecord?.total,
              currency: newRecord?.currency,
            }, "marketplace", { userId: user?.id });

            if (shopId) toast.info("🛒 New order received!");
          }

          if (eventType === "UPDATE" && newRecord?.status !== oldRecord?.status) {
            const status = newRecord.status;
            const eventPayload = {
              orderId: newRecord.id,
              shopId: newRecord.shop_id,
              total: newRecord.total,
              currency: newRecord.currency,
            };

            if (status === "shipped") {
              platformBus.emit("storefront:order_shipped", eventPayload, "marketplace", { userId: user?.id });
            } else if (status === "completed") {
              platformBus.emit("storefront:order_completed", eventPayload, "marketplace", { userId: user?.id });
            } else if (status === "cancelled") {
              platformBus.emit("storefront:order_cancelled", eventPayload, "marketplace", { userId: user?.id });
            }

            if (newRecord.payment_status === "paid" && oldRecord?.payment_status !== "paid") {
              platformBus.emit("storefront:order_paid", eventPayload, "marketplace", { userId: user?.id });
            }
          }
        }
      )
      .subscribe();

    return () => {
      removeRealtimeChannel(channel);
    };
  }, [shopId, buyerId, qc, user]);
}
