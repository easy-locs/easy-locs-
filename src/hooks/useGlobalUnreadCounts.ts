import { useMemo } from "react";
import { useAppNotifications } from "@/hooks/useAppNotifications";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

export function useGlobalUnreadCounts(userId?: string | null) {
  const notifications = useAppNotifications(userId);
  const messages = useUnreadMessages();

  const totalUnread = useMemo(() => {
    return (notifications.unreadCount || 0) + (messages.unreadCount || 0);
  }, [notifications.unreadCount, messages.unreadCount]);

  return {
    notificationsUnread: notifications.unreadCount,
    messagesUnread: messages.unreadCount,
    totalUnread,
    reloadAll: async () => {
      await notifications.reload();
      await messages.refresh();
    },
  };
}
