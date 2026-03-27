import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import { useAuth } from "@/contexts/AuthContext";

export function useNotificationBellSync() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setCount(0);
      return;
    }

    const { count: notifCount } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);

    setCount(notifCount ?? 0);
  }, [user?.id]);

  useEffect(() => {
    void refresh();

    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-bell:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => void refresh()
      )
      .subscribe();

    const unsub1 = platformBus.on(APP_EVENTS.NOTIFICATIONS_REFRESH, () => {
      void refresh();
    });

    const unsub2 = platformBus.on(APP_EVENTS.ORBIT_MESSAGE_SENT, () => {
      void refresh();
    });

    const unsub3 = platformBus.on(APP_EVENTS.WALLET_PAYMENT_SUCCESS, () => {
      void refresh();
    });

    return () => {
      supabase.removeChannel(channel);
      unsub1();
      unsub2();
      unsub3();
    };
  }, [refresh, user?.id]);

  return {
    notificationCount: count,
    refreshNotifications: refresh,
  };
}
