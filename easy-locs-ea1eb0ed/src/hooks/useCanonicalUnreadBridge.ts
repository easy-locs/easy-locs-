import { useEffect } from "react";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

export function useCanonicalUnreadBridge() {
  const { unreadCount, refresh } = useUnreadMessages();

  useEffect(() => {
    const unsubs = [
      platformBus.on(APP_EVENTS.ORBIT_MESSAGE_SENT, () => void refresh()),
      platformBus.on(APP_EVENTS.ORBIT_MESSAGE_RECEIVED, () => void refresh()),
      platformBus.on(APP_EVENTS.ORBIT_MESSAGE_READ, () => void refresh()),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [refresh]);

  return {
    canonicalUnreadCount: unreadCount,
  };
}
