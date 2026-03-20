/**
 * Unified notification dispatcher — listens for realtime inserts on `notifications` table
 * and dispatches to store, sounds, haptics, and toasts.
 */
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedNotificationStore, type AppNotification } from "@/stores/unifiedNotificationStore";
import { resolveDeepLink } from "@/lib/notifications/deepLinks";
import { playSoundForType, startRingtone, stopRingtone } from "@/lib/notifications/sounds";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

let activeChannel: { unsubscribe: () => void } | null = null;

export function startUnifiedNotificationDispatcher(userId: string) {
  stopUnifiedNotificationDispatcher();

  const channel = supabase
    .channel(`unified-notifs-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as any;
        if (!row || row.resolved) return;

        const notif: AppNotification = {
          id: row.id,
          user_id: row.user_id,
          type: row.type || "system",
          title: row.title || "Notification",
          message: row.message || "",
          link: row.link || null,
          priority: row.priority || "normal",
          category: row.category || "system",
          read_at: row.read_at || null,
          resolved: row.resolved || false,
          payload: row.payload || null,
          created_at: row.created_at,
        };

        const store = useUnifiedNotificationStore.getState();

        // Push to local store (deduped)
        store.pushLocal(notif);

        // Sound
        if (store.soundEnabled) {
          if (notif.type.includes("call")) {
            startRingtone();
          } else {
            playSoundForType(notif.type);
          }
        }

        // Haptics
        if (store.hapticsEnabled) {
          const priority = notif.priority;
          if (priority === "critical") haptic("heavy");
          else if (priority === "high") haptic("medium");
          else haptic("light");
        }

        // Toast for non-low priority
        if (notif.priority !== "low") {
          toast(notif.title, {
            description: notif.message,
            action: notif.link
              ? {
                  label: "View",
                  onClick: () => {
                    window.location.href = resolveDeepLink(notif.type, notif.link);
                  },
                }
              : undefined,
          });
        }
      },
    )
    .subscribe();

  activeChannel = channel;
}

export function stopUnifiedNotificationDispatcher() {
  if (activeChannel) {
    activeChannel.unsubscribe();
    activeChannel = null;
  }
  stopRingtone();
}
