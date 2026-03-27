/**
 * Utility to mark notifications as resolved/dismissed from destination pages.
 * Uses canonical `app_notifications` table.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

/**
 * Dismiss a notification by its ID.
 */
export async function resolveNotification(notificationId: string): Promise<void> {
  await db
    .from("app_notifications")
    .update({ dismissed_at: new Date().toISOString(), read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", notificationId);
}

/**
 * Dismiss all notifications matching a target entity.
 */
export async function resolveNotificationsByTarget(
  userId: string,
  targetType: string,
  targetId: string
): Promise<void> {
  await db
    .from("app_notifications")
    .update({ dismissed_at: new Date().toISOString(), read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("entity_type", targetType)
    .eq("entity_id", targetId)
    .is("dismissed_at", null);
}
