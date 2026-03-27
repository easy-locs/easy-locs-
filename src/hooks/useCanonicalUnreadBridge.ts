import { useEffect } from "react";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { platformBus } from "@/lib/shared/platform-bus";
import { CANONICAL_APP_EVENTS } from "@/lib/app-shell/canonical-app-events";

export function useCanonicalUnreadBridge() {
  const { unreadCount, refresh } = useUnreadMessages();

  useEffect(() => {
    const unsubs = [
      platformBus.on(CANONICAL_APP_EVENTS.ORBIT_MESSAGE_SENT, () => void refresh()),
      platformBus.on(CANONICAL_APP_EVENTS.ORBIT_MESSAGE_RECEIVED, () => void refresh()),
      platformBus.on(CANONICAL_APP_EVENTS.ORBIT_MESSAGE_READ, () => void refresh()),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [refresh]);

  return {
    canonicalUnreadCount: unreadCount,
  };
}
