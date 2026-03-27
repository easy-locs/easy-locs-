/**
 * useUnreadMessages — Canonical V2-only unread message counter.
 * Counts unread from chat_messages_v2 only.
 * Subscribes to realtime + platform bus for instant updates.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { platformBus } from "@/lib/shared/platform-bus";

const db = supabase as any;

export function useUnreadMessages() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!user?.id) {
      setCount(0);
      return;
    }

    try {
      const { count: unread } = await db
        .from("chat_messages_v2")
        .select("id", { count: "exact", head: true })
        .is("read_at", null)
        .neq("sender_user_id", user.id);

      setCount(unread ?? 0);
    } catch {
      setCount(0);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchCount();

    const channel = supabase
      .channel("unread-v2-only")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages_v2" }, fetchCount)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages_v2" }, fetchCount)
      .subscribe();

    const unsub = platformBus.on("orbit:message_sent", () => {
      setTimeout(fetchCount, 300);
    });

    return () => {
      supabase.removeChannel(channel);
      unsub();
    };
  }, [fetchCount]);

  return { unreadCount: count, refresh: fetchCount };
}
