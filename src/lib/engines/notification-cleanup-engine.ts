/**
 * Notification Cleanup Engine — Dismisses old notifications.
 * Canonical: reads/writes app_notifications table.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const ARCHIVE_DAYS = 90;

export async function runNotificationCleanup(limit = 200) {
  const cutoff = new Date(Date.now() - ARCHIVE_DAYS * 86400_000).toISOString();

  // Dismiss old read notifications
  const { data: old } = await db
    .from("app_notifications")
    .select("id")
    .not("read_at", "is", null)
    .lt("created_at", cutoff)
    .is("dismissed_at", null)
    .limit(limit);

  let archived = 0;
  if (old?.length) {
    const ids = old.map((n: any) => n.id);
    await db.from("app_notifications").update({ dismissed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).in("id", ids);
    archived = ids.length;
  }

  return { archived, checked: old?.length ?? 0 };
}
