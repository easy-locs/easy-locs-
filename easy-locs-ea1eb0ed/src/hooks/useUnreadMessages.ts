/**
 * useUnreadMessages — Canonical V2-only unread message counter.
 * Counts unread from chat_messages_v2 only.
 * Subscribes to realtime + platform bus for instant updates.
 */
import { useState, useEffect, useCallback } from "react";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { registerSubscription } from "@/lib/realtime/subscription-registry";
import { useAuthSession } from "@/contexts/AuthContext";
import { platformBus } from "@/lib/shared/platform-bus";
import { fetchUnreadCount } from "@/repositories/communication.repository";

export function useUnreadMessages() {
  const { user } = useAuthSession();
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
    if (!user?.id) {
      setCount(0);
      return;
    }

    fetchCount();

    const unsubRegistry = registerSubscription(`orbit.unread:${user.id}`, () => {
      const channel = createRealtimeChannel("unread-v2-only")
        .on("postgres_changes", { event: "INSERT", schema: "orbit", table: "chat_messages_v2" }, fetchCount)
        .on("postgres_changes", { event: "UPDATE", schema: "orbit", table: "chat_messages_v2" }, fetchCount)
        .subscribe();
      return () => removeRealtimeChannel(channel);
    });

    const unsub = platformBus.on("orbit:message_sent", () => {
      setTimeout(fetchCount, 300);
    });

    return () => {
      unsubRegistry();
      unsub();
    };
  }, [user?.id, fetchCount]);

  return { unreadCount: count, refresh: fetchCount };
}
