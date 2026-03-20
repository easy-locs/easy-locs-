import { create } from "zustand";
import type { AppNotificationRecord } from "@/lib/types/notification";
import { notificationsRepo } from "@/lib/supabase/notifications-repo";
import { supabase } from "@/integrations/supabase/client";

type NotificationsStore = {
  items: AppNotificationRecord[];
  loading: boolean;

  hydrate: (orbitId: string) => Promise<void>;
  push: (input: Omit<AppNotificationRecord, "id" | "createdAt" | "read">) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  unreadCount: () => number;
  subscribeRealtime: () => void;
};

export const useNotificationsStore = create<NotificationsStore>((set, get) => ({
  items: [],
  loading: false,

  hydrate: async (orbitId) => {
    set({ loading: true });
    try {
      const items = await notificationsRepo.listByOrbitId(orbitId);
      set({ items, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  push: async (input) => {
    const notification: AppNotificationRecord = {
      id: `notif_${Math.random().toString(36).slice(2, 11)}`,
      orbitId: input.orbitId,
      type: input.type,
      title: input.title,
      body: input.body,
      read: false,
      createdAt: new Date().toISOString(),
      metadata: input.metadata,
    };

    const saved = await notificationsRepo.create(notification);

    set((state) => ({
      items: [saved, ...state.items],
    }));
  },

  markRead: async (id) => {
    await notificationsRepo.markRead(id);

    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, read: true } : item
      ),
    }));
  },

  unreadCount: () => get().items.filter((i) => !i.read).length,

  subscribeRealtime: () => {
    supabase
      .channel("app_notifications_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "app_notifications",
        },
        (payload) => {
          const row = payload.new as any;
          const record: AppNotificationRecord = {
            id: row.id,
            orbitId: row.orbitId,
            type: row.type,
            title: row.title,
            body: row.body,
            read: row.read ?? false,
            createdAt: row.createdAt,
            metadata: row.metadata,
          };
          set((s) => ({ items: [record, ...s.items] }));
        }
      )
      .subscribe();
  },
}));
