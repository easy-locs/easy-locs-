/**
 * useDeliveryNotifications — Push notification system for delivery events.
 * PASS81-P: Push Notifications for drivers
 */
import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const NOTIFICATION_SOUNDS = {
  new_job: "/notification.mp3",
  status_update: "/notification.mp3",
  urgent: "/notification.mp3",
};

export function useDeliveryNotifications() {
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const permissionRef = useRef<NotificationPermission>("default");

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    try {
      const result = await Notification.requestPermission();
      permissionRef.current = result;
      return result === "granted";
    } catch {
      return false;
    }
  }, []);

  const sendPushNotification = useCallback((title: string, body: string, icon?: string) => {
    if (permissionRef.current !== "granted") return;
    try {
      new Notification(title, {
        body,
        icon: icon || "/favicon.ico",
        badge: "/favicon.ico",
        tag: `delivery-${Date.now()}`,
        requireInteraction: false,
      });
    } catch {
      // Fallback: toast only
    }
  }, []);

  const playSound = useCallback((type: keyof typeof NOTIFICATION_SOUNDS) => {
    try {
      const audio = new Audio(NOTIFICATION_SOUNDS[type]);
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch {
      // Sound not available
    }
  }, []);

  const handleJobChange = useCallback((payload: any) => {
    const { new: newRow, old: oldRow, eventType } = payload;

    if (eventType === "INSERT" && newRow?.driver_id === user?.id) {
      toast.info("📩 Nouvelle mission assignée !", { description: newRow.pickup_address + " → " + newRow.dropoff_address });
      sendPushNotification("📩 Nouvelle mission", `${newRow.pickup_address} → ${newRow.dropoff_address}`);
      playSound("new_job");
      return;
    }

    if (eventType === "UPDATE" && (newRow?.driver_id === user?.id || newRow?.seller_id === user?.id)) {
      const oldStatus = oldRow?.status;
      const newStatus = newRow?.status;
      if (oldStatus === newStatus) return;

      const statusMessages: Record<string, string> = {
        accepted: "✅ Mission acceptée",
        in_progress: "🚗 Colis récupéré — en route",
        completed: "🏁 Livraison terminée !",
        cancelled: "❌ Mission annulée",
      };

      const msg = statusMessages[newStatus];
      if (msg) {
        toast.info(msg);
        sendPushNotification(msg, newRow.dropoff_address || "");
        playSound(newStatus === "cancelled" ? "urgent" : "status_update");
      }
    }
  }, [user?.id, sendPushNotification, playSound]);

  useEffect(() => {
    if (!user) return;

    // Request permission on mount
    requestPermission();

    // Subscribe to delivery_jobs changes for this user
    const channel = supabase
      .channel(`delivery-notifs-${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "delivery_jobs",
      }, handleJobChange)
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [user, handleJobChange, requestPermission]);

  return { requestPermission };
}
