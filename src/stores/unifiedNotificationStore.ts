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
      // Read from canonical `notifications` table (172+ real rows)
      const { data } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .limit(100);
      const mapped = (data || []).map((n: any) => ({
        id: n.id,
        user_id: n.user_id,
        type: n.type || "system",
        title: n.title || "Notification",
        message: n.message || n.body || "",
        link: n.link || n.cta_url || null,
        priority: n.priority || "normal",
        category: n.notification_type || n.type || "system",
        read_at: n.read_at || (n.read ? n.created_at : null),
        resolved: n.resolved || false,
        payload: n.metadata_json,
        created_at: n.created_at,
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
    await (supabase as any)
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("id", id);
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      ),
    }));
  },

  markAllAsRead: async (userId) => {
    await (supabase as any)
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
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
