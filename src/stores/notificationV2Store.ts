/**
 * Canonical Notification Store — notifications_v2 only.
 * Replaces unifiedNotificationStore for all notification UI.
 */
import { create } from "zustand";
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead as svcMarkAsRead,
  markAllAsRead as svcMarkAllAsRead,
  dismissNotification as svcDismiss,
  markClicked as svcMarkClicked,
  type NotificationRow,
} from "@/lib/notifications-v2/notification-service";
import { subscribeNotifications, unsubscribeNotifications } from "@/lib/notifications-v2/notification-realtime";
import { resolveDeliveryPolicy } from "@/lib/notifications-v2/notification-delivery-policy";
import { toast } from "sonner";

interface NotificationV2State {
  notifications: NotificationRow[];
  unreadCount: number;
  loading: boolean;
  hydrated: boolean;

  hydrate: (userId: string) => Promise<void>;
  startRealtime: (userId: string) => void;
  stopRealtime: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  click: (id: string) => Promise<void>;
  clear: () => void;
}

export const useNotificationV2Store = create<NotificationV2State>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  hydrated: false,

  hydrate: async (userId) => {
    set({ loading: true });
    try {
      const [notifs, count] = await Promise.all([
        getUserNotifications(userId, 50),
        getUnreadCount(userId),
      ]);
      set({ notifications: notifs, unreadCount: count, loading: false, hydrated: true });
    } catch {
      set({ loading: false });
    }
  },

  startRealtime: (userId) => {
    subscribeNotifications(userId, (notif) => {
      set((s) => {
        // Deduplicate
        if (s.notifications.some((n) => n.id === notif.id)) return s;
        const policy = resolveDeliveryPolicy(notif.priority, notif.type);
        // Toast
        if (policy.showToast) {
          toast(notif.title, {
            description: notif.body,
            action: notif.action_url
              ? { label: "View", onClick: () => { window.location.href = notif.action_url!; } }
              : undefined,
          });
        }
        // Sound
        if (policy.playSound) {
          try {
            const audio = new Audio("/notification.mp3");
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch {}
        }
        // Vibrate
        if (policy.vibrate && "vibrate" in navigator) {
          navigator.vibrate([150, 80, 150]);
        }

        return {
          notifications: [notif, ...s.notifications].slice(0, 100),
          unreadCount: s.unreadCount + 1,
        };
      });
    });
  },

  stopRealtime: () => {
    unsubscribeNotifications();
  },

  markAsRead: async (id) => {
    await svcMarkAsRead(id);
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - (s.notifications.find((n) => n.id === id && !n.read_at) ? 1 : 0)),
    }));
  },

  markAllAsRead: async (userId) => {
    await svcMarkAllAsRead(userId);
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
      unreadCount: 0,
    }));
  },

  dismiss: async (id) => {
    await svcDismiss(id);
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
      unreadCount: Math.max(0, s.unreadCount - (s.notifications.find((n) => n.id === id && !n.read_at) ? 1 : 0)),
    }));
  },

  click: async (id) => {
    await svcMarkClicked(id);
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString(), clicked_at: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - (s.notifications.find((n) => n.id === id && !n.read_at) ? 1 : 0)),
    }));
  },

  clear: () => {
    unsubscribeNotifications();
    set({ notifications: [], unreadCount: 0, loading: false, hydrated: false });
  },
}));
