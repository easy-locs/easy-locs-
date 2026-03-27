/**
 * Canonical notification realtime subscription — notifications_v2 only.
 * Actor-scoped: each user subscribes only to their own notifications.
 */
import { supabase } from "@/integrations/supabase/client";
import type { NotificationRow } from "./notification-service";

let activeChannel: ReturnType<typeof supabase.channel> | null = null;

/** Subscribe to realtime notifications for a user */
export function subscribeNotifications(
  userId: string,
  onInsert: (notif: NotificationRow) => void
) {
  unsubscribeNotifications();

  const channel = supabase
    .channel(`notif-v2-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "app_notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onInsert(payload.new as NotificationRow);
      }
    )
    .subscribe();

  activeChannel = channel;
  return channel;
}

/** Unsubscribe from realtime notifications */
export function unsubscribeNotifications() {
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }
}
