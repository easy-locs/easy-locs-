/**
 * useUnreadMessages — Canonical V2-only unread message counter.
 * Counts unread from chat_messages_v2 only.
 * Subscribes to realtime + platform bus for instant updates.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { useAuth } from "@/contexts/AuthContext";
import { platformBus } from "@/lib/shared/platform-bus";
import { fetchUnreadCount } from "@/repositories/communication.repository";

export function useUnreadMessages() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!user?.id) {
      setCount(0);
      return;
    }

    try {
      const unread = await fetchUnreadCount(user.id);
      setCount(unread);
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
      removeRealtimeChannel(channel);
      unsub();
    };
  }, [fetchCount]);

  return { unreadCount: count, refresh: fetchCount };
}
