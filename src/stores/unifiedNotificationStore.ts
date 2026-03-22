/**
 * Unified notification store — UI state for the notification center.
 * DB (notifications table) remains the source of truth.
 */
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  priority: "low" | "normal" | "high" | "critical";
  category: string;
  read_at: string | null;
  resolved: boolean;
  payload: Record<string, any> | null;
  created_at: string;
}

interface NotificationStoreState {
  notifications: AppNotification[];
  loading: boolean;
  isPanelOpen: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;

  hydrate: (userId: string) => Promise<void>;
  pushLocal: (notif: AppNotification) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  unreadCount: () => number;
  setPanelOpen: (open: boolean) => void;
  setSoundEnabled: (on: boolean) => void;
  setHapticsEnabled: (on: boolean) => void;
  clear: () => void;
}

export const useUnifiedNotificationStore = create<NotificationStoreState>((set, get) => ({
  notifications: [],
  loading: false,
  isPanelOpen: false,
  soundEnabled: true,
  hapticsEnabled: true,

  hydrate: async (userId) => {
    set({ loading: true });
    try {
      // app_notifications is the canonical notification table (in DB types)
      const { data } = await supabase
        .from("app_notifications")
        .select("*")
        .eq("user_id", userId)
        .order("createdAt", { ascending: false })
        .limit(100);
      // Map app_notifications schema to AppNotification interface
      const mapped = (data || []).map((n: any) => ({
        id: n.id,
        user_id: n.user_id,
        type: n.type,
        title: n.title,
        message: n.body,
        link: n.metadata?.link || null,
        priority: n.metadata?.priority || "normal",
        category: n.type,
        read_at: n.read ? n.createdAt : null,
        resolved: n.read,
        payload: n.metadata,
        created_at: n.createdAt,
      }));
      set({ notifications: mapped, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  pushLocal: (notif) => {
    set((s) => {
      // Deduplicate by id
      if (s.notifications.some((n) => n.id === notif.id)) return s;
      return { notifications: [notif, ...s.notifications] };
    });
  },

  markAsRead: async (id) => {
    await supabase
      .from("app_notifications")
      .update({ read: true } as any)
      .eq("id", id);
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      ),
    }));
  },

  markAllAsRead: async (userId) => {
    await supabase
      .from("app_notifications")
      .update({ read: true } as any)
      .eq("user_id", userId)
      .eq("read", false);
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.read_at ? n : { ...n, read_at: new Date().toISOString() }
      ),
    }));
  },

  unreadCount: () => get().notifications.filter((n) => !n.read_at && !n.resolved).length,

  setPanelOpen: (open) => set({ isPanelOpen: open }),
  setSoundEnabled: (on) => set({ soundEnabled: on }),
  setHapticsEnabled: (on) => set({ hapticsEnabled: on }),
  clear: () => set({ notifications: [], isPanelOpen: false }),
}));
