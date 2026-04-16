/**
 * notification.store — Canonical notification store.
 * Single source of truth for all notification state.
 * Reads from notifications_v2 table only.
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
} from "@/lib/notification-service/notification-service";
import { subscribeNotifications, unsubscribeNotifications } from "@/lib/notification-service/notification-realtime";
import { resolveDeliveryPolicy } from "@/lib/notification-service/notification-delivery-policy";
import { toast } from "sonner";
import { NotificationSound } from "@/families/notifications/notification-sound";
import { NotificationVibration } from "@/families/notifications/notification-vibration";
import { crossTabSync, TAB_SYNC_CHANNELS } from "@/lib/cross-tab-sync";

interface NotificationState {
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

export const useNotificationStore = create<NotificationState>((set, get) => ({
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
      crossTabSync.publish(TAB_SYNC_CHANNELS.NOTIFICATION_COUNT, { count });
    } catch {
      set({ loading: false });
    }
  },

  startRealtime: (userId) => {
    subscribeNotifications(userId, (notif) => {
      set((s) => {
        if (s.notifications.some((n) => n.id === notif.id)) return s;
        const policy = resolveDeliveryPolicy(notif.priority, notif.type);
        if (policy.showToast) {
          toast(notif.title, {
            description: notif.body,
            action: notif.action_url
              ? { label: "View", onClick: () => { window.location.href = notif.action_url!; } }
              : undefined,
          });
        }
        if (policy.playSound) {
          NotificationSound.play("notification", 0.3);
        }
        if (policy.vibrate) {
          NotificationVibration.once([150, 80, 150]);
        }
        const newCount = s.unreadCount + 1;
        crossTabSync.publish(TAB_SYNC_CHANNELS.NOTIFICATION_COUNT, { count: newCount });
        return {
          notifications: [notif, ...s.notifications].slice(0, 100),
          unreadCount: newCount,
        };
      });
    });
  },

  stopRealtime: () => {
    unsubscribeNotifications();
  },

  markAsRead: async (id) => {
    await svcMarkAsRead(id);
    const wasUnread = get().notifications.find((n) => n.id === id && !n.read_at);
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - (wasUnread ? 1 : 0)),
    }));
    if (wasUnread) {
      crossTabSync.publish(TAB_SYNC_CHANNELS.NOTIFICATION_COUNT, { count: get().unreadCount });
    }
  },

  markAllAsRead: async (userId) => {
    await svcMarkAllAsRead(userId);
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
      unreadCount: 0,
    }));
    crossTabSync.publish(TAB_SYNC_CHANNELS.NOTIFICATION_COUNT, { count: 0 });
  },

  dismiss: async (id) => {
    const wasUnread = get().notifications.find((n) => n.id === id && !n.read_at);
    await svcDismiss(id);
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
      unreadCount: Math.max(0, s.unreadCount - (wasUnread ? 1 : 0)),
    }));
    if (wasUnread) {
      crossTabSync.publish(TAB_SYNC_CHANNELS.NOTIFICATION_COUNT, { count: get().unreadCount });
    }
  },

  click: async (id) => {
    const wasUnread = get().notifications.find((n) => n.id === id && !n.read_at);
    await svcMarkClicked(id);
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString(), clicked_at: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - (wasUnread ? 1 : 0)),
    }));
    if (wasUnread) {
      crossTabSync.publish(TAB_SYNC_CHANNELS.NOTIFICATION_COUNT, { count: get().unreadCount });
    }
  },

  clear: () => {
    unsubscribeNotifications();
    set({ notifications: [], unreadCount: 0, loading: false, hydrated: false });
  },
}));
