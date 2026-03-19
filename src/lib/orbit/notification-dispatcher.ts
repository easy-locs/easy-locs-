/**
 * Orbit Notification Dispatcher — bridges DB notifications to in-app alerts.
 * Handles incoming calls, messages, wallet events with deep links and ringtone triggers.
 */
import { supabase } from "@/integrations/supabase/client";
import { pushNotification, type NotificationType } from "./notification-engine";
import { startRingtone, stopRingtone, playNotificationSound } from "@/lib/ringtone";
import { haptic } from "@/lib/haptics";

// ─── Type mapping from DB notification.type to Orbit NotificationType ───
const TYPE_MAP: Record<string, NotificationType> = {
  incoming_call: "incoming_call",
  call: "incoming_call",
  message: "message",
  payment: "payment_received",
  payment_received: "payment_received",
  payment_request: "payment_request",
  delivery: "delivery_update",
  ride: "ride_update",
  booking: "booking_confirmed",
  rent: "rent_due",
  order: "order_update",
  security: "security_alert",
  system: "system",
};

// ─── Deep link routes for each notification type ───
const DEEP_LINKS: Record<string, string> = {
  incoming_call: "/dashboard/communication?section=calls",
  message: "/dashboard/communication",
  payment_received: "/wallet/hub",
  payment_request: "/wallet/hub",
  delivery_update: "/my-orders",
  ride_update: "/ride",
  booking_confirmed: "/my-orders",
  rent_due: "/property-hub",
  order_update: "/my-orders",
  security_alert: "/dashboard/settings",
  system: "/",
};

export interface NotificationDispatcherConfig {
  userId: string;
  isGhostMode?: boolean;
  onIncomingCall?: (notification: any) => void;
}

let activeSubscription: { unsubscribe: () => void } | null = null;

/**
 * Start listening for real-time notifications from the database.
 * Dispatches to the in-app notification engine with appropriate sounds/haptics.
 */
export function startNotificationDispatcher(config: NotificationDispatcherConfig) {
  // Clean up any existing subscription
  stopNotificationDispatcher();

  const channel = supabase
    .channel(`orbit-notifications-${config.userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${config.userId}`,
      },
      (payload) => {
        const notif = payload.new as any;
        if (!notif || notif.resolved) return;

        const orbitType = TYPE_MAP[notif.type] || "system";
        const route = notif.link || DEEP_LINKS[orbitType] || "/";

        // Handle incoming calls specially — trigger ringtone
        if (orbitType === "incoming_call") {
          startRingtone("audio");
          haptic("heavy");
          config.onIncomingCall?.(notif);
        } else if (["payment_received", "payment_request"].includes(orbitType)) {
          playNotificationSound();
          haptic("medium");
        } else if (orbitType === "message") {
          playNotificationSound();
          haptic("light");
        }

        // Push to in-app notification engine
        pushNotification(
          orbitType,
          {
            title: notif.title || "Notification",
            body: notif.message || "",
            ghostBody: "New notification",
            route,
            contextType: notif.type,
            contextId: notif.id,
            groupKey: notif.type,
          },
          config.isGhostMode,
        );
      },
    )
    .subscribe();

  activeSubscription = channel;
  console.debug("[notification-dispatcher] started for user", config.userId);
}

/**
 * Stop the notification dispatcher and clean up subscriptions.
 */
export function stopNotificationDispatcher() {
  if (activeSubscription) {
    activeSubscription.unsubscribe();
    activeSubscription = null;
    console.debug("[notification-dispatcher] stopped");
  }
  stopRingtone();
}
