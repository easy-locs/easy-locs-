/**
 * Utility to mark notifications as resolved from destination pages.
 * Call this when the related action is completed (booking confirmed, payment validated, etc.)
 */
import { supabase } from "@/integrations/supabase/client";

/**
 * Mark a notification as resolved by its ID.
 */
export async function resolveNotification(notificationId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ resolved: true, resolved_at: new Date().toISOString() } as any)
    .eq("id", notificationId);
}

/**
 * Mark all notifications matching a target_id as resolved.
 * Useful when a booking/payment/document action is completed.
 */
export async function resolveNotificationsByTarget(
  userId: string,
  targetType: string,
  targetId: string
): Promise<void> {
  // We need to find notifications with matching metadata
  const { data } = await supabase
    .from("notifications")
    .select("id, metadata_json")
    .eq("user_id", userId)
    .eq("resolved", false);

  if (!data) return;

  const matching = data.filter((n: any) => {
    const meta = n.metadata_json;
    if (!meta) return false;
    return (
      (String(meta.target_type) === targetType && String(meta.target_id) === targetId) ||
      (String(meta.target_type) === targetType && String(meta.booking_id) === targetId)
    );
  });

  if (matching.length === 0) return;

  const ids = matching.map((n: any) => n.id);
  await supabase
    .from("notifications")
    .update({ resolved: true, resolved_at: new Date().toISOString() } as any)
    .in("id", ids);
}
