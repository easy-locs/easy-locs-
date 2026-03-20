import { create } from "zustand";
import type { AppNotificationRecord } from "@/lib/types/notification";
import { notificationsRepo } from "@/lib/supabase/notifications-repo";

type NotificationsStore = {
  items: AppNotificationRecord[];
  loading: boolean;

  hydrate: (orbitId: string) => Promise<void>;
  push: (input: Omit<AppNotificationRecord, "id" | "createdAt" | "read">) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  unreadCount: () => number;
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
}));
