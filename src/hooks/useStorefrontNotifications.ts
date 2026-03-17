/**
 * useStorefrontNotifications — PASS122: Realtime notification listener.
 * Subscribes to storefront_notification_log for the current user
 * and shows toast + badge count in real-time. Zero setup.
 */
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useStorefrontNotifications(shopId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch initial unread count
  useEffect(() => {
    if (!user?.id) return;
    const fetchCount = async () => {
      const query = (supabase as any)
        .from("storefront_notification_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (shopId) query.eq("shop_id", shopId);
      const { count } = await query;
      setUnreadCount(count || 0);
    };
    fetchCount();
  }, [user?.id, shopId]);

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "storefront_notification_log",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const rec = payload.new as any;
          setUnreadCount((c) => c + 1);
          toast.info(rec.title || "New notification", {
            description: rec.body,
          });
          qc.invalidateQueries({ queryKey: ["notif-log"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  const markAllRead = async () => {
    if (!user?.id) return;
    const query = (supabase as any)
      .from("storefront_notification_log")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    if (shopId) query.eq("shop_id", shopId);
    await query;
    setUnreadCount(0);
    qc.invalidateQueries({ queryKey: ["notif-log"] });
  };

  return { unreadCount, markAllRead };
}
