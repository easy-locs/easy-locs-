import { supabase } from "@/integrations/supabase/client";
import type { AppNotificationRecord } from "@/lib/types/notification";

// Using type assertion since the table may not be in generated types yet
const db = supabase as any;

export const notificationsRepo = {
  async create(notification: AppNotificationRecord): Promise<AppNotificationRecord> {
    const { data, error } = await db
      .from("app_notifications")
      .insert(notification)
      .select()
      .single();

    if (error) throw error;
    return data as AppNotificationRecord;
  },

  async listByOrbitId(orbitId: string): Promise<AppNotificationRecord[]> {
    const { data, error } = await db
      .from("app_notifications")
      .select("*")
      .eq("orbitId", orbitId)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return (data ?? []) as AppNotificationRecord[];
  },

  async markRead(id: string): Promise<void> {
    const { error } = await db
      .from("app_notifications")
      .update({ read: true })
      .eq("id", id);

    if (error) throw error;
  },
};
